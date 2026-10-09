"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { rsvpRequest } from "../../lib/rsvp";

export default function CancelRsvpPage() {
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  useEffect(() => { setToken(window.location.hash.slice(1)); }, []);

  async function cancel() {
    setPending(true); setMessage("");
    try {
      const data = await rsvpRequest("/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      setMessage(data.message); setComplete(true);
      window.history.replaceState(null, "", window.location.pathname);
    } catch (issue) { setMessage(issue instanceof Error ? issue.message : "Unable to cancel. Please try again."); }
    finally { setPending(false); }
  }

  return <main className="inner-page"><SiteHeader /><section className="page-width inner-hero"><div><p className="eyebrow"><span /> Your registration</p><h1>Cancel RSVP</h1></div></section><section className="page-width organizer-section">
    {!complete && <><p>Cancel your RSVP to release your place for someone else.</p><button className="button button-blue" type="button" disabled={!token || pending} onClick={cancel}>{pending ? "Cancelling…" : "Cancel my RSVP"}</button>{!token && <p>Open the cancellation link you saved when you registered.</p>}</>}
    {message && <p role="status">{message}</p>}
  </section><SiteFooter /></main>;
}
