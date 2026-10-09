const MAX_BODY_BYTES = 8192;
const eventIdPattern = /^[a-z0-9-]{1,100}$/;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function response(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

async function readJson(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "Send JSON data.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "A request body is required.");
  let size = 0;
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new HttpError(413, "The submission is too large."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new HttpError(400, "The submission is invalid."); }
}

async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requireOrganizer(request, env) {
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 32) throw new HttpError(503, "Organizer access has not been configured.");
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const expectedHash = await hash(env.ADMIN_TOKEN);
  const suppliedHash = await hash(supplied);
  let difference = 0;
  for (let i = 0; i < expectedHash.length; i++) difference |= expectedHash.charCodeAt(i) ^ suppliedHash.charCodeAt(i);
  if (difference) throw new HttpError(401, "The organizer access key is incorrect.");
}

function publicEvent(event, now) {
  const available = Math.max(0, event.capacity - event.confirmed);
  return {
    id: event.id, title: event.title, startsAt: event.starts_at,
    capacity: event.capacity, available,
    open: Boolean(event.registration_open && event.capacity > 0 && (event.starts_at === null || event.starts_at > now) && available > 0),
    full: event.capacity > 0 && available === 0,
  };
}

async function getEvent(db, id) {
  if (!eventIdPattern.test(id)) throw new HttpError(404, "Event not found.");
  const event = await db.prepare(`SELECT e.*, (SELECT COUNT(*) FROM registrations r
    WHERE r.event_id = e.id AND r.status = 'confirmed') AS confirmed FROM events e WHERE e.id = ?`).bind(id).first();
  if (!event) throw new HttpError(404, "Event not found.");
  return event;
}

async function verifyChallenge(request, env, data, id) {
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) throw new HttpError(503, "Registration is temporarily unavailable.");
  if (typeof data.turnstileToken !== "string" || data.turnstileToken.length > 2048) throw new HttpError(400, "Please complete the verification.");
  const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: data.turnstileToken,
      ...(request.headers.get("CF-Connecting-IP") ? { remoteip: request.headers.get("CF-Connecting-IP") } : {}) }),
  });
  const result = await verification.json();
  const hostname = new URL(request.headers.get("origin")).hostname;
  if (!verification.ok || !result.success || result.hostname !== hostname || result.action !== "rsvp" || result.cdata !== id)
    throw new HttpError(400, "Verification expired or failed. Please try again.");
}

async function route(request, env, path) {
  const method = request.method;
  if (path === "/health" && method === "GET") return response({ ok: true });
  if (!env.DB) throw new HttpError(503, "Registration is temporarily unavailable.");

  const eventMatch = path.match(/^\/events\/([^/]+)$/);
  if (eventMatch && method === "GET") {
    const event = await getEvent(env.DB, eventMatch[1]);
    return response({ ...publicEvent(event, Date.now()), turnstileSiteKey: env.TURNSTILE_SITE_KEY || "" });
  }

  if (path === "/registrations" && method === "POST") {
    const data = await readJson(request);
    const id = typeof data.eventId === "string" ? data.eventId : "";
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    if (!name || name.length > 120 || /[\x00-\x1f]/.test(name) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new HttpError(400, "Enter your name and a valid email address.");
    const event = await getEvent(env.DB, id);
    if (!event.registration_open || (event.starts_at !== null && event.starts_at <= Date.now()) || event.capacity < 1) throw new HttpError(409, "Registration is closed for this event.");
    await verifyChallenge(request, env, data, id);
    const token = crypto.randomUUID() + crypto.randomUUID();
    const registrationId = crypto.randomUUID();
    // One conditional INSERT reserves a seat atomically. There is no separate
    // count-then-write step that could overbook the last seat.
    try {
      const result = await env.DB.prepare(`INSERT INTO registrations
        (id, event_id, name, email, cancellation_hash, created_at)
        SELECT ?, e.id, ?, ?, ?, ? FROM events e
        WHERE e.id = ? AND e.registration_open = 1 AND (e.starts_at IS NULL OR e.starts_at > ?)
        AND (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') < e.capacity
        AND NOT EXISTS (SELECT 1 FROM registrations r WHERE r.event_id = e.id AND r.email = ? AND r.status = 'confirmed')`)
        .bind(registrationId, name, email, await hash(token), Date.now(), id, Date.now(), email).run();
      if (!result.meta.changes) throw new HttpError(409, "This event is full, registration is closed, or this email already has an RSVP. Contact the organizers if you need help.");
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (/UNIQUE constraint failed/i.test(String(error))) throw new HttpError(409, "This email already has an RSVP.");
      throw error;
    }
    return response({ id: registrationId, status: "confirmed", cancellationToken: token }, 201);
  }

  if (path === "/cancel" && method === "POST") {
    const data = await readJson(request);
    if (typeof data.token !== "string" || !/^[a-f0-9-]{72}$/.test(data.token)) throw new HttpError(400, "This cancellation link is invalid.");
    const result = await env.DB.prepare("UPDATE registrations SET status = 'cancelled', cancelled_at = ? WHERE cancellation_hash = ? AND status = 'confirmed'")
      .bind(Date.now(), await hash(data.token)).run();
    // Do not reveal names or emails to a cancellation-link holder.
    return response({ cancelled: Boolean(result.meta.changes), message: result.meta.changes ? "Your RSVP has been cancelled." : "This RSVP is already cancelled or the link is invalid." });
  }

  if (path.startsWith("/admin/")) {
    await requireOrganizer(request, env);
    if (path === "/admin/events" && method === "GET") {
      const result = await env.DB.prepare(`SELECT e.*, (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') AS confirmed
        FROM events e ORDER BY e.starts_at DESC`).all();
      return response({ events: result.results });
    }
    const adminEvent = path.match(/^\/admin\/events\/([^/]+)$/);
    if (adminEvent && method === "PATCH") {
      await getEvent(env.DB, adminEvent[1]);
      const data = await readJson(request);
      if (!Number.isInteger(data.capacity) || data.capacity < 0 || data.capacity > 10000 || typeof data.registrationOpen !== "boolean")
        throw new HttpError(400, "Enter a capacity between 0 and 10,000 and a registration setting.");
      const result = await env.DB.prepare(`UPDATE events SET capacity = ?, registration_open = ? WHERE id = ?
        AND ? >= (SELECT COUNT(*) FROM registrations WHERE event_id = ? AND status = 'confirmed')`)
        .bind(data.capacity, Number(data.registrationOpen && data.capacity > 0), adminEvent[1], data.capacity, adminEvent[1]).run();
      if (!result.meta.changes) throw new HttpError(409, "Capacity cannot be lower than the confirmed attendee count.");
      return response({ saved: true });
    }
    if (path === "/admin/registrations" && method === "GET") {
      const id = new URL(request.url).searchParams.get("eventId") ?? "";
      await getEvent(env.DB, id);
      const result = await env.DB.prepare("SELECT id, name, email, status, created_at FROM registrations WHERE event_id = ? ORDER BY created_at DESC").bind(id).all();
      return response({ registrations: result.results });
    }
    const cancelMatch = path.match(/^\/admin\/registrations\/([a-f0-9-]{36})\/cancel$/);
    if (cancelMatch && method === "POST") {
      await env.DB.prepare("UPDATE registrations SET status = 'cancelled', cancelled_at = ? WHERE id = ? AND status = 'confirmed'").bind(Date.now(), cancelMatch[1]).run();
      return response({ cancelled: true });
    }
  }
  throw new HttpError(404, "Not found.");
}

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
    const origin = request.headers.get("origin");
    const path = new URL(request.url).pathname.replace(/\/$/, "") || "/";
    if (origin && !allowed.includes(origin)) return response({ error: "This origin is not allowed." }, 403);
    if (request.method === "POST" && !path.startsWith("/admin/") && !origin) return response({ error: "An allowed origin is required." }, 403);
    let result;
    try {
      result = request.method === "OPTIONS" ? new Response(null, { status: 204 }) : await route(request, env, path);
    } catch (error) {
      result = response({ error: error instanceof HttpError ? error.message : "Registration is temporarily unavailable. Please try again later." }, error instanceof HttpError ? error.status : 503);
    }
    if (origin) {
      result.headers.set("Access-Control-Allow-Origin", origin);
      result.headers.set("Vary", "Origin");
      result.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
      result.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    return result;
  },
};
