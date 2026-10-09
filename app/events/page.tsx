import type { Metadata } from "next";
import { EventCard } from "../components/EventCard";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { events } from "../data/events";

export const metadata: Metadata = {
  title: "Events | Philadelphia Space Forum",
  description: "Explore Philadelphia Space Forum events, including the Cislunar Space Fundamentals Workshop and Cislunar Space Situational Awareness Workshop.",
};

export default function EventsPage() {
  return (
    <main id="top" className="inner-page">
      <SiteHeader />
      <section className="page-width inner-hero">
        <div>
          <p className="eyebrow"><span /> Meet. Learn. Explore.</p>
          <h1>Events</h1>
        </div>
        <p className="inner-hero-aside">Research, conversation, and hands-on exploration with Philadelphia&apos;s space community.</p>
      </section>
      <section className="page-width events-list" aria-label="Forum events">
        {events.map((event) => <EventCard key={event.id} event={event} />)}
      </section>
      <SiteFooter />
    </main>
  );
}
