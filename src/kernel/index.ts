// 1. Define your Durable Object class with 'export class'
export class MicrokernelProcessActor {
  state: DurableObjectState;
  env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    // Your actor handling logic here
    return new Response("Actor active");
  }
}

// 2. Define standard CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// 3. Export your default Worker fetch handler
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Your routing / IPC handler logic here
      let response = new Response(JSON.stringify({ status: "OK", message: "Portal-OS1 Kernel Online" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

      // Attach CORS headers
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
