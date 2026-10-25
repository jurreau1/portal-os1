import { env, SELF, applyD1Migrations } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { buildCorsHeaders, withCorsHeaders } from "../src/cors";
import type { Env } from "../src/types";
import type { D1Migration } from "@cloudflare/vitest-plugin";

const bindings = env as unknown as Env & {
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
};
const origin = "http://localhost:5173";
const get = (path: string, init?: RequestInit) =>
  SELF.fetch(`https://portal.test${path}`, init);
const authorize = { Authorization: "Bearer synthetic-test-token" };
beforeAll(async () => {
  await applyD1Migrations(bindings.DB, bindings.TEST_MIGRATIONS);
});
beforeEach(async () => {
  await bindings.DB.batch([
    bindings.DB.prepare("DELETE FROM approvals"),
    bindings.DB.prepare("DELETE FROM products"),
    bindings.DB.prepare("DELETE FROM virtual_processes"),
  ]);
  await bindings.DB.prepare(
    "INSERT INTO products (id,name,stage,score) VALUES ('one','One','Ready',80),('two','Two','Live',90)",
  ).run();
  await bindings.DB.prepare(
    "INSERT INTO approvals (id,product_id,action,priority,risk) VALUES ('001','one','Publish','High','Low')",
  ).run();
});

describe("Worker API and D1 integration", () => {
  it("aggregates real dashboard values and reports no health sample truthfully", async () => {
    const response = await get("/api/dashboard");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      projects: 2,
      activeProducts: 1,
      readyToPublish: 1,
      approvals: 1,
      health: null,
    });
    await bindings.DB.prepare(
      "INSERT INTO virtual_processes (pid,owner_id,state,last_heartbeat_epoch,context_vector) VALUES ('p1','local','READY',1,'{}'),('p2','local','PANICKED',1,'{}')",
    ).run();
    expect(
      ((await (await get("/api/dashboard")).json()) as { health: number })
        .health,
    ).toBe(50);
  });
  it("serves products, ranking, pipeline and approval join", async () => {
    expect(await (await get("/api/products")).json()).toHaveLength(2);
    expect(await (await get("/api/products/one")).json()).toMatchObject({
      id: "one",
      stage: "Ready",
      score: 80,
    });
    expect(await (await get("/api/portfolio")).json()).toMatchObject([
      { id: "two" },
      { id: "one" },
    ]);
    const pipeline = (await (await get("/api/pipeline")).json()) as {
      stage: string;
      products: unknown[];
    }[];
    expect(pipeline).toHaveLength(6);
    expect(
      pipeline.find((row) => row.stage === "Ready")?.products,
    ).toHaveLength(1);
    expect(await (await get("/api/approvals")).json()).toMatchObject([
      { id: "001", project: "One", action: "Publish" },
    ]);
    expect(await (await get("/api/analytics")).json()).toHaveLength(2);
    expect(await (await get("/api/governance")).json()).toEqual([
      { status: "pending", count: 1 },
    ]);
    expect(await (await get("/api/telemetry")).json()).toEqual([]);
  });
  it("rejects unauthorized decisions and fails closed when configuration is absent", async () => {
    expect(
      (await get("/api/approvals/001/approve", { method: "POST" })).status,
    ).toBe(401);
    expect(
      (
        await get("/api/approvals/001/approve", {
          method: "POST",
          headers: { Authorization: "Bearer wrong" },
        })
      ).status,
    ).toBe(401);
    const response = await worker.fetch(
      new Request("https://portal.test/api/approvals/001/approve", {
        method: "POST",
      }),
      { ...bindings, GOVERNOR_API_TOKEN: undefined },
      {} as ExecutionContext,
    );
    expect(response.status).toBe(503);
    expect(
      await bindings.DB.prepare(
        "SELECT status FROM approvals WHERE id = '001'",
      ).first("status"),
    ).toBe("pending");
  });
  it("allows only one concurrent decision and updates the pending count", async () => {
    const responses = await Promise.all(
      ["approve", "reject"].map((action) =>
        get(`/api/approvals/001/${action}`, {
          method: "POST",
          headers: authorize,
        }),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(await (await get("/api/approvals")).json()).toEqual([]);
    expect(await (await get("/api/dashboard")).json()).toMatchObject({
      approvals: 0,
    });
  });
  it("persists rejection and distinguishes missing approvals", async () => {
    expect(
      await (
        await get("/api/approvals/001/reject", {
          method: "POST",
          headers: authorize,
        })
      ).json(),
    ).toEqual({ success: true, status: "rejected" });
    expect(
      await bindings.DB.prepare(
        "SELECT status FROM approvals WHERE id = '001'",
      ).first("status"),
    ).toBe("rejected");
    expect(
      (
        await get("/api/approvals/missing/approve", {
          method: "POST",
          headers: authorize,
        })
      ).status,
    ).toBe(404);
  });
  it("handles CORS preflight, errors and rejects unapproved origins", async () => {
    const preflight = await get("/api/approvals/001/approve", {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Headers": "Authorization",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(preflight.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization",
    );
    expect(
      (
        await get("/api/products", {
          headers: { Origin: "https://untrusted.test" },
        })
      ).status,
    ).toBe(403);
    const error = await get("/api/products/missing", {
      headers: { Origin: origin },
    });
    expect(error.status).toBe(404);
    expect(error.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(error.headers.get("Cache-Control")).toBe("no-store");
    expect((await get("/api/unknown")).status).toBe(404);
    expect((await get("/api/products", { method: "POST" })).status).toBe(405);
    expect((await get("/api/products/%ZZ")).status).toBe(400);
  });
  it("keeps the existing health and Durable Object IPC response contract", async () => {
    expect(await (await get("/")).json()).toMatchObject({
      status: "ONLINE",
      kernel: "Portal-OS1 Tier 1 Edge Kernel",
    });
    const envelope = {
      jsonrpc: "2.0",
      source_pid: "client_pwa_root",
      target_pid: "kernel_root",
      method: "agent.cognitive.sync",
      params: {},
    };
    const response = await get("/api/kernel/ipc", {
      method: "POST",
      body: JSON.stringify(envelope),
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "SUCCESS",
      received_envelope: envelope,
    });
  });
  it.each([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://portal-os1.pages.dev",
  ])("applies credentialed CORS globally for %s", async (allowedOrigin) => {
    for (const path of ["/", "/api/dashboard", "/api/kernel/ipc"]) {
      const preflight = await get(path, {
        method: "OPTIONS",
        headers: {
          Origin: allowedOrigin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type,authorization",
        },
      });
      expect(preflight.status).toBe(204);
      expect(await preflight.text()).toBe("");
      expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(
        allowedOrigin,
      );
      expect(preflight.headers.get("Access-Control-Allow-Credentials")).toBe(
        "true",
      );
      expect(preflight.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      expect(preflight.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization",
      );
      const response = await get(path, { headers: { Origin: allowedOrigin } });
      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        allowedOrigin,
      );
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
        "true",
      );
      expect(response.headers.get("Vary")).toContain("Origin");
    }
  });
  it("blocks unapproved origins on API, kernel, health and preflight", async () => {
    for (const path of ["/", "/api/dashboard", "/api/kernel/ipc"]) {
      for (const method of ["GET", "OPTIONS"]) {
        const response = await get(path, {
          method,
          headers: { Origin: "https://portal-os1.pages.dev.attacker.test" },
        });
        expect(response.status).toBe(403);
        expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
        expect(response.headers.get("Vary")).toContain("Origin");
      }
    }
    const response = await get("/api/dashboard");
    expect(response.status).toBe(200);
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });
  it("attaches CORS to storage errors and method errors", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await worker.fetch(
        new Request("https://portal.test/api/dashboard", {
          headers: { Origin: "https://portal-os1.pages.dev" },
        }),
        {
          ...bindings,
          DB: {
            prepare: () => {
              throw new Error("Synthetic storage outage");
            },
          } as unknown as D1Database,
        },
        {} as ExecutionContext,
      );
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Portal data is unavailable",
      });
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://portal-os1.pages.dev",
      );
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
        "true",
      );
      expect(response.headers.get("Vary")).toContain("Origin");
      const missingBinding = await worker.fetch(
        new Request("https://portal.test/api/dashboard", {
          headers: { Origin: origin },
        }),
        { ...bindings, DB: undefined },
        {} as ExecutionContext,
      );
      expect(missingBinding.status).toBe(500);
      expect(missingBinding.headers.get("Access-Control-Allow-Origin")).toBe(
        origin,
      );
      const health = await worker.fetch(
        new Request("https://portal.test/", { headers: { Origin: origin } }),
        { ...bindings, DB: undefined },
        {} as ExecutionContext,
      );
      expect(health.status).toBe(200);
      expect(await health.json()).toMatchObject({ status: "ONLINE" });
    } finally {
      log.mockRestore();
    }
    const response = await get("/api/products", {
      method: "PUT",
      headers: { Origin: origin },
    });
    expect(response.status).toBe(405);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });
  it("trims origin configuration and preserves existing response variation", () => {
    const request = new Request("https://portal.test/", {
      headers: { Origin: origin },
    });
    const headers = buildCorsHeaders(request, {
      ...bindings,
      ALLOWED_ORIGINS: ` , ${origin} , https://portal-os1.pages.dev , `,
    });
    expect(headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(
      buildCorsHeaders(request, { ...bindings, ALLOWED_ORIGINS: "" }).has(
        "Access-Control-Allow-Origin",
      ),
    ).toBe(false);
    const response = withCorsHeaders(
      new Response("ok", { headers: { Vary: "Accept-Encoding" } }),
      headers,
    );
    expect(response.headers.get("Vary")).toBe("Accept-Encoding, Origin");
    const varied = withCorsHeaders(
      new Response("ok", { headers: { Vary: "Origin" } }),
      headers,
    );
    expect(varied.headers.get("Vary")).toBe("Origin");
  });
});
