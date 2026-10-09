"use client";
import Script from "next/script";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { rsvpApiUrl, rsvpRequest } from "../../lib/rsvp";

type ChallengeApi = { render: (el: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id: string) => void };
const api = () => (window as Window & { turnstile?: ChallengeApi }).turnstile;
export default function ManageRsvpPage() {
  const [token, setToken] = useState("");
  const [registration, setRegistration] = useState<{ event: { title: string; deleted: number }; status: string } | null>(null);
  const [events, setEvents] = useState<{ id: string; title: string; rsvpProvider: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [siteKey, setSiteKey] = useState("");
  const [ready, setReady] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  useEffect(() => {
    const value = window.location.hash.slice(1); setToken(value);
    if (value) {
      window.history.replaceState(null, "", window.location.pathname);
      rsvpRequest("/management/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: value }) })
        .then(setRegistration).catch(e => setError(e.message));
    }
    if (rsvpApiUrl) rsvpRequest("/events").then(data => {
      const native = data.events.filter((event: { rsvpProvider: string }) => event.rsvpProvider === "native");
      setEvents(native); setEventId(native[0]?.id ?? "");
    }).catch(() => setError("Event details could not load. Please refresh to try again."));
  }, []);
  useEffect(() => {
    setSiteKey(""); setChallenge("");
    if (!eventId) return;
    const controller = new AbortController();
    rsvpRequest(`/events/${encodeURIComponent(eventId)}`, { signal: controller.signal }).then(data => setSiteKey(data.turnstileSiteKey))
      .catch(() => { if (!controller.signal.aborted) setError("Verification could not load. Please try again."); });
    return () => controller.abort();
  }, [eventId]);
  useEffect(() => {
    if (!ready || !siteKey || !widget.current || !api()) return;
    const id = api()!.render(widget.current, { sitekey: siteKey, action: "rsvp", cData: eventId, size: "flexible",
      callback: (value: string) => setChallenge(value), "expired-callback": () => setChallenge(""),
      "error-callback": () => { setChallenge(""); setError("Verification failed. Please refresh and try again."); } });
    widgetId.current = id;
    return () => { api()?.remove(id); widgetId.current = null; setChallenge(""); };
  }, [ready, siteKey, eventId]);
  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setPending(true); setError(""); setMessage("");
    try {
      const result = await rsvpRequest("/management/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, email: data.get("email"), turnstileToken: challenge }) });
      setMessage(result.message);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to request a link."); }
    finally { setPending(false); if (widgetId.current) api()?.reset(widgetId.current); setChallenge(""); }
  }
  async function cancel() {
    if (!window.confirm("Cancel your RSVP and release your place?")) return;
    setPending(true); setError("");
    try {
      const data = await rsvpRequest("/management/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      setRegistration(current => current ? { ...current, status: "cancelled" } : null); setMessage(data.message);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to cancel."); }
    finally { setPending(false); }
  }
  return <main className="inner-page"><SiteHeader /><section className="page-width inner-hero"><div><p className="eyebrow"><span /> Your registration</p><h1>Manage RSVP</h1></div></section><section className="page-width organizer-section manage-rsvp-section">
    {registration && <div className="organizer-settings"><h2>{registration.event.title}</h2><p>Your RSVP is {registration.status}.</p>{Boolean(registration.event.deleted) && <p>This event is no longer listed. Contact the organizers for details.</p>}{registration.status === "confirmed" && <button className="button button-blue" disabled={pending} onClick={cancel}>Cancel my RSVP</button>}</div>}
    <form className="organizer-login" onSubmit={requestLink}><h2>Get a management link</h2><p>Choose your event and enter the email you used to register. We’ll email a private link that expires in 24 hours.</p>
      <label htmlFor="manage-event">Event</label><select id="manage-event" value={eventId} onChange={e => setEventId(e.target.value)} disabled={pending} required><option value="" disabled>Select an event</option>{events.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}</select>
      <label htmlFor="manage-email">Email address</label><input id="manage-email" name="email" type="email" autoComplete="email" maxLength={254} required disabled={pending} />
      <div ref={widget} />{siteKey && <Script id="manage-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} onError={() => setError("Verification could not load.")} />}
      <button className="button button-blue" disabled={pending || !challenge || !eventId}>{pending ? "Requesting…" : "Email my management link"}</button>
      {!rsvpApiUrl && <p>Email management is not available yet.</p>}
    </form>{message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </section><SiteFooter /></main>;
}
