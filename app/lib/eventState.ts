export type EventState = "upcoming" | "live" | "past" | "cancelled";

export function getEventState(
  event: { startsAt: string; endsAt: string; status: "scheduled" | "cancelled" },
  now: number,
): EventState {
  if (event.status === "cancelled") return "cancelled";
  if (now >= Date.parse(event.endsAt)) return "past";
  if (now >= Date.parse(event.startsAt)) return "live";
  return "upcoming";
}
