// Pure: the Office's own scene events and monitor tint, for when no other extension plays them. A host that calls
// playEvent or setTint takes over, and these stop.

import { SCENE_EVENT_KINDS, SceneEventKind } from "./sceneEventSchedule";

export type EventFrequency = "off" | "rare" | "normal" | "often";

export const EVENT_FREQUENCIES: readonly EventFrequency[] = ["off", "rare", "normal", "often"];

export function eventFrequency(value: unknown): EventFrequency {
  return EVENT_FREQUENCIES.includes(value as EventFrequency) ? (value as EventFrequency) : "normal";
}

// The average minutes between events; each gap is a random 0.6x to 1.6x of it.
const EVENT_MINUTES: Record<Exclude<EventFrequency, "off">, number> = { rare: 15, normal: 5, often: 2 };
// The first event comes sooner, so a new window sees one.
const FIRST_EVENT_MINUTES = 2;

// Milliseconds to the next event, or undefined when they're off.
export function eventGapMs(frequency: EventFrequency, random: () => number, first = false): number | undefined {
  if (frequency === "off") {
    return undefined;
  }
  const minutes = first ? Math.min(FIRST_EVENT_MINUTES, EVENT_MINUTES[frequency]) : EVENT_MINUTES[frequency] * (0.6 + random());
  return Math.round(minutes * 60_000);
}

export function pickEventKind(random: () => number): SceneEventKind {
  return SCENE_EVENT_KINDS[Math.min(SCENE_EVENT_KINDS.length - 1, Math.floor(random() * SCENE_EVENT_KINDS.length))];
}

export function isEventKind(value: unknown): value is SceneEventKind {
  return SCENE_EVENT_KINDS.includes(value as SceneEventKind);
}

// Your second monitor's graph moves to the next tint every 20 to 40 seconds.
export function tintGapMs(random: () => number): number {
  return Math.round((20 + random() * 20) * 1000);
}
