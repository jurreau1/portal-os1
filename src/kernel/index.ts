// Define standard CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Response | Promise<Response> {
    
    // 1. Handle browser preflight OPTIONS requests immediately
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ---> PUT YOUR EXISTING ROUTING / KERNEL LOGIC HERE <---
      // Example: let response = await yourRouter(request, env);
      
      // Temporary stub if you just want to test connectivity:
      let response = new Response(JSON.stringify({ status: "OK", message: "Kernel responding" }), {
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
