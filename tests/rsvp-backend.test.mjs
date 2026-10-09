import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../backend/worker.mjs";
import { csvCell } from "../app/lib/rsvp.ts";

const migration = await readFile(new URL("../backend/migrations/0001_rsvps.sql", import.meta.url), "utf8");
const eventMigration = await readFile(new URL("../backend/migrations/0002_event_management.sql", import.meta.url), "utf8");
const emailMigration = await readFile(new URL("../backend/migrations/0003_rsvp_email.sql", import.meta.url), "utf8");
const consentMigration = await readFile(new URL("../backend/migrations/0004_registration_consent.sql", import.meta.url), "utf8");
const origin = "https://philadelphiaspaceforum.org";
const eventId = "cislunar-space-situational-awareness-workshop";
// Public fixture value, not a production secret.
const adminToken = "test-organizer-token-0000000000000000000000";

function fixture(t, capacity = 2) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON"); sqlite.exec(migration); sqlite.exec(eventMigration); sqlite.exec(emailMigration); sqlite.exec(consentMigration);
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
  const register = (email, extra = {}) => call("/registrations", { body: { eventId, name: "Test attendee", email, turnstileToken: "valid", consent: true, privacyNoticeVersion: "2026-10-08", ...extra } });
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

 test("organizers create public events and delete them while preserving attendee records", async (t) => {
  const f = fixture(t);
  const body = { title: "New workshop", synopsis: "Learn orbital motion", capacity: 10, location: "Philadelphia" };
  assert.equal((await f.call("/admin/events", { body })).status, 401);
  assert.equal((await f.call("/admin/events", { admin: true, body: { ...body, startsAt: "bad" } })).status, 400);
  const created = await f.call("/admin/events", { admin: true, body });
  assert.equal(created.status, 201);
  const { id } = await created.json();
  const listing = await (await f.call("/events")).json();
  assert.equal(listing.events[0].title, body.title);
  assert.equal(listing.events[0].rsvpProvider, "native");
  assert.equal((await f.call(`/admin/events/${id}`, { method: "DELETE" })).status, 401);
  await f.register("kept@example.com");
  assert.equal((await f.call(`/admin/events/${eventId}`, { method: "DELETE", admin: true })).status, 200);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM registrations").get().n, 1);
  assert.equal((await f.register("blocked@example.com")).status, 404);
  assert.equal((await (await f.call("/events")).json()).deletedIds.includes(eventId), true);
  assert.equal((await f.call(`/admin/events/${id}`, { method: "DELETE", admin: true })).status, 200);
  assert.equal((await (await f.call("/events")).json()).events.length, 0);
  const preflight = await f.call("/admin/events", { method: "OPTIONS" });
  assert.match(preflight.headers.get("Access-Control-Allow-Methods"), /DELETE/);
});

 test("external events validate links, appear in organizer listing, and reject native registration", async (t) => {
  const f = fixture(t);
  const body = { title: "Meetup workshop", synopsis: "External event", capacity: 0, rsvpProvider: "meetup", rsvpUrl: "https://www.meetup.com/example/events/123/" };
  assert.equal((await f.call("/admin/events", { admin: true, body: { ...body, rsvpUrl: "javascript:alert(1)" } })).status, 400);
  const created = await (await f.call("/admin/events", { admin: true, body })).json();
  const list = await (await f.call("/admin/events", { admin: true })).json();
  assert.equal(list.events.find(e => e.id === created.id).rsvpProvider, "meetup");
  assert.equal((await f.register("external@example.com", { eventId: created.id })).status, 409);
  assert.equal((await f.call(`/admin/events/${created.id}`, { method: "PATCH", admin: true, body: { title: "Updated meetup", rsvpUrl: "https://example.com/register" } })).status, 200);
  const publicList = await (await f.call("/events")).json();
  assert.equal(publicList.events.find(e => e.id === created.id).title, "Updated meetup");
});

 test("full event edits preserve attendees and enforce capacity and registration method", async (t) => {
  const f = fixture(t);
  await f.register("retained@example.com");
  const body = { title: "Edited workshop", synopsis: "Updated description", capacity: 3, rsvpProvider: "native", startsAt: new Date(Date.now()+86400000).toISOString(), location: "New venue" };
  assert.equal((await f.call(`/admin/events/${eventId}`, { method: "PUT", body })).status, 401);
  assert.equal((await f.call(`/admin/events/${eventId}`, { method: "PUT", admin: true, body: { ...body, capacity: 0 } })).status, 409);
  assert.equal((await f.call(`/admin/events/${eventId}`, { method: "PUT", admin: true, body: { ...body, rsvpProvider: "external", rsvpUrl: "https://example.com" } })).status, 409);
  assert.equal((await f.call(`/admin/events/${eventId}`, { method: "PUT", admin: true, body })).status, 200);
  const listing = await (await f.call("/events")).json();
  assert.equal(listing.events[0].location.name, "New venue");
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM registrations").get().n, 1);
});

 test("online events require a safe meeting link and discard physical address fields", async (t) => {
  const f = fixture(t);
  const body = { title: "Online workshop", synopsis: "Remote session", capacity: 20, eventType: "online", location: "Old venue", address: "Old address" };
  assert.equal((await f.call("/admin/events", { admin: true, body })).status, 400);
  assert.equal((await f.call("/admin/events", { admin: true, body: { ...body, meetingUrl: "javascript:alert(1)" } })).status, 400);
  const created = await (await f.call("/admin/events", { admin: true, body: { ...body, meetingUrl: "https://example.com/meeting" } })).json();
  let event = (await (await f.call("/events")).json()).events.find(e => e.id === created.id);
  assert.equal(event.eventType, "online"); assert.equal(event.location.address, ""); assert.equal(event.meetingUrl, "https://example.com/meeting");
  assert.equal((await f.call(`/admin/events/${created.id}`, { method: "PUT", admin: true, body: { ...body, eventType: "in-person", location: "Pennovation Center" } })).status, 200);
  event = (await (await f.call("/events")).json()).events.find(e => e.id === created.id);
  assert.equal(event.location.name, "Pennovation Center"); assert.equal(event.meetingUrl, undefined);
});

test("confirmation email uses private expiring management links and cancellation requires an explicit action", async t => {
  const f = fixture(t); f.env.RESEND_API_KEY = "fixture-email-key";
  const verification = globalThis.fetch;
  const emails = [];
  globalThis.fetch = async (url, init) => {
    if (url === "https://api.resend.com/emails") { emails.push(JSON.parse(init.body)); return Response.json({ id: "test-email" }); }
    return verification(url, init);
  };
  const registered = await (await f.register("mail@example.com")).json();
  assert.equal(registered.emailSent, true);
  assert.equal(emails[0].from, "Philadelphia Space Forum <events@philadelphiaspaceforum.org>");
  const token = emails[0].text.match(/\/rsvp\/manage\/#([a-f0-9-]{72})/)[1];
  const stored = f.sqlite.prepare("SELECT * FROM management_tokens").get();
  assert.notEqual(stored.token_hash, token);
  const view = await (await f.call("/management/view", { body: { token } })).json();
  assert.equal(view.status, "confirmed");
  assert.equal(f.sqlite.prepare("SELECT status FROM registrations").get().status, "confirmed");
  assert.equal((await f.call("/management/cancel", { body: { token: "bad" } })).status, 400);
  assert.equal((await f.call("/management/cancel", { body: { token } })).status, 200);
  assert.equal(f.sqlite.prepare("SELECT status FROM registrations").get().status, "cancelled");
  f.sqlite.exec("UPDATE management_tokens SET expires_at = 0");
  assert.equal((await f.call("/management/view", { body: { token } })).status, 401);
});

test("email failure preserves RSVP and management recovery hides email existence and limits requests", async t => {
  const f = fixture(t); f.env.RESEND_API_KEY = "fixture-email-key";
  const verification = globalThis.fetch;
  let fail = true; const emails = [];
  globalThis.fetch = async (url, init) => {
    if (url === "https://api.resend.com/emails") {
      if (fail) return Response.json({ error: "unavailable" }, { status: 503 });
      emails.push(JSON.parse(init.body)); return Response.json({ id: "test-email" });
    }
    return verification(url, init);
  };
  const registered = await (await f.register("recover@example.com")).json();
  assert.equal(registered.emailSent, false); assert.ok(registered.cancellationToken);
  assert.equal(f.sqlite.prepare("SELECT status FROM registrations").get().status, "confirmed");
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM management_tokens").get().n, 0);
  fail = false;
  const body = { eventId, email: "recover@example.com", turnstileToken: "valid" };
  const first = await f.call("/management/request", { body }); assert.equal(first.status, 200);
  const message = (await first.json()).message; assert.equal(emails.length, 1);
  assert.equal((await f.call("/management/request", { body })).status, 429);
  f.sqlite.exec("UPDATE email_limits SET last_sent = 0");
  const unknown = await f.call("/management/request", { body: { ...body, email: "unknown@example.com" } });
  assert.equal(unknown.status, 200); assert.equal((await unknown.json()).message, message); assert.equal(emails.length, 1);
  assert.equal((await f.call("/management/request", { body: { ...body, turnstileToken: "bad" } })).status, 400);
});

test("registration requires explicit consent to current notice and records evidence", async t => {
  const f = fixture(t);
  for (const consent of [false, undefined, "true"]) assert.equal((await f.register("consent@example.com", { consent })).status, 400);
  assert.equal((await f.register("consent@example.com", { privacyNoticeVersion: "old" })).status, 400);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM registrations").get().n, 0);
  const before = Date.now(); assert.equal((await f.register("consent@example.com")).status, 201);
  const stored = f.sqlite.prepare("SELECT consent_at, privacy_notice_version FROM registrations").get();
  assert.ok(stored.consent_at >= before); assert.equal(stored.privacy_notice_version, "2026-10-08");
});
