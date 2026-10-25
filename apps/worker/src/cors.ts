import type { Env } from "./types";

export function buildCorsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  });
  const origin = request.headers.get("Origin");
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (origin && allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

export function withCorsHeaders(
  response: Response,
  corsHeaders: Headers,
): Response {
  // Clone responses from Durable Objects so headers can always be changed.
  const result = new Response(response.body, response);
  corsHeaders.forEach((value, key) => {
    if (key === "vary") {
      const vary =
        result.headers
          .get("Vary")
          ?.split(",")
          .map((item) => item.trim().toLowerCase()) ?? [];
      if (!vary.includes("origin") && !vary.includes("*"))
        result.headers.append("Vary", value);
    } else {
      result.headers.set(key, value);
    }
  });
  return result;
}
