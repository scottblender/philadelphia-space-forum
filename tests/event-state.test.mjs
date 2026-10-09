import assert from "node:assert/strict";
import test from "node:test";
import { getEventState } from "../app/lib/eventState.ts";

const event = {
  startsAt: "2026-10-16T14:00:00-04:00",
  endsAt: "2026-10-16T16:00:00-04:00",
  status: "scheduled",
};

test("event lifecycle follows exact boundaries and timezone offsets", () => {
  assert.equal(getEventState(event, Date.parse("2026-10-16T17:59:59Z")), "upcoming");
  assert.equal(getEventState(event, Date.parse("2026-10-16T18:00:00Z")), "live");
  assert.equal(getEventState(event, Date.parse("2026-10-16T19:59:59Z")), "live");
  assert.equal(getEventState(event, Date.parse("2026-10-16T20:00:00Z")), "past");
});

test("cancellation takes precedence before, during, and after an event", () => {
  for (const time of ["2026-10-15T12:00:00Z", "2026-10-16T19:00:00Z", "2026-10-17T12:00:00Z"]) {
    assert.equal(getEventState({ ...event, status: "cancelled" }, Date.parse(time)), "cancelled");
  }
});

test("events awaiting a date remain upcoming without inventing timestamps", () => {
  assert.equal(getEventState({ startsAt: null, endsAt: null, status: "scheduled" }, Date.now()), "upcoming");
});
