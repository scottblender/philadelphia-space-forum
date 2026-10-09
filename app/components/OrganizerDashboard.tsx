"use client";

import { useState, type FormEvent } from "react";
import { csvCell, rsvpApiUrl, rsvpRequest } from "../lib/rsvp";

type OrganizerEvent = { id: string; title: string; starts_at: number | null; capacity: number; confirmed: number; registration_open: number };
type Registration = { id: string; name: string; email: string; status: string; created_at: number };

export function OrganizerDashboard() {
  const [accessKey, setAccessKey] = useState("");
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [capacity, setCapacity] = useState(0);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const selected = events.find((event) => event.id === selectedId);

  const request = (path: string, init?: RequestInit) => rsvpRequest(path, { ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessKey}`, "Content-Type": "application/json" },
  });

  async function select(id: string, list = events) {
    setMessage(""); setRegistrations([]); setSelectedId(id);
    const event = list.find((item) => item.id === id);
    setCapacity(event?.capacity ?? 0); setRegistrationOpen(Boolean(event?.registration_open));
    if (id) {
      const data = await request(`/admin/registrations?eventId=${encodeURIComponent(id)}`);
      setRegistrations(data.registrations);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    try {
      const data = await request("/admin/events");
      setEvents(data.events); await select(data.events[0]?.id ?? "", data.events); setSignedIn(true);
    } catch (issue) { setMessage(issue instanceof Error ? issue.message : "Unable to sign in."); }
    finally { setPending(false); }
  }

  async function refresh() {
    const data = await request("/admin/events"); setEvents(data.events); await select(selectedId, data.events);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    try {
      await request(`/admin/events/${encodeURIComponent(selectedId)}`, { method: "PATCH", body: JSON.stringify({ capacity, registrationOpen }) });
      await refresh(); setMessage("Registration settings saved.");
    } catch (issue) { setMessage(issue instanceof Error ? issue.message : "Unable to save."); }
    finally { setPending(false); }
  }

  async function cancel(id: string) {
    if (!window.confirm("Cancel this attendee’s RSVP and release their place?")) return;
    setPending(true); setMessage("");
    try { await request(`/admin/registrations/${id}/cancel`, { method: "POST" }); await refresh(); setMessage("RSVP cancelled."); }
    catch (issue) { setMessage(issue instanceof Error ? issue.message : "Unable to cancel."); }
    finally { setPending(false); }
  }

  function exportCsv() {
    const lines = [["Name", "Email", "Status", "Registered at"], ...registrations.map((row) => [row.name, row.email, row.status, new Date(row.created_at).toISOString()])];
    const blob = new Blob([lines.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `${selectedId}-attendees.csv`; link.click(); URL.revokeObjectURL(url);
  }

  if (!rsvpApiUrl) return <p>Organizer tools are not available yet.</p>;
  if (!signedIn) return (
    <form className="organizer-login" onSubmit={login}>
      <label htmlFor="organizer-key">Organizer access key</label>
      <input id="organizer-key" type="password" value={accessKey} onChange={(event) => setAccessKey(event.target.value)} autoComplete="current-password" required disabled={pending} />
      <button className="button button-blue" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      {message && <p role="alert">{message}</p>}
    </form>
  );

  return (
    <div className="organizer-dashboard">
      <div className="organizer-toolbar">
        <label htmlFor="organizer-event">Event</label>
        <select id="organizer-event" value={selectedId} disabled={pending} onChange={async (event) => {
          setPending(true); try { await select(event.target.value); } catch { setMessage("Unable to load attendees."); } finally { setPending(false); }
        }}>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select>
        <button type="button" className="text-link" disabled={pending} onClick={() => { setSignedIn(false); setAccessKey(""); setRegistrations([]); setEvents([]); setSelectedId(""); setMessage(""); }}>Sign out</button>
      </div>
      {selected && <>
        <form className="organizer-settings" onSubmit={save}>
          <p>{selected.confirmed} confirmed attendees</p>
          <label htmlFor="event-capacity">Capacity</label>
          <input id="event-capacity" type="number" min={selected.confirmed} max={10000} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} disabled={pending} required />
          <label className="checkbox-label"><input type="checkbox" checked={registrationOpen} onChange={(event) => setRegistrationOpen(event.target.checked)} disabled={pending} /> Open registration</label>
          <p className="form-note">Registration closes when a scheduled event starts. Events without a date stay open until you close them. Capacity counts registrations made on this website.</p>
          <button className="button button-blue" disabled={pending}>Save settings</button>
        </form>
        <button type="button" className="text-link" onClick={exportCsv} disabled={!registrations.length || pending}>Download attendee CSV</button>
        <div className="attendee-table-wrap"><table className="attendee-table">
          <caption>{selected.title} registrations</caption>
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{registrations.map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.email}</td><td>{row.status}</td><td>{row.status === "confirmed" && <button type="button" className="text-link" disabled={pending} onClick={() => cancel(row.id)}>Cancel RSVP<span className="sr-only"> for {row.name}</span></button>}</td></tr>)}</tbody>
        </table></div>
        {!registrations.length && <p>No registrations yet.</p>}
      </>}
      {!events.length && <p>No events are available.</p>}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
