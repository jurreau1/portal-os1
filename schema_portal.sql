-- ============================================================================
-- Portal-OS1 — D1 Relational Schema & State Recovery Tables
-- Target Engine: Cloudflare D1 (SQLite-compatible)
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- 1. Virtual Processes Table
CREATE TABLE IF NOT EXISTS virtual_processes (
    pid TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'READY', -- 'READY', 'RUNNING', 'BLOCKED', 'SUSPENDED', 'TERMINATED'
    priority INTEGER NOT NULL DEFAULT 5,
    allocated_memory_bytes INTEGER NOT NULL DEFAULT 0,
    epoch_version INTEGER NOT NULL DEFAULT 1,
    last_heartbeat_epoch INTEGER NOT NULL,
    context_vector TEXT NOT NULL, -- Serialized JSON state context pointer
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. System Recovery Epochs Table
CREATE TABLE IF NOT EXISTS system_recovery_epochs (
    id TEXT PRIMARY KEY,
    pid TEXT NOT NULL,
    epoch_version INTEGER NOT NULL,
    snapshot_data TEXT NOT NULL, -- Compressed JSON snapshot of PCB and heap
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pid) REFERENCES virtual_processes(pid) ON DELETE CASCADE,
    UNIQUE(pid, epoch_version)
);

-- 3. Kernel Audit Logs Table
CREATE TABLE IF NOT EXISTS kernel_audit_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL, -- 'PRIVILEGE_VIOLATION', 'PROCESS_PANIC', 'ROLLBACK_TRIGGERED'
    actor_pid TEXT DEFAULT NULL,
    details TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indices for Zero-Cost Query Optimization (< 5M reads/day guardrail)
CREATE INDEX IF NOT EXISTS idx_processes_owner_state ON virtual_processes(owner_id, state);
CREATE INDEX IF NOT EXISTS idx_epochs_pid_version ON system_recovery_epochs(pid, epoch_version DESC);
