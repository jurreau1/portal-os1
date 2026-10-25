import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { dashboardResponse } from "../src/kernel/dashboard.ts";

const schema = readFileSync(new URL("../schema_portal.sql", import.meta.url), "utf8");
const cors = { "Access-Control-Allow-Origin": "*" };

function database(t) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(schema);
  t.after(() => sqlite.close());
  return {
    sqlite,
    prepare(sql) {
      return { async first() { return sqlite.prepare(sql).get() ?? null; } };
    },
  };
}

test("empty database returns zero counts and default health with CORS", async (t) => {
  const response = await dashboardResponse(database(t), cors);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.match(response.headers.get("Content-Type"), /application\/json/);
  assert.deepEqual(await response.json(), {
    projects: 0, activeProducts: 0, readyToPublish: 0, approvals: 0, health: 100,
  });
});

test("aggregates stages, pending approvals, and rounded process health", async (t) => {
  const db = database(t);
  db.sqlite.exec(`
    INSERT INTO products (id, name, stage) VALUES
      ('p1', 'Live product', 'Live'), ('p2', 'Ready product', 'Ready'),
      ('p3', 'Draft product', 'Draft'), ('p4', 'Case sensitive', 'live');
    INSERT INTO approvals (id, product_id, action, priority, risk) VALUES
      ('a1', 'p1', 'publish', 'high', 'low');
    INSERT INTO approvals (id, product_id, action, priority, risk, status) VALUES
      ('a2', 'p2', 'publish', 'low', 'low', 'approved');
  `);
  const insert = db.sqlite.prepare(`
    INSERT INTO virtual_processes
      (pid, owner_id, state, last_heartbeat_epoch, context_vector)
    VALUES (?, 'test-owner', ?, 0, '{}')
  `);
  for (const [i, state] of ["READY", "RUNNING", "SUSPENDED", "PANICKED", "TERMINATED", "READY", "PANICKED"].entries()) {
    insert.run(`proc-${i}`, state);
  }
  const response = await dashboardResponse(db);
  assert.deepEqual(await response.json(), {
    projects: 4, activeProducts: 1, readyToPublish: 1, approvals: 1, health: 57,
  });
});

test("zero percent health does not trigger the default", async (t) => {
  const db = database(t);
  db.sqlite.exec(`
    INSERT INTO virtual_processes
      (pid, owner_id, state, last_heartbeat_epoch, context_vector)
    VALUES ('failed-process', 'test-owner', 'PANICKED', 0, '{}')
  `);
  assert.equal((await (await dashboardResponse(db)).json()).health, 0);
});

for (const table of ["products", "approvals", "virtual_processes"]) {
  test(`missing ${table} logs the failing query and returns the expected response`, async (t) => {
    const db = database(t);
    const errors = t.mock.method(console, "error", () => {});
    db.sqlite.exec(`DROP TABLE ${table}`);
    const response = await dashboardResponse(db, cors);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
    if (table === "virtual_processes") {
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        projects: 0, activeProducts: 0, readyToPublish: 0, approvals: 0, health: 100,
      });
    } else {
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: "Portal data is unavailable" });
    }
    assert.equal(errors.mock.calls.length, 1);
    const entry = JSON.parse(errors.mock.calls[0].arguments[0]);
    assert.equal(entry.endpoint, "/api/dashboard");
    assert.equal(entry.table, table);
    assert.match(entry.query, new RegExp(`FROM ${table}`));
    assert.match(entry.error, new RegExp(`no such table: ${table}`));
    assert.equal(typeof entry.stack, "string");
  });
}

test("non-Error query failures are logged without leaking details to clients", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const response = await dashboardResponse({ prepare() { throw "database unavailable"; } });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Portal data is unavailable" });
  const entry = JSON.parse(errors.mock.calls[0].arguments[0]);
  assert.equal(entry.table, "products");
  assert.equal(entry.error, "database unavailable");
});

test("schema can be reapplied and preserves process recovery and approval foreign keys", (t) => {
  const { sqlite } = database(t);
  sqlite.exec(`
    INSERT INTO virtual_processes
      (pid, owner_id, state, last_heartbeat_epoch, context_vector)
    VALUES ('proc-1', 'test-owner', 'READY', 0, '{}');
    INSERT INTO system_recovery_epochs (id, pid, epoch_version, snapshot_data)
    VALUES ('epoch-1', 'proc-1', 1, '{}');
    INSERT INTO products (id, name, stage) VALUES ('p1', 'Product', 'Ready');
    INSERT INTO approvals (id, product_id, action, priority, risk)
    VALUES ('a1', 'p1', 'publish', 'high', 'low');
  `);
  sqlite.exec(schema);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM system_recovery_epochs").get().count, 1);
  assert.equal(sqlite.prepare("SELECT status FROM approvals WHERE id = 'a1'").get().status, "pending");
  assert.throws(() => sqlite.exec("DELETE FROM products WHERE id = 'p1'"), /FOREIGN KEY/);
  sqlite.exec("UPDATE approvals SET status = 'approved', decided_at = CURRENT_TIMESTAMP WHERE id = 'a1'");
  assert.ok(sqlite.prepare("SELECT decided_at FROM approvals WHERE id = 'a1'").get().decided_at);
  assert.throws(() => sqlite.exec("UPDATE virtual_processes SET state = 'INVALID'"), /CHECK constraint/);
  sqlite.exec("DELETE FROM virtual_processes WHERE pid = 'proc-1'");
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM system_recovery_epochs").get().count, 0);
  assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
});
