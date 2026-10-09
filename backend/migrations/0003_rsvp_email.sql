CREATE TABLE management_tokens (
  token_hash TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL REFERENCES registrations(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX management_tokens_expiry ON management_tokens(expires_at);
CREATE TABLE email_limits (
  key_hash TEXT PRIMARY KEY,
  last_sent INTEGER NOT NULL
);
