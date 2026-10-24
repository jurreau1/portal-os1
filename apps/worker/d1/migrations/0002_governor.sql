CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL CHECK(stage IN ('Idea','Validation','Build','Ready','Live','Archived')),
  score INTEGER NOT NULL DEFAULT 0 CHECK(score BETWEEN 0 AND 100),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  action TEXT NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('High','Medium','Low')),
  risk TEXT NOT NULL CHECK(risk IN ('High','Medium','Low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
