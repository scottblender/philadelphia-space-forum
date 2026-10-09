"use client";

import { useEffect, useState } from "react";
import { rsvpApiUrl, rsvpRequest } from "../lib/rsvp";

type Attendance = { capacity: number; confirmed?: number; available: number; open: boolean; full: boolean };

export function EventAttendance({ eventId }: { eventId: string }) {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!rsvpApiUrl) return;
    const controller = new AbortController();
    const refresh = () => rsvpRequest(`/events/${encodeURIComponent(eventId)}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setAttendance(data); setFailed(false); } })
      .catch(() => { if (!controller.signal.aborted) { setAttendance(null); setFailed(true); } });
    const updated = (event: Event) => { if ((event as CustomEvent<string>).detail === eventId) refresh(); };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("rsvp-updated", updated);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("rsvp-updated", updated); };
  }, [eventId]);
  if (!rsvpApiUrl) return null;
  const going = attendance ? attendance.confirmed ?? Math.max(0, attendance.capacity - attendance.available) : 0;
  return <div className="event-attendance" aria-live="polite">
    <p className="eyebrow"><span /> Attendance</p>
    {attendance ? <>
      <p className="event-venue">{going} {going === 1 ? "person" : "people"} going</p>
      <p>{attendance.open ? `${attendance.available} ${attendance.available === 1 ? "spot" : "spots"} open · ${attendance.capacity} total` : attendance.full ? "Full · No spots open" : "Registration closed"}</p>
    </> : <p>{failed ? "Attendee count temporarily unavailable." : "Loading attendee count…"}</p>}
  </div>;
}
