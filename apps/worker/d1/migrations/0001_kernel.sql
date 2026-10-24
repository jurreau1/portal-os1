-- Portal-OS1 Edge Microkernel Database Schema
-- Target: Cloudflare D1 (SQLite WAL Mode)

-- Enable Foreign Key Constraints
PRAGMA foreign_keys = ON;

-- 1. Virtual Processes Table (Process Control Blocks)
CREATE TABLE IF NOT EXISTS virtual_processes (
    pid TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('READY', 'RUNNING', 'SUSPENDED', 'PANICKED', 'TERMINATED')),
    priority INTEGER NOT NULL DEFAULT 5,
    allocated_memory_bytes INTEGER NOT NULL DEFAULT 1024,
    epoch_version INTEGER NOT NULL DEFAULT 1,
    last_heartbeat_epoch INTEGER NOT NULL,
    context_vector TEXT NOT NULL, -- Serialized JSON state
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. System Recovery Epochs Table (State Rollback Snapshots)
CREATE TABLE IF NOT EXISTS system_recovery_epochs (
    id TEXT PRIMARY KEY,
    pid TEXT NOT NULL,
    epoch_version INTEGER NOT NULL,
    snapshot_data TEXT NOT NULL, -- Serialized heap/context snapshot
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pid) REFERENCES virtual_processes(pid) ON DELETE CASCADE
);

-- 3. Kernel Audit Logs Table (Immutable Security & Threat Ledger)
CREATE TABLE IF NOT EXISTS kernel_audit_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL CHECK(event_type IN ('PRIVILEGE_VIOLATION', 'PROCESS_PANIC', 'ROLLBACK_TRIGGERED', 'ICVS_ANOMALY')),
    actor_pid TEXT,
    details TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-performance edge lookups
CREATE INDEX IF NOT EXISTS idx_processes_state ON virtual_processes(state);
CREATE INDEX IF NOT EXISTS idx_epochs_pid_version ON system_recovery_epochs(pid, epoch_version DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON kernel_audit_logs(created_at DESC);
