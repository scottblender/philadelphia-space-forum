"use client";

import Script from "next/script";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { rsvpApiUrl, rsvpRequest } from "../lib/rsvp";
import { publicAsset } from "../lib/publicAsset";

type Availability = { open: boolean; full: boolean; available: number; turnstileSiteKey: string };
type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
const challengeApi = () => (window as Window & { turnstile?: Turnstile }).turnstile;

export function RsvpForm({ eventId, title, isTest }: { eventId: string; title: string; isTest?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) { dialog.current?.close(); return; }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <div className="rsvp-area">
    <button type="button" className="button button-blue" aria-haspopup="dialog" aria-controls={`${eventId}-rsvp-dialog`} onClick={() => { setHasOpened(true); setOpen(true); }}>RSVP {isTest ? "· Test event" : "for this event"} <span aria-hidden="true">↗</span></button>
    <dialog ref={dialog} id={`${eventId}-rsvp-dialog`} className="rsvp-modal" aria-labelledby={`${eventId}-rsvp-heading`} onCancel={(event) => { event.preventDefault(); if (!busy) setOpen(false); }} onClose={() => setOpen(false)} onClick={(event) => { if (!busy && event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false); } }}>
      <div className="rsvp-modal-header"><p className="eyebrow"><span /> {isTest ? "Test registration" : "Event registration"}</p><button type="button" className="rsvp-close" aria-label="Close registration form" disabled={busy} onClick={() => setOpen(false)}>×</button></div>
      <h2 id={`${eventId}-rsvp-heading`}>{title}</h2>
      {isTest && <p>This is a test event. Please use your own email address when testing email confirmations.</p>}
      {hasOpened && <RsvpFields eventId={eventId} open={open} onBusyChange={setBusy} />}
    </dialog>
  </div>;
}

function RsvpFields({ eventId, open, onBusyChange }: { eventId: string; open: boolean; onBusyChange: (value: boolean) => void }) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [error, setError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [pending, setPending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [cancellationUrl, setCancellationUrl] = useState("");
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  useEffect(() => { onBusyChange(pending); }, [pending, onBusyChange]);

  useEffect(() => {
    if (!open || !rsvpApiUrl || cancellationUrl) return;
    const controller = new AbortController();
    rsvpRequest(`/events/${encodeURIComponent(eventId)}`, { signal: controller.signal })
      .then(setAvailability)
      .catch(() => { if (!controller.signal.aborted) setError("Registration is temporarily unavailable. Please try again later."); });
    return () => controller.abort();
  }, [eventId, open, cancellationUrl]);

  useEffect(() => {
    const api = challengeApi();
    if (!open || !availability?.open || !availability.turnstileSiteKey || !scriptReady || !widget.current || !api || cancellationUrl) return;
    const id = api.render(widget.current, {
      sitekey: availability.turnstileSiteKey, action: "rsvp", cData: eventId,
      theme: "light", size: "flexible",
      callback: (token: string) => setChallenge(token),
      "expired-callback": () => setChallenge(""),
      "error-callback": () => { setChallenge(""); setError("Verification could not load. Please reopen the form and try again."); },
    });
    widgetId.current = id;
    return () => { api.remove(id); widgetId.current = null; setChallenge(""); };
  }, [open, availability, scriptReady, eventId, cancellationUrl]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !challenge) return;
    setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await rsvpRequest("/registrations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, name: data.get("name"), email: data.get("email"), turnstileToken: challenge }),
      });
      const url = new URL(publicAsset("/rsvp/cancel/"), window.location.origin);
      url.hash = result.cancellationToken;
      setEmailSent(Boolean(result.emailSent)); setCancellationUrl(url.href);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to register. Please try again.");
      if (widgetId.current) challengeApi()?.reset(widgetId.current);
      setChallenge("");
      rsvpRequest(`/events/${encodeURIComponent(eventId)}`).then(setAvailability).catch(() => {});
    } finally { setPending(false); }
  }

  if (cancellationUrl) return (
    <div className="rsvp-confirmation" role="status">
      <h3>You&apos;re on the list.</h3>
      <p>{emailSent ? "Your place is reserved. A confirmation email with a Manage RSVP link has been sent. Check your inbox and spam folder." : "Your place is reserved, but the confirmation email could not be sent. You can request a management email below or save the cancellation link as a backup."}</p>
      <a className="text-link" href={publicAsset("/rsvp/manage/")}>Manage my RSVP</a>
      {!emailSent && <><a className="text-link" href={cancellationUrl}>Backup cancellation link</a>
      <button type="button" className="rsvp-copy" onClick={() => navigator.clipboard.writeText(cancellationUrl).catch(() => setError("Open the cancellation link and save its address."))}>Copy cancellation link</button></>}
      {error && <p>{error}</p>}
    </div>
  );

  return (
    <div className="rsvp-area">
      {rsvpApiUrl && !availability && !error && <p role="status">Checking registration…</p>}
      {!rsvpApiUrl && <p className="form-note" role="status">You can preview this form. Submissions are not enabled yet.</p>}
      {availability && !availability.open && <p role="status">{availability.full ? "This event is full." : "Registration is closed."}</p>}
      {(availability?.open || !rsvpApiUrl) && (
          <form className="rsvp-form" onSubmit={submit}>
            {availability && <p>{availability.available} {availability.available === 1 ? "place" : "places"} available</p>}
            <label htmlFor={`${eventId}-name`}>Your name</label>
            <input id={`${eventId}-name`} name="name" autoComplete="name" maxLength={120} required disabled={pending} />
            <label htmlFor={`${eventId}-email`}>Email address</label>
            <input id={`${eventId}-email`} name="email" type="email" autoComplete="email" maxLength={254} required disabled={pending} />
            <p className="form-note">Your name and email are only available to the organizers and are used to manage this event and send registration emails.</p>
            {open && availability?.turnstileSiteKey && <Script id="rsvp-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setScriptReady(true)} onError={() => setError("Verification could not load. Please try again later.")} />}
            <div ref={widget} />
            {availability?.open && !availability.turnstileSiteKey && <p>Registration is temporarily unavailable.</p>}
            <button className="button button-blue" type="submit" disabled={pending || !challenge}>{pending ? "Reserving your place…" : "Reserve my place"}</button>
          </form>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
