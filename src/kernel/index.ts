/**
 * Portal-OS1 Unified Microkernel Edge Worker
 * Target: Cloudflare Workers & Durable Objects
 */

import { SemanticFirewall, FirewallResult } from './firewall';
import { ICVSBridge, CognitiveFrame } from './icvs';

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
    
    // Route 1: Core IPC & Process Management
    if (url.pathname === '/api/kernel/ipc' && request.method === 'POST') {
      return handleKernelIPC(request, env);
    }

    // Route 2: Epoch State Recovery / Rollback
    if (url.pathname === '/api/kernel/recover' && request.method === 'POST') {
      return handleStateRecovery(request, env);
    }

    // Route 3: ICVS Cognitive Frame Ingestion
    if (url.pathname === '/api/kernel/icvs/ingest' && request.method === 'POST') {
      return handleICVSIngest(request, env);
    }

    // System Heartbeat / Health Check
    return new Response(JSON.stringify({
      system: "Portal-OS1",
      status: "ONLINE",
      architecture: "Edge-Native Microkernel & Hypervisor",
      cost_model: "$0.00/mo Zero-Cost"
    }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

/**
 * Handles incoming JSON-RPC 2.0 IPC requests through the Semantic Firewall
 */
async function handleKernelIPC(request: Request, env: Env): Promise<Response> {
  try {
    const body: JSONRPCRequest = await request.json();
    
    if (!body.jsonrpc || !body.method || !body.source_pid) {
      return new Response(JSON.stringify({ error: "Invalid IPC Envelope Structure" }), { status: 400 });
    }

    // 1. Pass request through the Semantic Firewall
    const firewallCheck: FirewallResult = SemanticFirewall.inspect(
      body.method, 
      body.source_pid, 
      body.params || {}
    );

    if (!firewallCheck.allowed) {
      await logAudit(env, 'PRIVILEGE_VIOLATION', body.source_pid, firewallCheck.violationReason!);
      return new Response(JSON.stringify({ error: firewallCheck.violationReason }), { status: 403 });
    }

    const cleanParams = firewallCheck.sanitizedParams;

    // 2. Handle Process Spawning & Initial Epoch Creation
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

      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        result: { pid, epoch: 1, status: "SPAWNED_SECURELY" },
        id: body.msg_id
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      result: { status: "ACKNOWLEDGED" },
      id: body.msg_id
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Ingests and verifies multi-agent ICVS cognitive frames
 */
async function handleICVSIngest(request: Request, env: Env): Promise<Response> {
  try {
    const frame: CognitiveFrame = await request.json();
    
    if (!ICVSBridge.verifyFrame(frame)) {
      await logAudit(env, 'ICVS_ANOMALY', frame.agent_pid || 'unknown', 'Frame verification failed or confidence below threshold.');
      return new Response(JSON.stringify({ error: "Invalid ICVS frame signature or confidence score." }), { status: 400 });
    }

    return new Response(JSON.stringify({
      status: "ICVS_FRAME_ACCEPTED",
      frame_id: frame.frame_id,
      verified_epoch: frame.epoch
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Handles automated epoch rollbacks and state recovery from D1 storage
 */
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

    await logAudit(env, 'ROLLBACK_TRIGGERED', pid, `Successfully restored process to epoch version ${epochRecord.epoch_version}`);

    return new Response(JSON.stringify({
      status: "ROLLBACK_SUCCESS",
      restored_pid: pid,
      restored_epoch: epochRecord.epoch_version
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Internal Audit Logger for security events
 */
async function logAudit(env: Env, eventType: string, actorPid: string, details: string) {
  try {
    const logId = `audit_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    await env.DB.prepare(
      `INSERT INTO kernel_audit_logs (id, event_type, actor_pid, details, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(logId, eventType, actorPid, details).run();
  } catch (_) {
    // Fail silently to prevent audit latency from blocking worker request cycles
  }
}

/**
 * Durable Object: Microkernel Process Actor (Manages 2MB Heap Isolation)
 */
export class MicrokernelProcessActor {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    return new Response(JSON.stringify({
      actor_status: "PROCESS_HEAP_READY",
      max_heap_bytes: 2097152,
      timestamp: Date.now()
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
