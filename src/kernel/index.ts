import { DurableObject } from "cloudflare:workers";
import { dashboardResponse } from "./dashboard";

// Define standard CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Tier 1 Stateful Actor Microkernel for Portal-OS1
 * Governed by Durable Objects for persistent fault isolation.
 */
export class MicrokernelProcessActor extends DurableObject {
  state: DurableObjectState;
  env: any;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (request.method === "POST") {
      try {
        const envelope = await request.json() as any;
        return new Response(JSON.stringify({
          status: "SUCCESS",
          actor_id: this.state.id.toString(),
          received_envelope: envelope,
          epoch: Date.now()
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    return new Response("Microkernel Actor Active", { status: 200 });
  }
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    
    // 1. Handle browser preflight OPTIONS requests immediately
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/dashboard") {
        return dashboardResponse(env.DB, corsHeaders);
      }

      // Route IPC requests to Durable Object if path matches
      if (url.pathname.startsWith("/api/kernel/ipc")) {
        let id = env.MICROKERNEL_ACTOR?.idFromName("kernel_root") || env.MICROKERNEL_ACTOR?.newUniqueId();
        let stub = env.MICROKERNEL_ACTOR?.get(id);
        
        if (stub) {
          let res = await stub.fetch(request);
          const proxiedResponse = new Response(res.body, res);
          for (const [key, value] of Object.entries(corsHeaders)) {
            proxiedResponse.headers.set(key, value);
          }
          return proxiedResponse;
        }
      }

      // Default Health Check / Status Response
      let response = new Response(JSON.stringify({ 
        status: "ONLINE", 
        kernel: "Portal-OS1 Tier 1 Edge Kernel",
        timestamp: Date.now() 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

      // 2. Attach CORS headers to your actual response
      const newResponse = new Response(response.body, response);
      for (const [key, value] of Object.entries(corsHeaders)) {
        newResponse.headers.set(key, value);
      }
      return newResponse;

    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
