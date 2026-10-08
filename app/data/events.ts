export interface ForumEvent {
  id: string;
  title: string;
  category: string;
  status: "scheduled" | "cancelled";
  startsAt: string;
  endsAt: string;
  timeZone: string;
  host: string;
  location: { name: string; address: string; city: string; state: string };
  synopsis: string;
  speaker: { name: string; role: string; bio: string };
  topics: string[];
  rsvpUrl: string;
}

/** Add future events here; EventCard handles their details and lifecycle. */
export const events: ForumEvent[] = [
  {
    id: "cislunar-space-workshop-2026-10-16",
    title: "Cislunar Space Workshop",
    category: "Workshop · In person",
    status: "scheduled",
    startsAt: "2026-10-16T14:00:00-04:00",
    endsAt: "2026-10-16T16:00:00-04:00",
    timeZone: "America/New_York",
    host: "C.O.D.E — Community of Developers & Engineers",
    location: {
      name: "Pennovation Center",
      address: "3401 Grays Ferry Ave",
      city: "Philadelphia",
      state: "PA",
    },
    synopsis: "Explore NASA’s Artemis missions and cislunar orbital motion. Learn the basics of reference frames, trajectory design, and orbit propagation, with a short Python demonstration and a discussion of current cislunar research opportunities.",
    speaker: {
      name: "Scott Blender",
      role: "Workshop leader",
      bio: "Scott is a third-year Ph.D. student in aerospace engineering at RPI and a researcher in the Advanced Space Concepts Laboratory. His research focuses on spacecraft guidance, cislunar space domain awareness, and lunar-surface sensor networks.",
    },
    topics: [
      "Artemis and NASA’s return to the Moon",
      "Orbital motion fundamentals",
      "Reference frames and selenocentric orbits",
      "Cislunar research: SSA, landing, and robotics",
      "Live Python orbit propagation demo",
      "Q&A and ways to get involved",
    ],
    rsvpUrl: "https://www.meetup.com/code-coffee-philly/events/316162308/",
  },
];
