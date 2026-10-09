-- Cascading deletion removes private links with their attendee record.
CREATE TABLE management_tokens_with_cascade (
  token_hash TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
INSERT INTO management_tokens_with_cascade (token_hash, registration_id, expires_at)
SELECT token_hash, registration_id, expires_at FROM management_tokens;
DROP TABLE management_tokens;
ALTER TABLE management_tokens_with_cascade RENAME TO management_tokens;
CREATE INDEX management_tokens_expiry ON management_tokens(expires_at);
