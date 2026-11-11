import { isEventKind } from "./officeEvents";
import { INVASION_KINDS, INVASIONS, InvasionKindId, isInvasionKind } from "./officeInvasions";
import { isPerformanceKind, PERFORMANCE_KINDS, PERFORMANCES, PerformanceKindId } from "./officePerformances";
import { VISITOR_KINDS } from "./officeVisitors";
import { SCENE_EVENT_KINDS, SceneEventKind } from "./sceneEventSchedule";

// Pure: everything Trigger Event can start, in one list: the scene events, the invasions, the shows, and a visitor
// from each department. Each has an id like "invasion:zombies" (a keybinding can pass one) and reads back with
// parseTrigger.

export type Trigger =
  | { kind: "scene"; event: SceneEventKind }
  | { kind: "invasion"; invasion: InvasionKindId }
  | { kind: "show"; show: PerformanceKindId }
  | { kind: "visitor"; department: string };

export type TriggerGroup = "Scene events" | "Invasions" | "Shows" | "Visitors";

export interface TriggerItem {
  id: string;
  group: TriggerGroup;
  label: string;
  description: string;
}

const SCENE_LABELS: Record<SceneEventKind, { label: string; description: string }> = {
  error: { label: "ERROR", description: "red alert: the build broke" },
  hack: { label: "HACK", description: "green rain: you're in" },
  defense: { label: "DEFENSE", description: "shields up against an attack" },
};

const INVASION_DESCRIPTIONS: Record<InvasionKindId, string> = {
  aliens: "beamed down; they zap you, or float you up in a beam",
  zombies: "shamble in; anyone bitten joins them for a bit",
  raiders: "burst in, bonk heads, and run off with the snacks",
  vampires: "appear in smoke, tackle, slurp, and leave as bats",
  robots: "march in and laser you down",
  ghosts: "drift in, BOO!, and you faint dead white",
  werewolves: "a full moon; anyone bitten runs with the pack",
  slimes: "ooze in and SPLAT! you sticky green",
  mummies: "shuffle in and wrap you up",
  demons: "a hellgate opens; fireballs leave you sooty",
};

const SHOW_DESCRIPTIONS: Record<PerformanceKindId, string> = {
  guitarist: "a busker with an acoustic guitar",
  band: "singer, guitar, bass, and drums",
  lunch: "a trolley of hot lunch for everyone",
  snacks: "donuts, cookies, ice cream, popcorn",
  comedian: "stand-up under a spotlight",
  magician: "card tricks and a rabbit in a hat",
  dj: "a DJ, a mirror ball, and dancing",
};

export const TRIGGER_ITEMS: readonly TriggerItem[] = [
  ...SCENE_EVENT_KINDS.map((event) => ({ id: `scene:${event}`, group: "Scene events" as const, ...SCENE_LABELS[event] })),
  ...INVASION_KINDS.map((id) => ({ id: `invasion:${id}`, group: "Invasions" as const, label: INVASIONS[id].label, description: INVASION_DESCRIPTIONS[id] })),
  ...PERFORMANCE_KINDS.map((id) => ({ id: `show:${id}`, group: "Shows" as const, label: PERFORMANCES[id].label, description: SHOW_DESCRIPTIONS[id] })),
  ...VISITOR_KINDS.map((kind) => ({ id: `visitor:${kind.id}`, group: "Visitors" as const, label: kind.title, description: kind.boss ? "a boss drops by" : "drops by" })),
];

export const TRIGGER_GROUPS: readonly TriggerGroup[] = ["Scene events", "Invasions", "Shows", "Visitors"];

export function invasionDescription(id: InvasionKindId): string {
  return INVASION_DESCRIPTIONS[id];
}

export function showDescription(id: PerformanceKindId): string {
  return SHOW_DESCRIPTIONS[id];
}

// An id back to what it starts, or undefined for anything else. "random" picks any of them.
export function parseTrigger(value: unknown, random: () => number = Math.random): Trigger | undefined {
  if (value === "random") {
    return parseTrigger(TRIGGER_ITEMS[Math.floor(random() * TRIGGER_ITEMS.length) % TRIGGER_ITEMS.length].id);
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const [kind, id] = value.split(":", 2);
  if (kind === "scene" && isEventKind(id)) {
    return { kind: "scene", event: id };
  }
  if (kind === "invasion" && isInvasionKind(id)) {
    return { kind: "invasion", invasion: id };
  }
  if (kind === "show" && isPerformanceKind(id)) {
    return { kind: "show", show: id };
  }
  if (kind === "visitor" && VISITOR_KINDS.some((visitor) => visitor.id === id)) {
    return { kind: "visitor", department: id };
  }
  return undefined;
}
