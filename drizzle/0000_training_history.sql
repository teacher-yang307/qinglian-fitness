CREATE TABLE ql_history (
  user_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  request_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  state_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, revision),
  UNIQUE (user_id, request_id)
);
