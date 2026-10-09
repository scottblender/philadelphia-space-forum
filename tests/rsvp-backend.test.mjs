import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../backend/worker.mjs";
import { csvCell } from "../app/lib/rsvp.ts";

const migration = await readFile(new URL("../backend/migrations/0001_rsvps.sql", import.meta.url), "utf8");
const origin = "https://philadelphiaspaceforum.org";
const eventId = "cislunar-space-situational-awareness-workshop";
// Public fixture value, not a production secret.
const adminToken = "test-organizer-token-0000000000000000000000";

function fixture(t, capacity = 2) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON"); sqlite.exec(migration);
  sqlite.prepare("INSERT INTO events (id, title, capacity, registration_open) VALUES (?, ?, ?, 1)").run(eventId, "SSA workshop", capacity);
  const DB = { prepare(sql) {
    const statement = sqlite.prepare(sql);
    const make = (args = []) => ({
      bind: (...values) => make(values),
      first: async () => statement.get(...args) ?? null,
      all: async () => ({ results: statement.all(...args), success: true }),
      run: async () => ({ success: true, meta: { changes: Number(statement.run(...args).changes) } }),
    });
    return make();
  } };
  const env = { DB, ALLOWED_ORIGINS: origin, ADMIN_TOKEN: adminToken, TURNSTILE_SITE_KEY: "fixture-site-key", TURNSTILE_SECRET_KEY: "fixture-secret" };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const token = init.body.get("response");
    return Response.json({ success: token === "valid", hostname: new URL(origin).hostname, action: "rsvp", cdata: eventId });
  };
  t.after(() => { globalThis.fetch = realFetch; sqlite.close(); });
  const call = (path, { body, method = body ? "POST" : "GET", admin = false, requestOrigin = origin } = {}) => worker.fetch(new Request(`https://rsvp.example${path}`, {
    method, headers: { ...(requestOrigin ? { Origin: requestOrigin } : {}), ...(body ? { "Content-Type": "application/json" } : {}), ...(admin ? { Authorization: `Bearer ${adminToken}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), env);
  const register = (email, extra = {}) => call("/registrations", { body: { eventId, name: "Test attendee", email, turnstileToken: "valid", ...extra } });
  return { sqlite, env, call, register };
}

test("attendee data requires organizer authentication and public responses expose no PII", async (t) => {
  const f = fixture(t);
  assert.equal((await f.register("private@example.com")).status, 201);
  const publicData = await (await f.call(`/events/${eventId}`)).text();
  assert.doesNotMatch(publicData, /private@example|Test attendee|cancellation_hash|ADMIN_TOKEN/);
  assert.equal((await f.call(`/admin/registrations?eventId=${eventId}`)).status, 401);
  assert.equal((await f.call(`/admin/registrations?eventId=${eventId}`, { admin: true })).status, 200);
  assert.equal((await f.call(`/events/${eventId}`, { requestOrigin: "https://untrusted.example" })).status, 403);
  assert.equal((await f.register("invalid-email")).status, 400);
  assert.equal((await f.register("captcha@example.com", { turnstileToken: "invalid" })).status, 400);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM registrations").get().count, 1);
});

test("simultaneous registrations cannot overbook the last seat", async (t) => {
  const f = fixture(t, 1);
  const responses = await Promise.all(Array.from({ length: 12 }, (_, i) => f.register(`attendee${i}@example.com`)));
  assert.equal(responses.filter((result) => result.status === 201).length, 1);
  assert.equal(responses.filter((result) => result.status === 409).length, 11);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM registrations WHERE status = 'confirmed'").get().count, 1);
});

test("verification must match the website, RSVP action, and event", async (t) => {
  const f = fixture(t);
  for (const mismatch of [{ hostname: "untrusted.example" }, { action: "other" }, { cdata: "another-event" }]) {
    globalThis.fetch = async () => Response.json({ success: true, hostname: new URL(origin).hostname, action: "rsvp", cdata: eventId, ...mismatch });
    assert.equal((await f.register("verification@example.com")).status, 400);
  }
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM registrations").get().count, 0);
});

test("emails normalize, duplicates fail, cancellation releases a seat, and only hashed tokens persist", async (t) => {
  const f = fixture(t, 1);
  const first = await (await f.register("  Attendee@Example.COM ")).json();
  assert.equal((await f.register("attendee@example.com")).status, 409);
  const stored = f.sqlite.prepare("SELECT * FROM registrations").get();
  assert.equal(stored.email, "attendee@example.com");
  assert.notEqual(stored.cancellation_hash, first.cancellationToken);
  assert.equal(stored.cancellation_hash.length, 64);
  assert.equal((await f.call("/cancel", { body: { token: "not-a-token" } })).status, 400);
  assert.equal((await (await f.call("/cancel", { body: { token: first.cancellationToken } })).json()).cancelled, true);
  assert.equal((await (await f.call("/cancel", { body: { token: first.cancellationToken } })).json()).cancelled, false);
  assert.equal((await f.register("attendee@example.com")).status, 201);
});

test("closed and past events reject RSVPs; organizer capacity cannot drop below confirmed count", async (t) => {
  const f = fixture(t);
  assert.equal((await f.register("one@example.com")).status, 201);
  assert.equal((await f.call(`/admin/events/${eventId}`, { method: "PATCH", admin: true, body: { capacity: 0, registrationOpen: true } })).status, 409);
  assert.equal((await f.call(`/admin/events/${eventId}`, { method: "PATCH", body: { capacity: 3, registrationOpen: true } })).status, 401);
  assert.equal((await f.call(`/admin/events/${eventId}`, { method: "PATCH", admin: true, body: { capacity: 3, registrationOpen: false } })).status, 200);
  assert.equal((await f.register("closed@example.com")).status, 409);
  f.sqlite.prepare("UPDATE events SET registration_open = 1, starts_at = ?").run(Date.now() - 1);
  assert.equal((await f.register("past@example.com")).status, 409);
});

test("event changes during verification are rechecked by the atomic reservation", async (t) => {
  const f = fixture(t);
  globalThis.fetch = async () => {
    f.sqlite.exec("UPDATE events SET registration_open = 0");
    return Response.json({ success: true, hostname: new URL(origin).hostname, action: "rsvp", cdata: eventId });
  };
  assert.equal((await f.register("race@example.com")).status, 409);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM registrations").get().count, 0);
});

test("oversized requests are rejected and CSV export neutralizes spreadsheet formulas", async (t) => {
  const f = fixture(t);
  assert.equal((await f.register("size@example.com", { name: "x".repeat(9000) })).status, 413);
  assert.equal(csvCell('  =HYPERLINK("https://example.com")'), '"\'  =HYPERLINK(""https://example.com"")"');
  assert.equal(csvCell("ordinary@example.com"), '"ordinary@example.com"');
});
