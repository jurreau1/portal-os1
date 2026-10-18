/**
 * Portal-OS1 Advanced Microkernel Edge Runtime
 * Target: Cloudflare Workers & Durable Objects with D1 Epoch Recovery
 */

export interface Env {
  DB: D1Database;
  MICROKERNEL_ACTOR: DurableObjectNamespace;
}

interface JSONRPCRequest {
  jsonrpc: string;
  msg_id: string;
  source_pid: string;
  target_pid: string;
  method: string;
  params: Record<string, any>;
  timestamp: number;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/kernel/ipc' && request.method === 'POST') {
      return handleKernelIPC(request, env);
    }

    if (url.pathname === '/api/kernel/recover' && request.method === 'POST') {
      return handleStateRecovery(request, env);
    }

    return new Response(JSON.stringify({
      system: "Portal-OS1",
      status: "ONLINE",
      architecture: "Edge-Native Microkernel & Recovery Engine",
      cost_model: "$0.00/mo Zero-Cost"
    }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

async function handleKernelIPC(request: Request, env: Env): Promise<Response> {
  try {
    const body: JSONRPCRequest = await request.json();
    
    if (!body.jsonrpc || !body.method || !body.source_pid) {
      return new Response(JSON.stringify({ error: "Invalid IPC Envelope" }), { status: 400 });
    }

    // Process Spawn & Initial Epoch Creation
    if (body.method === 'kernel.process.spawn') {
      const pid = body.params.pid || `proc_${Math.random().toString(36).substr(2, 9)}`;
      const initialContext = JSON.stringify(body.params.context || {});
      
      // Batch insert process and first recovery epoch
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO virtual_processes (pid, owner_id, state, priority, allocated_memory_bytes, epoch_version, last_heartbeat_epoch, context_vector)
           VALUES (?, ?, 'READY', ?, ?, 1, ?, ?)`
        ).bind(
          pid,
          body.params.owner_id || 'system',
          body.params.priority || 5,
          body.params.memory_bytes || 1024,
          Date.now(),
          initialContext
        ),
        env.DB.prepare(
          `INSERT INTO system_recovery_epochs (id, pid, epoch_version, snapshot_data)
           VALUES (?, ?, 1, ?)`
        ).bind(
          `epoch_${pid}_1`,
          pid,
          initialContext
        )
      ]);

      return new Response(JSON.stringify({ jsonrpc: "2.0", result: { pid, epoch: 1, status: "SPAWNED_WITH_CHECKPOINT" }, id: body.msg_id }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ jsonrpc: "2.0", result: { status: "ACKNOWLEDGED" }, id: body.msg_id }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

async function handleStateRecovery(request: Request, env: Env): Promise<Response> {
  try {
    const { pid } = await request.json();
    
    // Fetch latest valid recovery epoch
    const epochRecord = await env.DB.prepare(
      `SELECT epoch_version, snapshot_data FROM system_recovery_epochs WHERE pid = ? ORDER BY epoch_version DESC LIMIT 1`
    ).bind(pid).first();

    if (!epochRecord) {
      return new Response(JSON.stringify({ error: "No recovery epoch found for process" }), { status: 404 });
    }

    // Restore process state from snapshot
    await env.DB.prepare(
      `UPDATE virtual_processes SET state = 'READY', context_vector = ?, epoch_version = ?, updated_at = CURRENT_TIMESTAMP WHERE pid = ?`
    ).bind(epochRecord.snapshot_data, epochRecord.epoch_version, pid).run();

    return new Response(JSON.stringify({ status: "ROLLBACK_SUCCESS", restored_epoch: epochRecord.epoch_version }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// Durable Object: Microkernel Process Actor with Cooperative Micro-Ticks
export class MicrokernelProcessActor {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/micro-tick') {
      // Simulate 10ms cooperative execution slice
      return new Response(JSON.stringify({ tick_status: "COMPLETED", slice_ms: 10, timestamp: Date.now() }));
    }
    return new Response(JSON.stringify({ actor_status: "PROCESS_HEAP_READY" }));
  }
}
