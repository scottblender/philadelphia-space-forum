"use client";
import { useEffect, useState } from "react";
import { events as builtInEvents, type ForumEvent } from "../data/events";
import { rsvpApiUrl, rsvpRequest } from "../lib/rsvp";
import { EventCard } from "./EventCard";

export function EventList() {
  const [events, setEvents] = useState<ForumEvent[]>(builtInEvents);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!rsvpApiUrl) return;
    const controller = new AbortController();
    const refresh = () => rsvpRequest("/events", { signal: controller.signal }).then(data => {
      const merged = new Map(builtInEvents.map(event => [event.id, event]));
      for (const event of data.events) merged.set(event.id, event);
      for (const id of data.deletedIds) merged.delete(id);
      setEvents([...merged.values()]); setError(false);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  return <>{error && <p role="status">Event updates could not load. Please refresh to try again.</p>}{events.map(event => <EventCard key={event.id} event={event} />)}{!events.length && <p>No events are available yet.</p>}</>;
}
