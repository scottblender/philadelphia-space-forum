export type EventState = "upcoming" | "live" | "past" | "cancelled";

export function getEventState(
  event: { startsAt: string | null; endsAt: string | null; status: "scheduled" | "cancelled" },
  now: number,
): EventState {
  if (event.status === "cancelled") return "cancelled";
  if (event.endsAt && now >= Date.parse(event.endsAt)) return "past";
  if (event.startsAt && now >= Date.parse(event.startsAt)) return "live";
  return "upcoming";
}
