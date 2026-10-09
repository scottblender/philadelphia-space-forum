CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at INTEGER,
  capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  registration_open INTEGER NOT NULL DEFAULT 0 CHECK (registration_open IN (0, 1))
);

CREATE TABLE registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  cancellation_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  cancelled_at INTEGER
);

CREATE UNIQUE INDEX registrations_active_email ON registrations(event_id, email) WHERE status = 'confirmed';
CREATE INDEX registrations_event_status ON registrations(event_id, status);
