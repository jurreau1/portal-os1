# Dashboard API and D1 verification

`/api/dashboard` returns `projects`, `activeProducts`, `readyToPublish`,
`approvals` (pending only), and `health`. Product stages are case sensitive:
`Live` and `Ready`. Process states `READY`, `RUNNING`, and `SUSPENDED` count
as healthy. Empty process tables and unavailable process telemetry return
health `100`; this fallback does not prove that process telemetry is healthy.

Failures querying `products` or `approvals` return HTTP 500 with
`{"error":"Portal data is unavailable"}`. Each failed query logs its endpoint,
table, SQL, error message, and stack to Worker logs. A failed health query is
logged and does not prevent portfolio metrics from loading.

## Schema

`schema_portal.sql` is the schema entry point. It includes the product and
approval tables and preserves the existing process control blocks and
recovery foreign key (`system_recovery_epochs.pid` → `virtual_processes.pid`).
Do not replace `virtual_processes` with an `id`-only dashboard schema.

## Production verification

Run these read-only checks from the repository root using an authenticated
Wrangler installation with access to the production account. Use a SQL query
to list tables; `.tables` is a SQLite shell command, not D1 SQL.

```sh
npx wrangler d1 execute portal-os1-production1-db --remote --command="SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"
npx wrangler d1 execute portal-os1-production1-db --remote --command="SELECT COUNT(*) FROM products;"
npx wrangler d1 execute portal-os1-production1-db --remote --command="SELECT COUNT(*) FROM approvals;"
npx wrangler d1 execute portal-os1-production1-db --remote --command="SELECT COUNT(*) FROM virtual_processes;"
```

If tables are missing, review and apply the schema before deploying the Worker:

```sh
npx wrangler d1 execute portal-os1-production1-db --remote --file=schema_portal.sql
```

The schema uses `IF NOT EXISTS` and can be reapplied without deleting records.
It creates missing tables and indexes; it does not repair incompatible columns
in existing tables. Inspect existing columns with `PRAGMA table_info(products);`,
`PRAGMA table_info(approvals);`, and `PRAGMA table_info(virtual_processes);`
before planning any column migration.

## Local regression checks

With Node.js 24 or later:

```sh
node --test tests/dashboard.test.mjs
```

The tests execute the dashboard SQL against in-memory SQLite and cover empty
data, aggregation, missing tables, query diagnostics, and process recovery
schema compatibility.
