"use client";

import { useState, type FormEvent } from "react";
import type { ForumEvent } from "../data/events";
import { csvCell, rsvpApiUrl, rsvpRequest } from "../lib/rsvp";

type OrganizerEvent = { id: string; title: string; starts_at: number | null; capacity: number; confirmed: number; registration_open: number; rsvpProvider: "native" | "meetup" | "external"; rsvpUrl?: string; details_json?: string };
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingEvent = events.find(e => e.id === editingId);
  const draft: Partial<ForumEvent> = editingEvent?.details_json ? JSON.parse(editingEvent.details_json) : {};
  const localDate = (value?: string | null) => { if (!value) return ""; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const [eventType, setEventType] = useState("in-person");
  const [newProvider, setNewProvider] = useState("native");
  const [externalTitle, setExternalTitle] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [adding, setAdding] = useState(false);
  const selected = events.find((event) => event.id === selectedId);

  const request = (path: string, init?: RequestInit) => rsvpRequest(path, { ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessKey}`, "Content-Type": "application/json" },
  });

  async function select(id: string, list = events) {
    setMessage(""); setRegistrations([]); setSelectedId(id);
    const event = list.find((item) => item.id === id);
    setExternalTitle(event?.title ?? ""); setExternalLink(event?.rsvpUrl ?? "");
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
      await request(`/admin/events/${encodeURIComponent(selectedId)}`, { method: "PATCH", body: JSON.stringify(selected?.rsvpProvider === "native" ? { capacity, registrationOpen } : { title: externalTitle, rsvpUrl: externalLink }) });
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

  async function deleteRegistration(row: Registration) {
    if (!window.confirm(`Permanently delete ${row.name}’s registration for this event? Their name, email, consent record and RSVP links will be removed. This cannot be undone. Previously exported files and delivered emails are not deleted.`)) return;
    setPending(true); setMessage("");
    try { await request(`/admin/registrations/${row.id}`, { method: "DELETE" }); await refresh(); setMessage("Attendee record permanently deleted."); }
    catch (issue) { setMessage(issue instanceof Error ? issue.message : "Unable to delete attendee record."); }
    finally { setPending(false); }
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setPending(true); setMessage("");
    try {
      const result = await request(editingId ? `/admin/events/${encodeURIComponent(editingId)}` : "/admin/events", { method: editingId ? "PUT" : "POST", body: JSON.stringify({ ...values,
        capacity: Number(values.capacity),
        startsAt: values.startsAt ? new Date(String(values.startsAt)).toISOString() : null,
        endsAt: values.endsAt ? new Date(String(values.endsAt)).toISOString() : null }) });
      const data = await request("/admin/events"); setEvents(data.events); await select(result.id, data.events);
      setAdding(false); setEditingId(null); setMessage(editingId ? "Event updated on the website." : newProvider === "native" ? "Event added to the website. Set registration to open when ready." : "Event added to the website with external registration.");
    } catch (issue) { setMessage(issue instanceof Error ? issue.message : "Unable to add event."); }
    finally { setPending(false); }
  }

  async function deleteEvent() {
    if (!selected || !window.confirm(`Delete “${selected.title}” from the website and close registration? Attendee records will be retained. This cannot be undone here.`)) return;
    setPending(true); setMessage("");
    try {
      await request(`/admin/events/${encodeURIComponent(selectedId)}`, { method: "DELETE" });
      const data = await request("/admin/events"); setEvents(data.events); await select(data.events[0]?.id ?? "", data.events);
      setMessage("Event deleted from the website. Attendee records were retained.");
    } catch (issue) { setMessage(issue instanceof Error ? issue.message : "Unable to delete event."); }
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
      <h2>Organizer login</h2>
      <p>Enter your organizer access key to manage events and registrations.</p>
      <label htmlFor="organizer-key">Organizer access key</label>
      <input id="organizer-key" type="password" value={accessKey} onChange={(event) => setAccessKey(event.target.value)} autoComplete="current-password" required disabled={pending} />
      <button className="button button-blue" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      {message && <p role="alert">{message}</p>}
    </form>
  );

  return (
    <div className="organizer-dashboard">
      <button type="button" className="button button-blue" disabled={pending} onClick={() => { setEditingId(null); setNewProvider("native"); setEventType("in-person"); setAdding(!adding); }}>{adding ? "Close event form" : "Add event"}</button>
      {adding && <form key={editingId ?? "new"} className="organizer-settings event-create-form" onSubmit={createEvent}>
        <h2>{editingId ? "Edit event" : "Add an event"}</h2>
        <p>New events appear on the website. Website registration starts closed. Dates and times use your computer’s local time zone.</p>
        <fieldset disabled={pending}>
          <label>Registration<select name="rsvpProvider" value={newProvider} onChange={event => setNewProvider(event.target.value)}><option value="native">Website RSVP</option><option value="meetup">Meetup RSVP</option><option value="external">Other external RSVP</option></select></label>
          {newProvider !== "native" && <label>Registration URL<input name="rsvpUrl" defaultValue={draft.rsvpUrl} type="url" placeholder="https://" maxLength={2000} required /></label>}
          <label>Title<input name="title" defaultValue={draft.title ?? editingEvent?.title} maxLength={200} required /></label>
          <label>Description<textarea name="synopsis" defaultValue={draft.synopsis} maxLength={2000} required rows={4} /></label>
          <label>Start (optional)<input name="startsAt" defaultValue={localDate(draft.startsAt)} type="datetime-local" /></label>
          <label>End (optional)<input name="endsAt" defaultValue={localDate(draft.endsAt)} type="datetime-local" /></label>
          <label>Host<input name="host" maxLength={200} defaultValue={draft.host ?? "Philadelphia Space Forum"} /></label>
          <label>Type<select name="eventType" value={eventType} onChange={e => setEventType(e.target.value)}><option value="in-person">In-Person</option><option value="online">Online</option></select></label>
          <label>Meeting link<input name="meetingUrl" type="url" placeholder="https://" defaultValue={draft.meetingUrl} disabled={eventType !== "online"} required={eventType === "online"} maxLength={2000} /></label>
          <label>Venue<input name="location" disabled={eventType === "online"} defaultValue={draft.location?.name} maxLength={300} /></label>
          <label>Street address<input name="address" disabled={eventType === "online"} defaultValue={draft.location?.address} maxLength={300} /></label>
          <label>City<input name="city" disabled={eventType === "online"} defaultValue={draft.location?.city} maxLength={120} /></label>
          <label>State<input name="state" disabled={eventType === "online"} defaultValue={draft.location?.state} maxLength={80} /></label>
          <label>Speaker<input name="speaker" defaultValue={draft.speaker?.name} maxLength={200} /></label>
          <label>Speaker bio<textarea name="speakerBio" defaultValue={draft.speaker?.bio} maxLength={2000} rows={3} /></label>
          <label>Topics (one per line)<textarea name="topics" defaultValue={draft.topics?.join("\n")} maxLength={2000} rows={3} /></label>
          {newProvider === "native" ? <label>Capacity<input name="capacity" type="number" min={0} max={10000} defaultValue={editingEvent?.capacity ?? 20} required /></label> : <input type="hidden" name="capacity" value="0" />}
          <button className="button button-blue">{pending ? "Saving…" : editingId ? "Save event" : "Create event"}</button>
        </fieldset>
      </form>}
      <div className="organizer-toolbar">
        <div className="organizer-event-picker"><label htmlFor="organizer-event">Event</label>
        <select id="organizer-event" value={selectedId} disabled={pending} onChange={async (event) => {
          setPending(true); try { await select(event.target.value); } catch { setMessage("Unable to load attendees."); } finally { setPending(false); }
        }}>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></div>
        <button type="button" className="text-link" disabled={pending} onClick={() => { setSignedIn(false); setAccessKey(""); setRegistrations([]); setEvents([]); setSelectedId(""); setMessage(""); }}>Sign out</button>
      </div>
      {selected && <>
        <form className="organizer-settings" onSubmit={save}>
          {selected.rsvpProvider !== "native" ? <>
            <h2>External registration</h2>
            <p>Attendees and capacity are managed on the external event website.</p>
            <label htmlFor="external-title">Event title</label><input id="external-title" value={externalTitle} onChange={e => setExternalTitle(e.target.value)} maxLength={200} required disabled={pending} />
            <label htmlFor="external-link">Registration URL</label><input id="external-link" type="url" value={externalLink} onChange={e => setExternalLink(e.target.value)} required disabled={pending} />
            <a className="text-link" href={selected.rsvpUrl} target="_blank" rel="noreferrer">Open registration website ↗</a>
          </> : <>
          <p>{selected.confirmed} confirmed attendees</p>
          <label htmlFor="event-capacity">Capacity</label>
          <input id="event-capacity" type="number" min={selected.confirmed} max={10000} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} disabled={pending} required />
          <label className="checkbox-label"><input type="checkbox" checked={registrationOpen} onChange={(event) => setRegistrationOpen(event.target.checked)} disabled={pending} /> Open registration</label>
          <p className="form-note">Registration closes when a scheduled event starts. Events without a date stay open until you close them. Capacity counts registrations made on this website.</p>
          </>}
          <button className="button button-blue" disabled={pending}>Save settings</button>
        </form>
        <div className="organizer-event-actions"><button type="button" className="text-link" disabled={pending} onClick={() => { setEditingId(selectedId); setNewProvider(selected.rsvpProvider); const details = selected.details_json ? JSON.parse(selected.details_json) : {}; setEventType(details.eventType ?? (details.location?.name?.toLowerCase() === "online" ? "online" : "in-person")); setAdding(true); }}>Edit event</button><button type="button" className="text-link event-delete" onClick={deleteEvent} disabled={pending}>Delete event</button>
        <button type="button" className="text-link" onClick={exportCsv} disabled={selected.rsvpProvider !== "native" || !registrations.length || pending}>Download attendee CSV</button></div>
        {selected.rsvpProvider === "native" && <><div className="attendee-table-wrap"><table className="attendee-table">
          <caption>{selected.title} registrations</caption>
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{registrations.map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.email}</td><td>{row.status}</td><td className="attendee-actions">{row.status === "confirmed" && <button type="button" className="text-link" disabled={pending} onClick={() => cancel(row.id)}>Cancel RSVP<span className="sr-only"> for {row.name}</span></button>}<button type="button" className="text-link" disabled={pending} onClick={() => deleteRegistration(row)}>Delete record<span className="sr-only"> for {row.name}</span></button></td></tr>)}</tbody>
        </table></div>
        {!registrations.length && <p>No registrations yet.</p>}</>}
      </>}
      {!events.length && <p>No events are available.</p>}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
