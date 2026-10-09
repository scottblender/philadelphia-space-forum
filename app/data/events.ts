export interface ForumEvent {
  id: string;
  title: string;
  category: string;
  status: "scheduled" | "cancelled";
  startsAt: string | null;
  endsAt: string | null;
  timeZone: string;
  host: string;
  eventType?: "in-person" | "online";
  meetingUrl?: string;
  location: { name: string; address: string; city: string; state: string };
  synopsis: string;
  speaker: { name: string; role: string; bio: string };
  topics: string[];
  rsvpUrl?: string;
  rsvpProvider: "meetup" | "native" | "external";
  isTest?: boolean;
}

/** Add future events here; EventCard handles their details and lifecycle. */
export const events: ForumEvent[] = [
  {
    id: "cislunar-space-workshop-2026-10-16",
    title: "Cislunar Space Fundamentals Workshop",
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
    rsvpProvider: "meetup",
  },
  {
    id: "cislunar-space-situational-awareness-workshop",
    title: "Cislunar Space Situational Awareness Workshop",
    category: "Workshop · Test event",
    isTest: true,
    status: "scheduled",
    startsAt: null,
    endsAt: null,
    timeZone: "America/New_York",
    host: "Philadelphia Space Forum",
    location: { name: "To be announced", address: "", city: "", state: "" },
    synopsis: "Dive further into Scott’s Ph.D. research and the foundations of space situational awareness in the cislunar environment. Explore optical observation systems, the current state of the art, and future missions being planned.",
    speaker: {
      name: "Scott Blender",
      role: "Workshop leader",
      bio: "Scott is a third-year Ph.D. student at RPI and a researcher in the Advanced Space Concepts Laboratory. His research focuses on cislunar space domain awareness and lunar-surface sensor networks.",
    },
    topics: [
      "Foundations of cislunar space situational awareness",
      "Scott’s Ph.D. research and lunar-surface sensor networks",
      "Optical systems for observing and tracking spacecraft",
      "Current state of the art in cislunar monitoring",
      "Future missions being planned",
      "Discussion and Q&A",
    ],
    rsvpProvider: "native",
  },
];
