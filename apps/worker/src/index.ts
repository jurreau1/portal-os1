import kernel from "./kernel";
import { routeApi } from "./routes/api";
import { buildCorsHeaders, withCorsHeaders } from "./cors";
import type { Env } from "./types";
export { MicrokernelProcessActor } from "./kernel";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const headers = buildCorsHeaders(request, env);
    headers.set("Cache-Control", "no-store");
    const origin = request.headers.get("Origin");
    if (origin && !headers.has("Access-Control-Allow-Origin")) {
      return Response.json(
        { error: "Origin not allowed" },
        { status: 403, headers },
      );
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    try {
      const path = new URL(request.url).pathname;
      let response: Response;
      if (!path.startsWith("/api/") || path.startsWith("/api/kernel/")) {
        response = await kernel.fetch(request, env, ctx);
      } else {
        if (!env.DB) throw new Error("D1 DB binding is not configured");
        response = await routeApi(request, { ...env, DB: env.DB });
      }
      return withCorsHeaders(response, headers);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("[portal-os1] worker request failure", {
        method: request.method,
        url: request.url,
        bindingNames: Object.keys(env ?? {}),
        message: err.message,
        stack: err.stack ?? "",
        sql:
          typeof (error as any)?.cause === "object" &&
          "sql" in ((error as any).cause ?? {})
            ? String((error as any).cause.sql)
            : undefined,
      });

      return Response.json(
        { error: "Portal data is unavailable" },
        { status: 500, headers },
      );
    }
  },
} satisfies ExportedHandler<Env>;
