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

function registrationProvider(event) {
  return event.details_json ? JSON.parse(event.details_json).rsvpProvider : "native";
}

function externalUrl(value) {
  try { const url = new URL(value); if (url.protocol !== "https:" || url.username || url.password || value.length > 2000) throw new Error(); return url.href; }
  catch { throw new HttpError(400, "Enter a valid HTTPS registration URL."); }
}

function publicEvent(event, now) {
  const available = Math.max(0, event.capacity - event.confirmed);
  return {
    id: event.id, title: event.title, startsAt: event.starts_at,
    capacity: event.capacity, available,
    open: Boolean(registrationProvider(event) === "native" && event.registration_open && event.capacity > 0 && (event.starts_at === null || event.starts_at > now) && available > 0),
    full: event.capacity > 0 && available === 0,
  };
}

async function getEvent(db, id) {
  if (!eventIdPattern.test(id)) throw new HttpError(404, "Event not found.");
  const event = await db.prepare(`SELECT e.*, (SELECT COUNT(*) FROM registrations r
    WHERE r.event_id = e.id AND r.status = 'confirmed') AS confirmed FROM events e WHERE e.id = ? AND e.deleted = 0`).bind(id).first();
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

const emailFrom = "Philadelphia Space Forum <events@philadelphiaspaceforum.org>";
const siteOrigin = "https://philadelphiaspaceforum.org";
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
async function sendManagementEmail(env, registration, event, confirmation = false) {
  if (!env.RESEND_API_KEY) return false;
  const token = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await hash(token);
  const expires = Date.now() + 86400000;
  await env.DB.prepare("INSERT INTO management_tokens (token_hash, registration_id, expires_at) VALUES (?, ?, ?)").bind(tokenHash, registration.id, expires).run();
  const url = `${siteOrigin}/rsvp/manage/#${token}`;
  const details = event.details_json ? JSON.parse(event.details_json) : {};
  const when = event.starts_at ? new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(event.starts_at)) + " (Eastern time)" : "Date to be announced";
  const where = details.eventType === "online" ? "Online" : details.location?.name || "Location to be announced";
  const heading = confirmation ? "Your RSVP is confirmed" : "Manage your RSVP";
  const text = `${heading}\n\n${event.title}\n${when}\n${where}\n\nView or cancel your RSVP: ${url}\n\nThis link expires in 24 hours. Request another at ${siteOrigin}/rsvp/manage/. If you did not request this email, you can ignore it.`;
  try {
    const sent = await fetch("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `rsvp-${tokenHash}` },
      body: JSON.stringify({ from: emailFrom, to: [registration.email], subject: `${heading}: ${event.title}`, text,
        html: `<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(event.title)}</p><p>${escapeHtml(when)}<br>${escapeHtml(where)}</p><p><a href="${url}">Manage RSVP</a></p><p>This link expires in 24 hours. <a href="${siteOrigin}/rsvp/manage/">Request a new link</a>.</p><p>If you did not request this email, you can ignore it.</p>` }) });
    if (sent.ok) return true;
  } catch {}
  await env.DB.prepare("DELETE FROM management_tokens WHERE token_hash = ?").bind(tokenHash).run();
  return false;
}
async function managementRegistration(db, token) {
  if (typeof token !== "string" || !/^[a-f0-9-]{72}$/.test(token)) throw new HttpError(400, "This management link is invalid.");
  const row = await db.prepare(`SELECT r.id, r.event_id, r.status FROM management_tokens t JOIN registrations r ON r.id = t.registration_id
    WHERE t.token_hash = ? AND t.expires_at > ?`).bind(await hash(token), Date.now()).first();
  if (!row) throw new HttpError(401, "This link has expired. Request a new link below.");
  return row;
}

async function route(request, env, path) {
  const method = request.method;
  if (path === "/health" && method === "GET") return response({ ok: true });
  if (!env.DB) throw new HttpError(503, "Registration is temporarily unavailable.");

  if (path === "/events" && method === "GET") {
    const result = await env.DB.prepare("SELECT id, details_json, deleted FROM events").all();
    return response({ events: result.results.filter(e => !e.deleted && e.details_json).map(e => JSON.parse(e.details_json)),
      deletedIds: result.results.filter(e => e.deleted).map(e => e.id) });
  }

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
    if (registrationProvider(event) !== "native") throw new HttpError(409, "Register on the external event website.");
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
        WHERE e.id = ? AND e.registration_open = 1 AND e.deleted = 0 AND (e.starts_at IS NULL OR e.starts_at > ?)
        AND (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') < e.capacity
        AND NOT EXISTS (SELECT 1 FROM registrations r WHERE r.event_id = e.id AND r.email = ? AND r.status = 'confirmed')`)
        .bind(registrationId, name, email, await hash(token), Date.now(), id, Date.now(), email).run();
      if (!result.meta.changes) throw new HttpError(409, "This event is full, registration is closed, or this email already has an RSVP. Contact the organizers if you need help.");
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (/UNIQUE constraint failed/i.test(String(error))) throw new HttpError(409, "This email already has an RSVP.");
      throw error;
    }
    let emailSent = false;
    try { emailSent = await sendManagementEmail(env, { id: registrationId, email }, event, true); } catch {}
    return response({ id: registrationId, status: "confirmed", cancellationToken: token, emailSent }, 201);
  }

  if (path === "/management/request" && method === "POST") {
    if (!env.RESEND_API_KEY) throw new HttpError(503, "Email management is not available yet.");
    const data = await readJson(request);
    const id = typeof data.eventId === "string" ? data.eventId : "";
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email address.");
    const event = await getEvent(env.DB, id);
    await verifyChallenge(request, env, data, id);
    const now = Date.now();
    // Atomically limit requests per email and per IP, including unknown emails.
    for (const key of ["email:" + email, "ip:" + (request.headers.get("CF-Connecting-IP") || "unknown")]) {
      const result = await env.DB.prepare(`INSERT INTO email_limits (key_hash, last_sent) VALUES (?, ?)
        ON CONFLICT(key_hash) DO UPDATE SET last_sent = excluded.last_sent WHERE email_limits.last_sent < ?`)
        .bind(await hash(key), now, now - 60000).run();
      if (!result.meta.changes) throw new HttpError(429, "Please wait a minute before requesting another link.");
    }
    await env.DB.prepare("DELETE FROM management_tokens WHERE expires_at <= ?").bind(now).run();
    const registration = await env.DB.prepare("SELECT id, email FROM registrations WHERE event_id = ? AND email = ? AND status = 'confirmed'").bind(id, email).first();
    if (registration) { try { await sendManagementEmail(env, registration, event); } catch {} }
    return response({ message: "If you have an active RSVP for this event, a management link will be emailed to you. Check your inbox and spam folder." });
  }
  if (path === "/management/view" && method === "POST") {
    const data = await readJson(request);
    const registration = await managementRegistration(env.DB, data.token);
    const event = await env.DB.prepare("SELECT id, title, starts_at, deleted FROM events WHERE id = ?").bind(registration.event_id).first();
    return response({ event, status: registration.status });
  }
  if (path === "/management/cancel" && method === "POST") {
    const data = await readJson(request);
    const registration = await managementRegistration(env.DB, data.token);
    await env.DB.prepare("UPDATE registrations SET status = 'cancelled', cancelled_at = ? WHERE id = ? AND status = 'confirmed'").bind(Date.now(), registration.id).run();
    return response({ message: "Your RSVP has been cancelled.", status: "cancelled" });
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
        FROM events e WHERE e.deleted = 0 ORDER BY e.starts_at DESC`).all();
      return response({ events: result.results.map(e => ({ ...e, rsvpProvider: registrationProvider(e), rsvpUrl: e.details_json ? JSON.parse(e.details_json).rsvpUrl : undefined })) });
    }
    const editMatch = path.match(/^\/admin\/events\/([^/]+)$/);
    if ((path === "/admin/events" && method === "POST") || (editMatch && method === "PUT")) {
      const existing = editMatch ? await getEvent(env.DB, editMatch[1]) : null;
      const data = await readJson(request);
      const text = (key, max, required = false) => {
        const value = typeof data[key] === "string" ? data[key].trim() : "";
        if ((required && !value) || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new HttpError(400, `Enter a valid ${key}.`);
        return value;
      };
      const provider = data.rsvpProvider ?? "native";
      if (!["native", "external", "meetup"].includes(provider)) throw new HttpError(400, "Choose a registration option.");
      const rsvpUrl = provider === "native" ? undefined : externalUrl(text("rsvpUrl", 2000, true));
      const eventType = data.eventType ?? "in-person";
      if (!["in-person", "online"].includes(eventType)) throw new HttpError(400, "Choose In-Person or Online.");
      const meetingUrl = eventType === "online" ? externalUrl(text("meetingUrl", 2000, true)) : undefined;
      const title = text("title", 200, true), synopsis = text("synopsis", 2000, true);
      const startsAt = data.startsAt || null, endsAt = data.endsAt || null;
      if ((startsAt && (typeof startsAt !== "string" || !Number.isFinite(Date.parse(startsAt)))) ||
          (endsAt && (typeof endsAt !== "string" || !Number.isFinite(Date.parse(endsAt)) || !startsAt || Date.parse(endsAt) <= Date.parse(startsAt))))
        throw new HttpError(400, "Enter valid dates with the end after the start.");
      if (!Number.isInteger(data.capacity) || data.capacity < 0 || data.capacity > 10000) throw new HttpError(400, "Enter a capacity between 0 and 10,000.");
      const id = existing?.id ?? "event-" + crypto.randomUUID();
      const details = { id, title, synopsis, startsAt, endsAt, timeZone: "America/New_York", status: "scheduled",
        category: "Workshop", host: text("host", 200) || "Philadelphia Space Forum",
        eventType, ...(meetingUrl ? { meetingUrl } : {}),
        location: eventType === "online" ? { name: "Online", address: "", city: "", state: "" } : { name: text("location", 300) || "To be announced", address: text("address", 300), city: text("city", 120), state: text("state", 80) },
        speaker: { name: text("speaker", 200), role: "Workshop leader", bio: text("speakerBio", 2000) },
        topics: text("topics", 2000).split("\n").map(t => t.trim()).filter(Boolean), rsvpProvider: provider, ...(rsvpUrl ? { rsvpUrl } : {}) };
      if (existing) {
        if (registrationProvider(existing) !== provider) {
          const registrations = await env.DB.prepare("SELECT COUNT(*) AS count FROM registrations WHERE event_id = ?").bind(id).first();
          if (registrations.count) throw new HttpError(409, "Keep the registration method for events with attendee records.");
        }
        const result = await env.DB.prepare(`UPDATE events SET title = ?, starts_at = ?, capacity = ?, details_json = ?,
          registration_open = CASE WHEN ? = 'native' AND ? > 0 THEN registration_open ELSE 0 END
          WHERE id = ? AND deleted = 0 AND ? >= (SELECT COUNT(*) FROM registrations WHERE event_id = ? AND status = 'confirmed')`)
          .bind(title, startsAt ? Date.parse(startsAt) : null, provider === "native" ? data.capacity : 0, JSON.stringify(details), provider,
            data.capacity, id, provider === "native" ? data.capacity : 0, id).run();
        if (!result.meta.changes) throw new HttpError(409, "Capacity cannot be lower than the confirmed attendee count.");
        return response({ id, saved: true });
      }
      await env.DB.prepare("INSERT INTO events (id, title, starts_at, capacity, details_json) VALUES (?, ?, ?, ?, ?)")
        .bind(id, title, startsAt ? Date.parse(startsAt) : null, (provider === "native" ? data.capacity : 0), JSON.stringify(details)).run();
      return response({ id }, 201);
    }
    const adminEvent = path.match(/^\/admin\/events\/([^/]+)$/);
    if (adminEvent && method === "DELETE") {
      await getEvent(env.DB, adminEvent[1]);
      await env.DB.prepare("UPDATE events SET deleted = 1, registration_open = 0 WHERE id = ?").bind(adminEvent[1]).run();
      return response({ deleted: true });
    }
    if (adminEvent && method === "PATCH") {
      const event = await getEvent(env.DB, adminEvent[1]);
      const data = await readJson(request);
      if (registrationProvider(event) !== "native") {
        const title = typeof data.title === "string" ? data.title.trim() : "";
        if (!title || title.length > 200 || /[\x00-\x1f]/.test(title)) throw new HttpError(400, "Enter a valid title.");
        const rsvpUrl = externalUrl(typeof data.rsvpUrl === "string" ? data.rsvpUrl : "");
        const details = { ...JSON.parse(event.details_json), title, rsvpUrl };
        await env.DB.prepare("UPDATE events SET title = ?, details_json = ?, registration_open = 0 WHERE id = ? AND deleted = 0")
          .bind(title, JSON.stringify(details), event.id).run();
        return response({ saved: true });
      }
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
      result.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      result.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    return result;
  },
};
