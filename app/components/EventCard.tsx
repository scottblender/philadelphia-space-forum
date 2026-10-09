"use client";

import { useEffect, useState } from "react";
import type { ForumEvent } from "../data/events";
import { getEventState } from "../lib/eventState";
import { RsvpForm } from "./RsvpForm";

const stateLabels = { upcoming: "Upcoming", live: "Happening now", past: "Past event", cancelled: "Cancelled" };

export function EventCard({ event }: { event: ForumEvent }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  // A stable initial render keeps exported pages hydration-safe. Refresh in the
  // browser so an event's status continues to change after the site is built.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const state = now === null
    ? (event.status === "cancelled" ? "cancelled" : null)
    : getEventState(event, now);
  const date = event.startsAt ? new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: event.timeZone,
  }).format(new Date(event.startsAt)) : "To be announced";
  const formatTime = (value: string, includeZone = false) => new Intl.DateTimeFormat("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: event.timeZone,
    ...(includeZone ? { timeZoneName: "short" as const } : {}),
  }).format(new Date(value));
  const address = `${event.location.address}, ${event.location.city}, ${event.location.state}`;

  return (
    <article className="event-card" aria-labelledby={`${event.id}-title`}>
      <div className="event-card-body">
        <div className="event-meta">
          <span>{event.category}</span>
          <span className={`event-status${state ? ` event-status-${state}` : ""}`} aria-live="polite">
            {state ? stateLabels[state] : "Scheduled"}
          </span>
        </div>
        <h2 id={`${event.id}-title`}>{event.title}</h2>
        <p className="event-synopsis">{event.synopsis}</p>
        <p className="event-host">Hosted by {event.host}</p>
        {event.speaker.name && <div className="event-speaker">
          <p className="eyebrow"><span /> {event.speaker.role}</p>
          <h3>{event.speaker.name}</h3>
          <p>{event.speaker.bio}</p>
        </div>}
        <button
          type="button"
          className="text-link event-details-toggle"
          aria-expanded={detailsOpen}
          aria-controls={`${event.id}-details`}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? "Hide event topics" : "View event topics"}
          <span aria-hidden="true">{detailsOpen ? "−" : "+"}</span>
        </button>
        <div id={`${event.id}-details`} className="event-details" hidden={!detailsOpen}>
          <h3>Event topics</h3>
          <ul>{event.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
        </div>
      </div>
      <aside className="event-logistics" aria-label={`${event.title} time and location`}>
        <div>
          <p className="eyebrow"><span /> When</p>
          <p className="event-date">{event.startsAt ? <time dateTime={event.startsAt}>{date}</time> : date}</p>
          {event.startsAt && <p className="event-time">{formatTime(event.startsAt, !event.endsAt)}{event.endsAt && <> – {formatTime(event.endsAt, true)}</>}</p>}
        </div>
        <div>
          <p className="eyebrow"><span /> Where</p>
          <p className="event-venue">{event.location.name}</p>
          {event.location.address && <><address>{event.location.address}<br />{event.location.city}, {event.location.state}</address>
          <a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location.name}, ${address}`)}`} target="_blank" rel="noreferrer">Get directions <span aria-hidden="true">↗</span></a></>}
        </div>
        {state !== "cancelled" && state !== "past" && event.rsvpProvider === "native" && <RsvpForm eventId={event.id} title={event.title} isTest={event.isTest} />}
        {state !== "cancelled" && event.rsvpProvider !== "native" && (
          <a className="button button-blue" href={event.rsvpUrl} target="_blank" rel="noreferrer">
            {event.rsvpProvider === "meetup" ? (state === "past" ? "View event on Meetup" : "RSVP on Meetup") : (state === "past" ? "View event" : "RSVP on event website")} <span aria-hidden="true">↗</span>
          </a>
        )}
      </aside>
    </article>
  );
}
