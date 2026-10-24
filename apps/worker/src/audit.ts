/**
 * Portal-OS1 Security Audit & Telemetry Logger
 * Target: Cloudflare D1 Relational Storage
 */

export class AuditLogger {
  public static async recordEvent(
    env: { DB: D1Database },
    eventType:
      | "PRIVILEGE_VIOLATION"
      | "PROCESS_PANIC"
      | "ROLLBACK_TRIGGERED"
      | "ICVS_ANOMALY",
    actorPid: string | null,
    details: string,
  ): Promise<void> {
    try {
      const logId = `audit_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;

      await env.DB.prepare(
        `INSERT INTO kernel_audit_logs (id, event_type, actor_pid, details, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
        .bind(logId, eventType, actorPid || "system_core", details)
        .run();
    } catch (err) {
      // Fail safely to prevent audit latency from blocking the edge event loop
      console.error(`Audit Logging Failure: ${err}`);
    }
  }
}
