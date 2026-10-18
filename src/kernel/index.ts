/**
 * Portal-OS1 Unified Microkernel Edge Runtime
 * Target: Cloudflare Workers & Durable Objects with Integrated Security & ICVS Bridge
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

// --- Semantic Firewall Stub ---
class SemanticFirewall {
  public static inspect(method: string, sourcePid: string, params: Record<string, any>) {
    if (method.startsWith('kernel.sys.') && !sourcePid.startsWith('kernel_root')) {
      return { allowed: false, sanitizedParams: {}, violationReason: `Privilege Violation: '${sourcePid}' unauthorized for '${method}'` };
    }
    return { allowed: true, sanitizedParams: params };
  }
}

// --- ICVS Bridge Stub ---
class ICVSBridge {
  public static verifyFrame(frame: any): boolean {
    return frame && frame.frame_id && typeof frame.epoch === 'number' && frame.confidence_score >= 0.5;
  }
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

    if (url.pathname === '/api/kernel/icvs/ingest' && request.method === 'POST') {
      return handleICVSIngest(request, env);
    }

    return new Response(JSON.stringify({
      system: "Portal-OS1",
      status: "ONLINE",
      architecture: "Unified Edge Microkernel & Security Hypervisor",
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

    // 1. Semantic Firewall Security Inspection
    const firewallCheck = SemanticFirewall.inspect(body.method, body.source_pid, body.params);
    if (!firewallCheck.allowed) {
      await logAudit(env, 'PRIVILEGE_VIOLATION', body.source_pid, firewallCheck.violationReason!);
      return new Response(JSON.stringify({ error: firewallCheck.violationReason }), { status: 403 });
    }

    const cleanParams = firewallCheck.sanitizedParams;

    // 2. Process Spawn & Initial Epoch Creation
    if (body.method === 'kernel.process.spawn') {
      const pid = cleanParams.pid || `proc_${Math.random().toString(36).substr(2, 9)}`;
      const initialContext = JSON.stringify(cleanParams.context || {});
      
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO virtual_processes (pid, owner_id, state, priority, allocated_memory_bytes, epoch_version, last_heartbeat_epoch, context_vector)
           VALUES (?, ?, 'READY', ?, ?, 1, ?, ?)`
        ).bind(
          pid,
          cleanParams.owner_id || 'system',
          cleanParams.priority || 5,
          cleanParams.memory_bytes || 1024,
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

      return new Response(JSON.stringify({ jsonrpc: "2.0", result: { pid, epoch: 1, status: "SPAWNED_SECURELY" }, id: body.msg_id }), {
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

async function handleICVSIngest(request: Request, env: Env): Promise<Response> {
  try {
    const frame = await request.json();
    
    if (!ICVSBridge.verifyFrame(frame)) {
      return new Response(JSON.stringify({ error: "Invalid or low-confidence ICVS frame verification failed" }), { status: 400 });
    }

    return new Response(JSON.stringify({ status: "ICVS_FRAME_ACCEPTED", frame_id: (frame as any).frame_id }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }, { status: 500 }));
  }
}

async function handleStateRecovery(request: Request, env: Env): Promise<Response> {
  try {
    const { pid } = await request.json();
    
    const epochRecord = await env.DB.prepare(
      `SELECT epoch_version, snapshot_data FROM system_recovery_epochs WHERE pid = ? ORDER BY epoch_version DESC LIMIT 1`
    ).bind(pid).first();

    if (!epochRecord) {
      return new Response(JSON.stringify({ error: "No recovery epoch found for process" }), { status: 404 });
    }

    await env.DB.prepare(
      `UPDATE virtual_processes SET state = 'READY', context_vector = ?, epoch_version = ?, updated_at = CURRENT_TIMESTAMP WHERE pid = ?`
    ).bind(epochRecord.snapshot_data, epochRecord.epoch_version, pid).run();

    return new Response(JSON.stringify({ status: "ROLLBACK_SUCCESS", restored_epoch: epochRecord.epoch_version }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }, { status: 500 });
  }
}

async function logAudit(env: Env, eventType: string, actorPid: string, details: string) {
  try {
    const logId = `audit_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    await env.DB.prepare(
      `INSERT INTO kernel_audit_logs (id, event_type, actor_pid, details) VALUES (?, ?, ?, ?)`
    ).bind(logId, eventType, actorPid, details).run();
  } catch (_) {
    // Fail silently to avoid blocking request cycle on audit logging errors
  }
}

// Durable Object: Microkernel Process Actor
export class MicrokernelProcessActor {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    return new Response(JSON.stringify({ actor_status: "PROCESS_HEAP_READY", timestamp: Date.now() }));
  }
}
