import kernel from "./kernel";
import { routeApi } from "./routes/api";
import type { Env } from "./types";
export { MicrokernelProcessActor } from "./kernel";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const path = new URL(request.url).pathname;
    // Preserve existing kernel IPC and health contracts for the Dart clients.
    if (!path.startsWith("/api/") || path.startsWith("/api/kernel/"))
      return kernel.fetch(request, env, ctx);
    const origin = request.headers.get("Origin");
    const allowed = (env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim());
    const headers = new Headers({
      Vary: "Origin",
      "Cache-Control": "no-store",
    });
    if (origin && allowed.includes(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
    }
    if (origin && !allowed.includes(origin))
      return Response.json(
        { error: "Origin not allowed" },
        { status: 403, headers },
      );
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    try {
      const response = await routeApi(request, env);
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      console.error("Portal API failure", error);
      return Response.json(
        { error: "Portal data is unavailable" },
        { status: 500, headers },
      );
    }
  },
} satisfies ExportedHandler<Env>;
