-- Synthetic demonstration data. Run only against the local database.
INSERT OR IGNORE INTO products (id,name,description,stage,score) VALUES
('life-streak','Life Streak','Build daily habits that last.','Validation',81),
('max-chess','MAX Chess','A new perspective on strategic play.','Live',92),
('max-runner','MAX Runner','An edge-powered running companion.','Ready',88);
INSERT OR IGNORE INTO approvals (id,product_id,action,priority,risk)
VALUES ('001','max-runner','Publish','High','Low');
