// Pure: the Office view's people. Each live session gets a guy with a desk. A working session's guy sits at his desk
// and types; an idle one sits back, then wanders off: the cooler, the coffee, the couch, a walk, or a chat with
// another idle guy. When his session gets busy again he runs back to his desk. A suspended session's guy goes back to
// his desk and falls asleep on it. A session that leaves the sidebar walks out the door.
// You're in the room too, at your station: you work, take a break now and then to wander, grab a coffee, or shoot
// the breeze with someone (idle, or busy at his desk), and run back to your desk when a scene event hits.
// Now and then someone from another department visits: walks in and says his lines to the room. Some walk right back
// out; others hang around like an idle guy (chats, coffee, the couch, looming over a busy guy's desk) and make small
// talk, then say bye and go.
// Desks aren't there until they're needed: when a session joins, two maintenance guys walk in, one carrying the desk
// and the other his chair, set it down at the guy's spot while he waits beside it, and walk out. When a session ends
// they come back for its desk. Only your station is always there.
// The webview calls syncOffice when the sessions change, syncYou when you come or go, and stepOffice every frame;
// time is in seconds.

import { ClearedArea, DRINK_PROPS, findPath, isWalkable, nearestWalkable, OfficeLayout, openFloorTiles, Point, pushDesksAside } from "./officeLayout";
import {
  BACK_LINES, BREAK_LINES, chatPhrase, CREW_BUILD_LINES, CREW_DONE_LINES, CREW_HELP_LINES, CREW_NEVER_MIND_LINES, CREW_REMOVE_LINES,
  CREW_START_LINES, exchangeAnswer, MUSE_LINES, MuseMode, pickExchange, pickPhrase, RUSH_LINES, SLEEP_LINES, THANKS_LINES, TYPING_LINES,
  WAIT_LINES, WAKE_IDLE_LINES, WAKE_TO_WORK_LINES,
} from "./officePhrases";
import {
  ACTIVITIES, ActivityKindId, ActivityLevel, ActivitySwaps, activityStay, activityTarget, activityTripGap, activityWidth, CREW_ITEM_LINES, pickActivityKind,
} from "./officeActivities";
import { audienceLine, FoodKind, PERFORMANCES, PerformanceKindId, ShowCue, ShowLine, ShowRole } from "./officePerformances";
import {
  AFTERMATH_SECONDS, CLEAN_LINES, LookVariant, COWER_LINES, DebrisKind, DONE_LINES, DUST_LINES, FLEE_SPEED, InvasionKindId, INVASIONS, RETREAT_SECONDS,
  screamLine, SURVIVOR_LINES, WARNING_SECONDS, wakeLine,
} from "./officeInvasions";
import { MAX_VISITORS, personalityOf, visitorReaction } from "./officeVisitors";
import {
  fallerLine, GatherAct, GatherCue, gatherCrowdLine, GatheringKindId, GATHERINGS, GatherLine, GroupPose, turnCrowdLine,
} from "./officeGatherings";
import type { Facing, Pose } from "./pixelGuy";

export type AgentStatus = "working" | "idle" | "asleep";

export interface AgentInput {
  id: string;
  seed: string;
  status: AgentStatus;
  title: string;
}

export type AgentMode =
  | "walk" | "type" | "sit" | "stretch" | "drink" | "loiter" | "chat" | "wait" | "couch" | "sleep" | "address" | "build"
  // In the crowd at a show, and on stage putting one on.
  | "watch" | "perform"
  // At an activity: playing it (waiting his turn, or for his opponent, is "wait").
  | "play"
  // At a group gathering: in his spot in the ring or the rows, or taking his turn in the middle.
  | "gather"
  // In an invasion. The guys: frozen at the warning, catching breath on the run, hiding, caught, knocked down, up in a
  // beam, coming to, dusting off, and sweeping up. The invaders: striking, and beaming or smoking in or out.
  | "alert" | "panic" | "cower" | "struggle" | "down" | "float" | "dazed" | "dust" | "sweep" | "attack" | "beam";

export type AgentGoal =
  | { kind: "work" }
  | { kind: "sleep" }
  | { kind: "desk" }
  | { kind: "prop"; propIndex: number }
  | { kind: "couch" }
  | { kind: "wander" }
  | { kind: "chat"; partnerId: string }
  // You, standing behind a busy guy's chair, talking while he types.
  | { kind: "visit"; agentId: string }
  // A visitor, headed to the middle of the room to say his piece.
  | { kind: "address" }
  // A session's guy whose desk isn't in yet, waiting beside its spot.
  | { kind: "waitDesk" }
  // A maintenance guy on a job; his crew phase says which step.
  | { kind: "crew" }
  // A performer headed for his spot on stage, and a guy headed for a spot in the crowd.
  | { kind: "perform" }
  | { kind: "show" }
  // Headed for, or at, one of an activity's spots.
  | { kind: "activity"; activityId: string; activity: ActivityKindId; spot: number }
  // Headed for, or at, his spot at a group gathering (or the middle, on his turn).
  | { kind: "gather" }
  // In an invasion: running from them, chasing a guy, headed to trash something, and headed to sweep up a mess.
  | { kind: "flee" }
  | { kind: "hunt"; preyId: string }
  | { kind: "trash" }
  | { kind: "sweep"; debrisId: number }
  | { kind: "door" };

export interface Agent {
  id: string;
  seed: string;
  title: string;
  status: AgentStatus;
  x: number;
  y: number;
  facing: Facing;
  path: Point[];
  running: boolean;
  goal: AgentGoal | undefined;
  // The tile the agent is headed to or using, so two guys don't pick the same cooler.
  target: Point | undefined;
  mode: AgentMode;
  modeUntil: number;
  // A desk index, or undefined for a guy who works from the couch or the floor because the desks ran out.
  deskIndex: number | undefined;
  workSpot: Point;
  bubble: { text: string; until: number } | undefined;
  nextBubbleAt: number;
  leaving: boolean;
  // You, not a session: works at the station, and isn't counted.
  you: boolean;
  // Yours only: when your break starts, or ends while you're on one.
  nextBreakAt: number;
  // Stopped to watch a critter go by: faces it and stands still until then.
  watch: { facing: Facing; until: number } | undefined;
  // A visitor from another department, not a session.
  visitor: VisitorState | undefined;
  // A maintenance guy, not a session.
  crew: CrewState | undefined;
  // The answer he owes the guy he's chatting with, said on his next turn if it's still fresh.
  reply?: { text: string; until: number };
  // Someone putting on a show, not a session.
  performer: PerformerState | undefined;
  // In the crowd: his answer to the last cue, said a moment after it; arms up until cheerUntil; what he's eating.
  react?: { text: string; at: number; cheer: boolean };
  cheerUntil: number;
  snack?: FoodKind;
  // Woken from a nap to watch a show; he answers it sleepily.
  groggy?: boolean;
  // Tiles a second, when he isn't going the usual walk or run: invaders, and the guys running from them.
  speed?: number;
  // An invader, not a session.
  invader?: InvaderState;
  // Caught up in an invasion.
  scare?: ScareState;
  // The strike he's in the middle of, as an invader or a turned zombie.
  strike?: StrikeState;
  // Drawn another way for a while: turned into a zombie, or pale from a vampire.
  variant?: LookVariant;
  // Came in to lead a group gathering (the yoga instructor, the fire marshal), not a session.
  gatherHost?: boolean;
}

export type { LookVariant };

export interface InvaderState {
  kind: InvasionKindId;
  nextTauntAt: number;
  nextTrashAt: number;
  // When he next looks again for who to chase.
  repathAt: number;
  // Raiders run off with something.
  loot: boolean;
  // On his way out by beam or bats: gone when his mode runs out.
  exiting: boolean;
}

// A strike on a guy, or on the furniture; feeding is the vampire's second part, over a guy he's tackled.
export interface StrikeState {
  targetId: string | undefined;
  at: Point;
  feeding: boolean;
}

export interface ScareState {
  // When his mode started, for floating up in a beam.
  since: number;
  nextScreamAt: number;
  // Knocked down at some point (survivors weren't), and come to since.
  down: boolean;
  woke: boolean;
  // Bitten: up again as a zombie at turnAt, then chasing the others until they leave.
  turnAt: number | undefined;
  turned: boolean;
  // Facing his head to the left on the floor.
  headLeft: boolean;
  // When he next looks again for who to chase, as a turned zombie.
  repathAt: number;
}

export interface PerformerState {
  role: ShowRole;
  spot: Point;
  // Taking a bow at the end.
  bowing: boolean;
}

// arriving: the performers walking in to their spots. playing: the show, the lead saying his lines over its length.
// bows: the closer said, a few seconds of applause before everyone heads off.
export type ShowPhase = "arriving" | "playing" | "bows";

export interface ShowState {
  kind: PerformanceKindId;
  title: string;
  // The lead's spot; the others stand beside it, the drummer behind.
  stage: Point;
  spots: Point[];
  phase: ShowPhase;
  performerIds: string[];
  lines: readonly ShowLine[];
  closer: ShowLine;
  spoken: number;
  nextLineAt: number;
  lineGap: number;
  length: number;
  startedAt: number;
  endsAt: number;
  // Starts anyway if a performer can't make it to his spot by then.
  giveUpAt: number;
  nextGatherAt: number;
  food: readonly FoodKind[];
  // The last cue and when, for the view's effects (sparkles, confetti).
  lastCue: { cue: ShowCue; at: number } | undefined;
}

export interface ShowInput {
  kind: PerformanceKindId;
  title: string;
  // One per role in the spec, the lead first.
  performers: readonly { id: string; seed: string; title: string; role: ShowRole }[];
  lines: readonly ShowLine[];
  closer: ShowLine;
  length: number;
  food?: readonly FoodKind[];
}

// warning: the lights flicker and everyone freezes. attack: they come in and the guys run. retreat: they leave.
// aftermath: the guys come to one by one, dust off, and sweep up.
export type InvasionPhase = "warning" | "attack" | "retreat" | "aftermath";

// A bit of mess on the floor, and who's sweeping it up.
export interface Debris {
  id: number;
  x: number;
  y: number;
  // Pixels off the tile's middle, so the mess doesn't sit on a grid.
  ox: number;
  oy: number;
  kind: DebrisKind;
  sweeper: string | undefined;
}

// For the view: a word popping off a hit, an invader beaming or smoking in (or out), and an alien's zap.
export interface InvasionHit {
  x: number;
  y: number;
  at: number;
  word: string;
}

export interface InvasionPuff {
  x: number;
  y: number;
  at: number;
  exit: boolean;
}

export interface InvasionZap {
  fromId: string;
  toId: string;
  until: number;
}

export interface InvasionState {
  kind: InvasionKindId;
  phase: InvasionPhase;
  startedAt: number;
  phaseStartedAt: number;
  phaseEndsAt: number;
  // Seconds the attack lasts at most.
  length: number;
  invaderIds: string[];
  // Invaders still to come in, one every so often.
  pending: InvaderInput[];
  nextSpawnAt: number;
  debris: Debris[];
  debrisCount: number;
  hits: InvasionHit[];
  puffs: InvasionPuff[];
  zaps: InvasionZap[];
  nextGatherAt: number;
  // When the last guy went down, so the attack ends a moment after.
  allDownSince: number | undefined;
  nextWakeAt: number;
}

export interface InvaderInput {
  id: string;
  seed: string;
  title: string;
}

export interface InvasionInput {
  kind: InvasionKindId;
  invaders: readonly InvaderInput[];
  // Seconds the attack lasts at most.
  length: number;
}

export interface CrewJob {
  kind: "deliver" | "remove";
  deskIndex: number;
  // The seed of the guy the desk is for, which sets its style.
  seed: string;
  // An activity instead of a desk: the kind, and for taking one out, which one.
  item?: ActivityKindId;
  activityId?: string;
}

// An activity standing in the room, on a desk spot (the left one of a pair).
export interface ActivityState {
  id: string;
  kind: ActivityKindId;
  index: number;
  // When the crew comes to swap it for something else.
  until: number;
  // The crew's been called for it: nobody starts on it now.
  going: boolean;
  // The current go at it, once someone's on it, and when they swap turns.
  endsAt: number | undefined;
  nextTurnAt: number;
}

// One of an activity's spots: where a guy stands (or sits) and which way he faces. A wait spot is beside the play
// spot, for the buddy waiting his turn.
export interface ActivitySpot {
  at: Point;
  facing: Facing;
  wait: boolean;
}

export interface ActivityFit {
  // The desk spots it covers.
  indexes: number[];
  // Tiles nobody walks on, tiles you only step onto to use it, and its spots.
  blocked: Point[];
  seats: Point[];
  spots: ActivitySpot[];
}

// fetch: to the door for a desk. toSlot: to the desk's spot. build: setting it down or taking it apart. haul: carrying
// it out. help: standing by while his partner works. out: leaving, nothing to do.
export type CrewPhase = "idle" | "fetch" | "toSlot" | "build" | "haul" | "help" | "out";

export interface CrewState {
  job: CrewJob | undefined;
  phase: CrewPhase;
  // The seed of the desk he's carrying, or undefined when his hands are empty.
  carrying: string | undefined;
  // Carrying the chair for his partner's desk.
  chair: boolean;
}

export interface VisitorState {
  // His arrival lines, and how many he's said.
  lines: readonly string[];
  spoken: number;
  boss: boolean;
  smallTalk: readonly string[];
  farewell: string | undefined;
  // Seconds to hang around after his lines, and when that runs out once he's started.
  stay: number;
  stayUntil: number;
  nextRemarkAt: number;
  // Every line he's said to the room, arrival lines and small talk alike, so the view can have the room answer.
  remarks: number;
}

export interface VisitorInput {
  id: string;
  seed: string;
  title: string;
  lines: readonly string[];
  boss?: boolean;
  smallTalk?: readonly string[];
  farewell?: string;
  // Seconds to hang around after his lines; 0 or missing walks right back out.
  stay?: number;
}

export interface OfficeState {
  layout: OfficeLayout;
  agents: Agent[];
  time: number;
  // The desks standing in the room, by index into layout.desks, each with the seed of the guy it came in for.
  placed: Map<number, string>;
  // The show on now, if any.
  show?: ShowState;
  // The invasion on now, if any.
  invasion?: InvasionState;
  // The group gathering on now, if any.
  gathering?: GatheringState;
  // Until when the desks are sliding to new spots (a gathering pushing them aside or putting them back), for the view.
  slideUntil?: number;
  // How much the guys talk on their own (officeChatter's talkFactor): 0 is never, 1 the usual.
  talk?: number;
  // What your guy is up to: auto works at his station with a break now and then; busy stays at the station; idle stays
  // on a break. A host sets it (say, busy while Claude works).
  youStatus?: YouStatus;
  // When the next maintenance guy may come in to help with a backlog of desks.
  crewDueAt?: number;
  // The activities standing, how many the room wants (officeSim.activities; off when unset), ones ordered that the
  // crew hasn't picked up yet, when the crew next comes for one, and a counter for their ids.
  activities?: ActivityState[];
  activityLevel?: ActivityLevel;
  // How often the crew swaps one out (officeSim.activitySwaps; normal when unset), and the setting the standing ones'
  // stays were rolled for.
  activitySwaps?: ActivitySwaps;
  activitySwapsRolled?: ActivitySwaps;
  activityOrders?: CrewJob[];
  nextActivityTripAt?: number;
  activityCount?: number;
}

export type YouStatus = "auto" | "busy" | "idle";

export type Random = () => number;

const WALK_SPEED = 2.4;
const RUN_SPEED = 5.5;
const FOREVER = Number.POSITIVE_INFINITY;
const CHAT_WAIT_SECONDS = 10;


export const YOU_AGENT_ID = "you";

const between = (random: Random, low: number, high: number) => low + random() * (high - low);
const talkOf = (state: OfficeState) => state.talk ?? 1;

export function createOffice(layout: OfficeLayout): OfficeState {
  clearDeskSpots(layout);
  return { layout, agents: [], time: 0, placed: new Map() };
}

const CREW_TITLE = "Maintenance";
// Two come in for any job; more follow, one at a time, while desks are still waiting, up to this many.
export const MAX_CREW = 6;
const CREW_SPACING_SECONDS = 0.8;

// A session's guy: not you, not a visitor, not the crew, not a performer.
function isSession(agent: Agent): boolean {
  return !agent.you && agent.visitor === undefined && agent.crew === undefined && agent.performer === undefined && agent.invader === undefined &&
    agent.gatherHost !== true;
}

export function crewAgents(state: OfficeState): Agent[] {
  return state.agents.filter((agent) => agent.crew !== undefined);
}

// Every desk spot starts as bare floor.
function clearDeskSpots(layout: OfficeLayout): void {
  for (const desk of layout.desks) {
    layout.tiles[desk.desk.y][desk.desk.x] = "floor";
    layout.tiles[desk.seat.y][desk.seat.x] = "floor";
  }
}

export function hasDesk(state: OfficeState, agent: Agent): boolean {
  return agent.deskIndex !== undefined && state.placed.has(agent.deskIndex);
}

// Puts a desk and its chair at a spot. Anyone standing where the desk goes steps out of the way.
function placeDesk(state: OfficeState, index: number, seed: string): void {
  const desk = state.layout.desks[index];
  if (desk === undefined) {
    return;
  }
  state.layout.tiles[desk.desk.y][desk.desk.x] = "desk";
  state.layout.tiles[desk.seat.y][desk.seat.x] = "seat";
  state.placed.set(index, seed);
  for (const agent of state.agents) {
    if (isAt(agent, desk.desk) || (agent.path.length > 0 && agent.path.some((step) => step.x === desk.desk.x && step.y === desk.desk.y))) {
      const moved = nearestWalkable(state.layout, here(agent));
      if (isAt(agent, desk.desk)) {
        agent.x = moved.x;
        agent.y = moved.y;
      }
      agent.path = [];
      agent.modeUntil = state.time;
    }
  }
}

function removeDesk(state: OfficeState, index: number): void {
  const desk = state.layout.desks[index];
  state.placed.delete(index);
  if (desk !== undefined) {
    state.layout.tiles[desk.desk.y][desk.desk.x] = "floor";
    state.layout.tiles[desk.seat.y][desk.seat.x] = "floor";
  }
}

// Where a guy waits for his desk: just below his chair's spot, facing it.
function deskWaitSpot(state: OfficeState, agent: Agent): Point {
  const below = { x: agent.workSpot.x, y: agent.workSpot.y + 1 };
  return state.layout.tiles[below.y]?.[below.x] === "floor" ? below : agent.workSpot;
}

// Adds guys for new sessions, sends ended sessions' guys out, and reacts to busy and idle flips. New guys walk in from
// the door, or with "seated" (the view just opened) start at their desks as if they'd been there all along.
export function syncOffice(
  state: OfficeState,
  inputs: readonly AgentInput[],
  random: Random,
  entrance: "door" | "seated" = "door",
): void {
  const inputsById = new Map(inputs.map((input) => [input.id, input]));
  for (const agent of state.agents) {
    if (!isSession(agent)) {
      continue;
    }
    const input = inputsById.get(agent.id);
    if (input === undefined) {
      if (!agent.leaving) {
        leave(state, agent);
      }
      continue;
    }
    agent.title = input.title;
    agent.seed = input.seed;
    if (agent.leaving) {
      // The session came back before he got out the door.
      agent.leaving = false;
      agent.status = input.status;
      decide(state, agent, random);
      continue;
    }
    if (agent.status !== input.status) {
      const previous = agent.status;
      agent.status = input.status;
      onStatusChange(state, agent, previous, random);
    }
  }
  const known = new Set(state.agents.filter(isSession).map((agent) => agent.id));
  const newcomers = inputs.filter((input) => !known.has(input.id)).map((input) => newAgent(state, input, random));
  state.agents.push(...newcomers);
  assignWorkSpots(state);
  if (entrance === "seated") {
    // The room opens furnished.
    furnishActivities(state, newcomers, random);
  }
  for (const agent of newcomers) {
    if (entrance === "seated") {
      // They were here all along, desks and all.
      if (agent.deskIndex !== undefined) {
        placeDesk(state, agent.deskIndex, agent.seed);
      }
      agent.x = agent.workSpot.x;
      agent.y = agent.workSpot.y;
      agent.facing = "up";
      if (agent.status !== "working") {
        if (random() < OPEN_NAP_CHANCE && hasDesk(state, agent)) {
          // A few are napping when the room opens.
          agent.goal = { kind: "sleep" };
          setMode(state, agent, "sleep", between(random, 10, NAP_SECONDS[1]));
          continue;
        }
        // Stagger when they get up, so the room doesn't stand up at once.
        agent.mode = agent.deskIndex === undefined ? "couch" : "sit";
        agent.modeUntil = state.time + between(random, 1, 12);
        continue;
      }
    }
    decide(state, agent, random);
  }
}

// Puts you at your station (seed is your sprite key), keeps you as you are, or takes you out when seed is undefined
// or the room has no station.
export function syncYou(state: OfficeState, seed: string | undefined, random: Random): void {
  const current = youAgent(state);
  const seat = state.layout.station?.seat;
  if (seed === undefined || seat === undefined) {
    if (current !== undefined) {
      removeAgent(state, current);
    }
    return;
  }
  if (current !== undefined) {
    current.seed = seed;
    return;
  }
  const agent: Agent = {
    ...newAgent(state, { id: YOU_AGENT_ID, seed, status: "working", title: "you" }, random),
    x: seat.x,
    y: seat.y,
    facing: "up",
    workSpot: seat,
    you: true,
    nextBreakAt: state.youStatus === "busy" ? FOREVER : state.youStatus === "idle" ? state.time + 3 : state.time + between(random, 25, 60),
  };
  state.agents.push(agent);
  setMode(state, agent, "type", FOREVER);
}

export function youAgent(state: OfficeState): Agent | undefined {
  return state.agents.find((agent) => agent.you);
}

// You're at your desk: seated at the station and not on a break.
export function isAtStation(agent: Agent): boolean {
  return agent.status === "working" && agent.path.length === 0 && isAt(agent, agent.workSpot);
}

// Someone from another department walks in from the door and heads for the middle of the room. Returns undefined
// when the room already has MAX_VISITORS or there's nowhere to stand.
export function visitorArrives(state: OfficeState, input: VisitorInput, random: Random): Agent | undefined {
  if (visitorAgents(state).length >= MAX_VISITORS || input.lines.length === 0) {
    return undefined;
  }
  const { cols, rows } = state.layout;
  const spots = openFloorTiles(state.layout)
    .filter((tile) => tile.y > 0 && !state.agents.some((agent) => agent.target?.x === tile.x && agent.target?.y === tile.y))
    .sort((first, second) => Math.hypot(first.x - cols / 2, first.y - rows / 2) - Math.hypot(second.x - cols / 2, second.y - rows / 2))
    .slice(0, 6);
  if (spots.length === 0) {
    return undefined;
  }
  const agent: Agent = {
    ...newAgent(state, { id: input.id, seed: input.seed, status: "working", title: input.title }, random),
    visitor: {
      lines: input.lines,
      spoken: 0,
      boss: input.boss ?? false,
      smallTalk: input.smallTalk ?? [],
      farewell: input.farewell,
      stay: Math.max(0, input.stay ?? 0),
      stayUntil: 0,
      nextRemarkAt: FOREVER,
      remarks: 0,
    },
  };
  state.agents.push(agent);
  goTo(state, agent, spots[Math.floor(random() * spots.length)], { kind: "address" }, false, random);
  return agent;
}

export function visitorAgents(state: OfficeState): Agent[] {
  return state.agents.filter((agent) => agent.visitor !== undefined);
}

// Still on his way in or saying his arrival lines.
function isAddressing(agent: Agent): boolean {
  return agent.visitor !== undefined && agent.goal?.kind === "address";
}

// Turns a standing idle guy to look at a point (a visitor, say) for a moment. Seated and busy guys stay put.
export function lookToward(state: OfficeState, agent: Agent, at: { x: number; y: number }, seconds: number): void {
  if (agent.status === "working" || agent.leaving || SEATED_MODES.has(agent.mode) || agent.mode === "chat" || inInvasion(agent)) {
    return;
  }
  const dx = at.x - agent.x;
  const dy = at.y - agent.y;
  const facing: Facing = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
  agent.watch = { facing, until: state.time + seconds };
}

// Says the visitor's next arrival line. Once he's said them all he hangs around, or walks out if he isn't staying.
function stepVisitor(state: OfficeState, agent: Agent, random: Random): void {
  const visit = agent.visitor;
  if (visit === undefined) {
    return;
  }
  if (agent.mode !== "address") {
    // Couldn't get to his spot: never mind, he'll come back another time.
    leave(state, agent);
    return;
  }
  if (state.time < agent.nextBubbleAt) {
    return;
  }
  if (visit.spoken >= visit.lines.length) {
    if (visit.stay <= 0) {
      leave(state, agent);
      return;
    }
    // Settles in: from here on he's an idle guy who isn't a session.
    visit.stayUntil = state.time + visit.stay;
    visit.nextRemarkAt = state.time + between(random, 15, 35);
    agent.status = "idle";
    agent.goal = undefined;
    setMode(state, agent, "loiter", between(random, 0.5, 1.5));
    return;
  }
  const line = visit.lines[visit.spoken];
  visit.spoken += 1;
  visit.remarks += 1;
  const seconds = lineSeconds(line);
  say(state, agent, line, seconds);
  agent.nextBubbleAt = state.time + seconds + 0.9;
}

// A visitor hanging around pipes up now and then with something to the room, when he isn't busy talking.
function stepHangout(state: OfficeState, agent: Agent, random: Random): void {
  const visit = agent.visitor;
  if (visit === undefined || state.time < visit.nextRemarkAt || visit.smallTalk.length === 0) {
    return;
  }
  visit.nextRemarkAt = state.time + between(random, 25, 60);
  if (agent.bubble !== undefined || agent.mode === "chat" || agent.mode === "wait") {
    return;
  }
  const line = visit.smallTalk[Math.floor(random() * visit.smallTalk.length)];
  visit.remarks += 1;
  say(state, agent, line, lineSeconds(line));
}

// Every visitor in the room says bye and heads out (the Stop button).
export function sendVisitorsHome(state: OfficeState): void {
  for (const agent of visitorAgents(state)) {
    if (!agent.leaving && agent.scare === undefined) {
      visitorLeaves(state, agent);
    }
  }
}

// A visitor done hanging around says bye and heads out.
function visitorLeaves(state: OfficeState, agent: Agent): void {
  const farewell = agent.visitor?.farewell;
  if (farewell !== undefined && agent.visitor?.stayUntil !== 0) {
    say(state, agent, farewell, 2);
  }
  leave(state, agent);
}

// Longer lines stay up longer.
function lineSeconds(line: string): number {
  return Math.min(4.5, 2.2 + line.length * 0.05);
}

// A scene event: drop what you're doing and run back to your desk.
export function callYouBack(state: OfficeState, random: Random): void {
  const agent = youAgent(state);
  if (agent === undefined || agent.scare !== undefined) {
    return;
  }
  agent.nextBreakAt = state.youStatus === "busy" ? FOREVER : state.time + between(random, 40, 90);
  if (isAtStation(agent)) {
    return;
  }
  endChat(state, agent);
  agent.watch = undefined;
  agent.status = "working";
  say(state, agent, "!", 1);
  goTo(state, agent, agent.workSpot, { kind: "work" }, true, random);
}

// Sets what your guy is up to. Busy runs him back to his station and keeps him there; idle sends him on a break that
// lasts until it changes; auto goes back to the usual loop.
export function setYouStatus(state: OfficeState, status: YouStatus, random: Random): void {
  if ((state.youStatus ?? "auto") === status) {
    return;
  }
  state.youStatus = status;
  const agent = youAgent(state);
  if (agent === undefined) {
    return;
  }
  if (status === "busy") {
    callYouBack(state, random);
  } else {
    // Idle takes his break now; auto picks the loop back up a little later.
    agent.nextBreakAt = status === "idle" ? state.time : state.time + between(random, 25, 60);
  }
}

function stepYou(state: OfficeState, agent: Agent, random: Random): void {
  if (state.time < agent.nextBreakAt) {
    return;
  }
  if (state.youStatus === "idle" && agent.status === "idle") {
    // His break goes on: on to the next thing, unless he's watching a show.
    agent.nextBreakAt = state.time + between(random, 20, 40);
    if (agent.goal?.kind !== "show" && agent.goal?.kind !== "activity" && agent.goal?.kind !== "gather") {
      pickIdleActivity(state, agent, random);
    }
    return;
  }
  if (agent.status === "working") {
    if (!isAtStation(agent)) {
      return;
    }
    agent.status = "idle";
    agent.nextBreakAt = state.time + between(random, 20, 40);
    say(state, agent, pickPhrase(BREAK_LINES, random), 1.4);
    if (!joinShow(state, agent, random) && !joinGathering(state, agent, random)) {
      pickIdleActivity(state, agent, random);
    }
    return;
  }
  if ((agent.goal?.kind === "show" && state.show !== undefined) || (agent.goal?.kind === "gather" && state.gathering !== undefined)) {
    // You stay for the show.
    agent.nextBreakAt = state.time + 5;
    return;
  }
  endChat(state, agent);
  agent.status = "working";
  agent.nextBreakAt = state.time + between(random, 45, 100);
  say(state, agent, pickPhrase(BACK_LINES, random), 1.4);
  goTo(state, agent, agent.workSpot, { kind: "work" }, false, random);
}

// Swaps in a new floor plan after a resize, keeps desks where it can, and has everyone pick up again from where they are.
export function relayoutOffice(state: OfficeState, layout: OfficeLayout, random: Random): void {
  // A new room ends a gathering: the desks it pushed aside are in the new layout's spots already.
  endGathering(state, random, false);
  applyLayout(state, layout, random, true);
}

function applyLayout(state: OfficeState, layout: OfficeLayout, random: Random, followDesks: boolean): void {
  // The room only grew or shrank around the desks: everyone and everything moves with them, so the guys at their
  // desks stay put as the view is resized.
  const shift = followDesks ? layoutShift(state.layout, layout) : undefined;
  if (shift !== undefined) {
    shiftOffice(state, shift);
  }
  // What was standing before: the guys who had their desks, and desks still waiting to be hauled out.
  const hadDesk = new Set(state.agents.filter((agent) => isSession(agent) && !agent.leaving && hasDesk(state, agent)).map((agent) => agent.id));
  const wantedBefore = new Set(state.agents.flatMap((agent) => (isSession(agent) && !agent.leaving && agent.deskIndex !== undefined ? [agent.deskIndex] : [])));
  const leftovers = [...state.placed].filter(([index]) => !wantedBefore.has(index));
  const activitiesBefore = state.activities ?? [];
  state.activities = [];
  state.activityOrders = [];
  clearDeskSpots(layout);
  state.layout = layout;
  state.placed = new Map();
  for (const agent of state.agents) {
    const here = { x: Math.round(agent.x), y: Math.round(agent.y) };
    if (!isWalkable(layout, here)) {
      const moved = nearestWalkable(layout, here);
      agent.x = moved.x;
      agent.y = moved.y;
    }
    agent.path = [];
    agent.target = undefined;
    if (agent.deskIndex !== undefined && agent.deskIndex >= layout.desks.length) {
      agent.deskIndex = undefined;
    }
  }
  assignWorkSpots(state);
  // The room changed shape. Desks that were standing move with their guys, and leftovers waiting to go out move to
  // empty spots; the crew still brings in or hauls out the rest, carrying on with what they had in hand.
  for (const agent of state.agents) {
    if (agent.deskIndex !== undefined && isSession(agent) && !agent.leaving && hadDesk.has(agent.id)) {
      placeDesk(state, agent.deskIndex, agent.seed);
    }
  }
  const wanted = new Set(state.agents.flatMap((agent) => (isSession(agent) && !agent.leaving && agent.deskIndex !== undefined ? [agent.deskIndex] : [])));
  const emptySpots = layout.desks.map((_, index) => index).filter((index) => !wanted.has(index) && !state.placed.has(index));
  const movedLeftovers = new Map<number, number>();
  for (const [oldIndex, seed] of leftovers) {
    const index = emptySpots.shift();
    if (index === undefined) {
      break;
    }
    placeDesk(state, index, seed);
    movedLeftovers.set(oldIndex, index);
  }
  // Activities stay at their spot if it's still free, or move to another; one with no room left is gone.
  for (const activity of activitiesBefore) {
    const index = activityFitsAt(state, activity.kind, activity.index, undefined) ? activity.index : pickActivitySpot(state, activity.kind, undefined);
    if (index !== undefined) {
      standActivity(state, { ...activity, index, endsAt: undefined });
    }
  }
  for (const agent of state.agents) {
    if (agent.crew !== undefined) {
      remapCrewJob(state, agent.crew, movedLeftovers);
    }
  }
  // The show goes on if its stage is still open floor; otherwise it's over.
  const show = state.show;
  if (show !== undefined && !show.spots.every((spot) => layout.tiles[spot.y]?.[spot.x] === "floor" && spot.y >= 1)) {
    endShow(state, random);
  }
  // The mess stays where there's still floor for it.
  if (state.invasion !== undefined) {
    state.invasion.debris = state.invasion.debris.filter((piece) => layout.tiles[piece.y]?.[piece.x] === "floor");
  }
  for (const agent of state.agents) {
    if (agent.crew !== undefined) {
      crewDecide(state, agent, random);
    } else if (agent.leaving) {
      leave(state, agent);
    } else if (!isAddressing(agent)) {
      // A visitor mid-speech keeps talking from where he stands; one still walking in gives up (stepVisitor).
      decide(state, agent, random);
    }
  }
}

// How far the desks moved from one layout to the next, when they all moved the same way and none came or went.
export function layoutShift(before: OfficeLayout, after: OfficeLayout): Point | undefined {
  if (before.desks.length === 0 || before.desks.length !== after.desks.length || (before.station === undefined) !== (after.station === undefined)) {
    return undefined;
  }
  const dx = after.desks[0].desk.x - before.desks[0].desk.x;
  const dy = after.desks[0].desk.y - before.desks[0].desk.y;
  if (dx === 0 && dy === 0) {
    return undefined;
  }
  const moved = (from: Point, to: Point) => to.x - from.x === dx && to.y - from.y === dy;
  const allMoved = before.desks.every((desk, index) => moved(desk.desk, after.desks[index].desk)) &&
    (before.station === undefined || after.station === undefined || moved(before.station.desk, after.station.desk));
  return allMoved ? { x: dx, y: dy } : undefined;
}

function shiftOffice(state: OfficeState, by: Point): void {
  // Points can be shared (the stage is one of the show's spots, guys share the door as a work spot): each moves once.
  const moved = new Set<Point>();
  const move = (point: Point) => {
    if (!moved.has(point)) {
      moved.add(point);
      point.x += by.x;
      point.y += by.y;
    }
  };
  for (const agent of state.agents) {
    agent.x += by.x;
    agent.y += by.y;
    agent.path.forEach(move);
    if (agent.target !== undefined) {
      move(agent.target);
    }
    move(agent.workSpot);
    if (agent.performer !== undefined) {
      move(agent.performer.spot);
    }
    if (agent.strike !== undefined) {
      move(agent.strike.at);
    }
  }
  if (state.show !== undefined) {
    move(state.show.stage);
    state.show.spots.forEach(move);
  }
  const invasion = state.invasion;
  if (invasion !== undefined) {
    [...invasion.debris, ...invasion.hits, ...invasion.puffs].forEach(move);
  }
}

export function stepOffice(state: OfficeState, seconds: number, random: Random): void {
  const dt = Math.max(0, Math.min(seconds, 0.25));
  state.time += dt;
  manageActivities(state, random);
  manageCrew(state, random);
  stepActivities(state, random);
  stepShow(state, random);
  stepGathering(state, random);
  stepInvasion(state, random);
  for (const agent of [...state.agents]) {
    if (agent.bubble !== undefined && state.time >= agent.bubble.until) {
      agent.bubble = undefined;
    }
    if (agent.watch !== undefined && (state.time >= agent.watch.until || agent.status === "working" || agent.leaving)) {
      agent.watch = undefined;
    }
    if (agent.watch !== undefined) {
      continue;
    }
    if (agent.you && agent.scare === undefined) {
      stepYou(state, agent, random);
    }
    if (isAddressing(agent) && agent.path.length === 0) {
      stepVisitor(state, agent, random);
      continue;
    }
    if (agent.visitor !== undefined && !agent.leaving && agent.path.length === 0 && agent.scare === undefined) {
      stepHangout(state, agent, random);
    }
    if (agent.path.length > 0) {
      move(agent, dt);
      if (agent.path.length === 0) {
        arrive(state, agent, random);
      }
      continue;
    }
    const visited = agent.goal?.kind === "visit" ? visitedAgent(state, agent) : undefined;
    if (agent.mode === "chat" && (agent.goal?.kind === "visit" ? visited === undefined : !chatPartnerOf(state, agent))) {
      agent.modeUntil = state.time;
    }
    if (agent.mode === "chat" && state.time >= agent.nextBubbleAt && talkOf(state) > 0) {
      // At a busy guy's desk, he answers over his shoulder about half the time.
      const speaker = visited !== undefined && visited.bubble === undefined && random() < 0.45 ? visited : agent;
      const listener = speaker === agent ? visited ?? chatPartnerOf(state, agent) : agent;
      const line = chatLine(state, speaker, listener, random);
      say(state, speaker, line, line.length > 4 ? lineSeconds(line) : between(random, 1, 1.8));
      agent.nextBubbleAt = state.time + (between(random, 1.6, 3.4) + (line.length > 4 ? 1.2 : 0)) * Math.max(1, 1 / Math.sqrt(talkOf(state)));
    }
    if (agent.goal?.kind === "waitDesk" && agent.mode === "wait") {
      if (hasDesk(state, agent)) {
        say(state, agent, pickPhrase(THANKS_LINES, random), 1.4);
        decide(state, agent, random);
        continue;
      }
      if (state.time >= agent.nextBubbleAt) {
        say(state, agent, pickPhrase(WAIT_LINES, random), 1.4);
        agent.nextBubbleAt = state.time + between(random, 4, 9);
      }
    }
    if (agent.mode === "watch") {
      stepWatcher(state, agent, random);
    }
    if (agent.mode === "gather") {
      stepGatherer(state, agent, random);
    }
    if (agent.crew?.phase === "help" && state.time >= agent.nextBubbleAt) {
      say(state, agent, pickPhrase(CREW_HELP_LINES, random), 1.4);
      agent.nextBubbleAt = state.time + between(random, 2.5, 5);
    }
    if (agent.mode === "type" && state.time >= agent.nextBubbleAt) {
      if (random() < Math.min(0.9, 0.35 * talkOf(state))) {
        say(state, agent, pickPhrase(TYPING_LINES, random), 1.4);
      }
      agent.nextBubbleAt = state.time + between(random, 10, 25);
    }
    const muse = museMode(agent);
    if (muse !== undefined && agent.bubble === undefined && state.time >= agent.nextBubbleAt) {
      if (random() < Math.min(0.9, 0.3 * talkOf(state))) {
        say(state, agent, pickPhrase(MUSE_LINES[muse], random), 1.4);
      }
      agent.nextBubbleAt = state.time + between(random, 8, 20);
    }
    if (state.time >= agent.modeUntil) {
      decide(state, agent, random);
    }
  }
}

// How often a free guy picks a nap among his idle choices, how long one lasts, and the share napping when the room opens.
const NAP_WEIGHT = 1;
const NAP_SECONDS = [25, 75] as const;
const OPEN_NAP_CHANCE = 0.25;

const SEATED_MODES: ReadonlySet<AgentMode> = new Set<AgentMode>(["type", "sit", "couch", "stretch", "sleep"]);

// A critter is passing at (x, y) in tiles. Idle guys within reach who haven't reacted to it yet (ids in reacted)
// stop, turn to look, and say a line; a guy on the couch just says it. Returns who reacted.
export const CRITTER_REACH = { x: 3, y: 2 };

export function reactToCritter(state: OfficeState, at: { x: number; y: number }, lines: readonly string[], reacted: ReadonlySet<string>, random: Random): string[] {
  const watchers: string[] = [];
  for (const agent of state.agents) {
    if (reacted.has(agent.id) || agent.status === "working" || agent.mode === "sleep" || agent.leaving || agent.bubble !== undefined || inInvasion(agent)) {
      continue;
    }
    const dx = at.x - agent.x;
    const dy = at.y - agent.y;
    if (Math.abs(dx) > CRITTER_REACH.x || Math.abs(dy) > CRITTER_REACH.y) {
      continue;
    }
    watchers.push(agent.id);
    if (random() < 0.25) {
      continue;
    }
    say(state, agent, lines[Math.floor(random() * lines.length) % lines.length], 1.6);
    if (!SEATED_MODES.has(agent.mode) && agent.mode !== "play") {
      const facing: Facing = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
      agent.watch = { facing, until: state.time + between(random, 1.2, 2) };
    }
  }
  return watchers;
}

export interface AgentPose {
  pose: Pose;
  facing: Facing;
  frame: number;
  // Seated guys draw a little lower, into their chair.
  seated: boolean;
  // Pixels to draw him off his tile: up on a trampoline bounce, side to side in the massage chair.
  offset?: { x: number; y: number };
  // Knocked down: the view lays the frame on its side.
  lying?: boolean;
  // Lying down on purpose (savasana, stop drop and roll): no dizzy stars.
  resting?: boolean;
}

// How fast each pose's frames go at an activity.
const ACTIVITY_FRAME_RATE: Partial<Record<Pose, number>> = { build: 3, punch: 2.5, lift: 0.7, yoga: 0.25, walk: 7, type: 5, cheer: 3, talk: 4 };

function activityPose(agent: Agent, kind: ActivityKindId, time: number, phase: number): AgentPose {
  const spec = ACTIVITIES[kind];
  if (agent.mode === "wait") {
    return { pose: agent.bubble === undefined ? "stand" : "talk", facing: agent.facing, frame: Math.floor(time * 5), seated: false };
  }
  const frame = Math.floor(time * (ACTIVITY_FRAME_RATE[spec.pose] ?? 1) + phase * 2);
  const offset = spec.hop === true
    ? { x: 0, y: -Math.round(Math.abs(Math.sin(time * 4 + phase * 6)) * 5) }
    : spec.shake === true ? { x: Math.floor(time * 14) % 2, y: 0 } : undefined;
  return { pose: spec.pose, facing: agent.facing, frame, seated: spec.seated === true, ...(offset === undefined ? {} : { offset }) };
}

// gathering: the room's group gathering, if one is on (state.gathering).
export function agentPose(agent: Agent, time: number, gatheringNow?: GatheringState): AgentPose {
  const phase = (agent.id.length * 0.37) % 1;
  const invaded = invasionPose(agent, time, phase);
  if (invaded !== undefined) {
    return invaded;
  }
  if (agent.path.length === 0 && agent.mode === "perform" && agent.performer !== undefined) {
    return performerPose(agent, agent.performer, time);
  }
  if (agent.path.length === 0 && agent.mode === "gather" && gatheringNow !== undefined) {
    return gatherPose(agent, gatheringNow, time, phase);
  }
  if (agent.path.length === 0 && agent.mode === "watch") {
    if (time < agent.cheerUntil) {
      return { pose: "cheer", facing: agent.facing, frame: Math.floor(time * 4 + phase * 2), seated: false };
    }
    if (agent.snack !== undefined && agent.bubble === undefined) {
      return { pose: "eat", facing: agent.facing, frame: Math.floor(time * 1.2 + phase * 2), seated: false };
    }
    return { pose: agent.bubble === undefined ? "stand" : "talk", facing: agent.facing, frame: Math.floor(time * 5), seated: false };
  }
  if (agent.watch !== undefined && time < agent.watch.until && !SEATED_MODES.has(agent.mode)) {
    return { pose: "stand", facing: agent.watch.facing, frame: 0, seated: false };
  }
  if (agent.path.length === 0 && agent.goal?.kind === "activity" && (agent.mode === "play" || agent.mode === "wait")) {
    return activityPose(agent, agent.goal.activity, time, phase);
  }
  const carrying = agent.crew !== undefined && (agent.crew.carrying !== undefined || agent.crew.chair);
  if (agent.path.length > 0) {
    return { pose: carrying ? "carry" : "walk", facing: agent.facing, frame: Math.floor(time * (agent.running ? 12 : 7)), seated: false };
  }
  if (carrying && agent.mode !== "build") {
    return { pose: "carry", facing: agent.facing, frame: 0, seated: false };
  }
  switch (agent.mode) {
    case "build":
      return { pose: "build", facing: agent.facing, frame: Math.floor(time * 4), seated: false };
    case "type":
      return { pose: "type", facing: agent.facing, frame: Math.floor(time * 6 + phase * 2), seated: true };
    case "sit":
    case "couch":
      return { pose: "sit", facing: agent.facing, frame: 0, seated: true };
    case "stretch":
      return { pose: "stretch", facing: agent.facing, frame: 0, seated: true };
    case "sleep":
      // A slow breath: about four seconds in and out.
      return { pose: "sleep", facing: agent.facing, frame: Math.floor(time / 2 + phase * 2), seated: true };
    case "drink":
      return { pose: "drink", facing: agent.facing, frame: 0, seated: false };
    case "chat":
    case "address":
      return { pose: "talk", facing: agent.facing, frame: agent.bubble === undefined ? 0 : Math.floor(time * 5), seated: false };
    default:
      return { pose: "stand", facing: agent.facing, frame: 0, seated: false };
  }
}

export function officeCounts(state: OfficeState): { working: number; idle: number; asleep: number } {
  const present = state.agents.filter((agent) => !agent.leaving && isSession(agent));
  return {
    working: present.filter((agent) => agent.status === "working").length,
    idle: present.filter((agent) => agent.status === "idle").length,
    asleep: present.filter((agent) => agent.status === "asleep").length,
  };
}

function newAgent(state: OfficeState, input: AgentInput, random: Random): Agent {
  const door = state.layout.door;
  return {
    id: input.id,
    seed: input.seed,
    title: input.title,
    status: input.status,
    x: door.x,
    y: door.y,
    facing: "down",
    path: [],
    running: false,
    goal: undefined,
    target: undefined,
    mode: "loiter",
    modeUntil: state.time,
    deskIndex: undefined,
    workSpot: door,
    bubble: undefined,
    nextBubbleAt: state.time + between(random, 2, 6),
    leaving: false,
    you: false,
    nextBreakAt: FOREVER,
    watch: undefined,
    visitor: undefined,
    crew: undefined,
    performer: undefined,
    cheerUntil: 0,
  };
}

// Keeps each guy's desk if it still exists, hands free desks out in order, then couch seats, then open floor.
function assignWorkSpots(state: OfficeState): void {
  const { desks, couchSeats } = state.layout;
  for (const agent of state.agents) {
    if (agent.you) {
      agent.deskIndex = undefined;
      agent.workSpot = state.layout.station?.seat ?? state.layout.door;
    } else if (!isSession(agent)) {
      agent.deskIndex = undefined;
      agent.workSpot = state.layout.door;
    }
  }
  const present = state.agents.filter((agent) => !agent.leaving && isSession(agent));
  const takenDesks = new Set<number>();
  for (const agent of present) {
    if (agent.deskIndex !== undefined && !takenDesks.has(agent.deskIndex) && agent.deskIndex < desks.length) {
      takenDesks.add(agent.deskIndex);
    } else {
      agent.deskIndex = undefined;
    }
  }
  // A desk still standing from a guy who left goes to the next one in, before the crew brings a new one.
  // Spots with an activity on them, or one on its way, go last: the crew has to take it out first.
  const covered = activityCovered(state);
  const freeDesks = desks.map((_, index) => index).filter((index) => !takenDesks.has(index))
    .sort((first, second) => Number(state.placed.has(second)) - Number(state.placed.has(first)) ||
      Number(covered.has(first)) - Number(covered.has(second)) || first - second);
  const overflowSpots = [...couchSeats, ...openFloorTiles(state.layout).filter((tile) => tile.y >= state.layout.rows - 2)];
  let overflowIndex = 0;
  for (const agent of present) {
    if (agent.deskIndex === undefined && freeDesks.length > 0) {
      agent.deskIndex = freeDesks.shift();
    }
    if (agent.deskIndex !== undefined) {
      agent.workSpot = desks[agent.deskIndex].seat;
    } else {
      agent.workSpot = overflowSpots[overflowIndex++ % Math.max(1, overflowSpots.length)] ?? state.layout.door;
    }
  }
}

// Idle and asleep (a suspended session) look the same in the room: both do idle things, naps among them. Going
// between the two changes nothing he's doing.
function onStatusChange(state: OfficeState, agent: Agent, previous: AgentStatus, random: Random): void {
  // In an invasion he has other things on his mind; he picks his status back up after.
  if ((agent.status !== "working" && previous !== "working") || agent.scare !== undefined) {
    return;
  }
  endChat(state, agent);
  if (agent.mode === "sleep") {
    say(state, agent, pickPhrase(WAKE_TO_WORK_LINES, random), 1.6);
  }
  if (agent.status === "working") {
    const atWork = agent.path.length === 0 && isAt(agent, agent.workSpot);
    if (!atWork) {
      say(state, agent, pickPhrase(RUSH_LINES, random), 1.2);
    }
    goTo(state, agent, agent.workSpot, { kind: "work" }, !atWork, random);
    return;
  }
  // Just went idle: lean back at the desk for a bit before getting up.
  if (agent.path.length === 0 && isAt(agent, agent.workSpot)) {
    agent.mode = agent.deskIndex === undefined ? "couch" : "sit";
    agent.modeUntil = state.time + between(random, 3, 8);
  } else if (agent.path.length > 0) {
    // Still on the way: finish the step he's on, then look around and pick something else.
    agent.path = agent.path.slice(0, 1);
    agent.goal = undefined;
    agent.target = agent.path[0];
  } else {
    agent.modeUntil = state.time;
  }
}

function decide(state: OfficeState, agent: Agent, random: Random): void {
  agent.running = false;
  if (agent.crew !== undefined) {
    crewDecide(state, agent, random);
    return;
  }
  if (agent.leaving) {
    leave(state, agent);
    return;
  }
  if (inInvasion(agent)) {
    invasionDecide(state, agent, random);
    return;
  }
  if (agent.performer !== undefined) {
    performerDecide(state, agent, random);
    return;
  }
  if (agent.gatherHost === true) {
    hostDecide(state, agent, random);
    return;
  }
  if (agent.visitor !== undefined) {
    if (isAddressing(agent) || state.time >= agent.visitor.stayUntil) {
      visitorLeaves(state, agent);
      return;
    }
    endChat(state, agent);
    if (!joinShow(state, agent, random)) {
      pickIdleActivity(state, agent, random);
    }
    return;
  }
  if (agent.status !== "working" && (joinShow(state, agent, random) || joinGathering(state, agent, random))) {
    return;
  }
  if (agent.status === "working") {
    goTo(state, agent, agent.workSpot, { kind: "work" }, false, random);
    return;
  }
  endChat(state, agent);
  pickIdleActivity(state, agent, random);
}

function pickIdleActivity(state: OfficeState, agent: Agent, random: Random): void {
  if (agent.mode === "sleep" && random() < 0.5 * Math.min(1, talkOf(state))) {
    say(state, agent, pickPhrase(WAKE_IDLE_LINES, random), 1.6);
  }
  const atDesk = hasDesk(state, agent) && agent.path.length === 0 && isAt(agent, agent.workSpot);
  const freeProps = state.layout.props
    .map((prop, propIndex) => ({ prop, propIndex }))
    .filter(({ prop }) => prop.stand !== undefined && !isTargeted(state, agent, prop.stand));
  const freeCouch = state.layout.couchSeats.filter((seat) => !isTargeted(state, agent, seat) && !isWorkSpotOfOther(state, agent, seat));
  const partners = state.agents.filter((other) => other !== agent && canChat(other));
  const options: { weight: number; run: () => void }[] = [
    { weight: 2, run: () => wander(state, agent, random) },
  ];
  if (hasDesk(state, agent) && !atDesk) {
    options.push({ weight: 2, run: () => goTo(state, agent, agent.workSpot, { kind: "desk" }, false, random) });
  }
  if (atDesk) {
    options.push({ weight: 1, run: () => setMode(state, agent, "stretch", between(random, 1.5, 2.5)) });
    options.push({ weight: 1, run: () => setMode(state, agent, "sit", between(random, 4, 9)) });
  }
  if (freeProps.length > 0) {
    options.push({
      weight: 3,
      run: () => {
        const { prop, propIndex } = freeProps[Math.floor(random() * freeProps.length)];
        goTo(state, agent, prop.stand as Point, { kind: "prop", propIndex }, false, random);
      },
    });
  }
  if (freeCouch.length > 0) {
    options.push({ weight: 1, run: () => goTo(state, agent, freeCouch[Math.floor(random() * freeCouch.length)], { kind: "couch" }, false, random) });
  }
  if (!agent.you && agent.visitor === undefined && agent.mode !== "sleep" && (hasDesk(state, agent) || agent.deskIndex === undefined)) {
    // Now and then he naps at his desk (or his couch seat, with no desk), then gets up again.
    options.push({ weight: NAP_WEIGHT, run: () => goTo(state, agent, agent.workSpot, { kind: "sleep" }, false, random) });
  }
  const games = activityChoices(state, agent, partners);
  if (games.length > 0) {
    options.push({ weight: agent.you ? 3 : 4, run: () => startActivity(state, agent, games[Math.floor(random() * games.length)], random) });
  }
  if (partners.length > 0 && talkOf(state) > 0) {
    options.push({ weight: (agent.you ? 6 : 3) * talkOf(state), run: () => startChat(state, agent, partners[Math.floor(random() * partners.length)], random) });
  }
  if (agent.you || agent.visitor !== undefined) {
    const visits = state.agents
      .filter((other) => other !== agent && other.status === "working" && other.deskIndex !== undefined && other.mode === "type" && other.path.length === 0)
      .map((other) => ({ other, spot: { x: other.workSpot.x, y: other.workSpot.y + 1 } }))
      .filter(({ spot }) => state.layout.tiles[spot.y]?.[spot.x] === "floor" && !isTargeted(state, agent, spot));
    if (visits.length > 0) {
      // Bosses love to loom.
      options.push({
        weight: agent.you ? 6 : agent.visitor?.boss === true ? 4 : 2,
        run: () => {
          const { other, spot } = visits[Math.floor(random() * visits.length)];
          goTo(state, agent, spot, { kind: "visit", agentId: other.id }, false, random);
        },
      });
    }
  }
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let roll = random() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll < 0) {
      option.run();
      return;
    }
  }
  options[options.length - 1].run();
}

function canChat(agent: Agent): boolean {
  return !agent.leaving && agent.status !== "working" && agent.mode !== "sleep" && agent.performer === undefined && !inInvasion(agent) && agent.goal?.kind !== "chat" && agent.goal?.kind !== "show" &&
    agent.goal?.kind !== "activity" && agent.goal?.kind !== "gather" && agent.crew === undefined && agent.gatherHost !== true &&
    agent.mode !== "chat" && agent.mode !== "wait" && agent.mode !== "watch" && agent.mode !== "gather";
}

// Picks two open floor tiles side by side and sends both guys there.
function startChat(state: OfficeState, agent: Agent, partner: Agent, random: Random): void {
  const pairs = openFloorTiles(state.layout).filter((tile) =>
    state.layout.tiles[tile.y][tile.x + 1] === "floor" &&
    !isTargeted(state, agent, tile) && !isTargeted(state, partner, { x: tile.x + 1, y: tile.y }),
  );
  if (pairs.length === 0) {
    wander(state, agent, random);
    return;
  }
  const left = pairs[Math.floor(random() * pairs.length)];
  goTo(state, agent, left, { kind: "chat", partnerId: partner.id }, false, random);
  goTo(state, partner, { x: left.x + 1, y: left.y }, { kind: "chat", partnerId: agent.id }, false, random);
}

function wander(state: OfficeState, agent: Agent, random: Random): void {
  const open = openFloorTiles(state.layout).filter((tile) => !isTargeted(state, agent, tile) && tile.y > 0);
  if (open.length === 0) {
    setMode(state, agent, "loiter", between(random, 2, 4));
    return;
  }
  goTo(state, agent, open[Math.floor(random() * open.length)], { kind: "wander" }, false, random);
}

function leave(state: OfficeState, agent: Agent): void {
  endChat(state, agent);
  // A guy whose session ends in an invasion gets up and goes.
  if (agent.scare !== undefined) {
    agent.scare = undefined;
    agent.variant = undefined;
    agent.speed = undefined;
  }
  agent.strike = undefined;
  agent.leaving = true;
  agent.deskIndex = undefined;
  const path = findPath(state.layout, here(agent), state.layout.door);
  if (path === undefined || path.length === 0) {
    removeAgent(state, agent);
    return;
  }
  agent.goal = { kind: "door" };
  agent.target = state.layout.door;
  agent.path = path;
  agent.mode = "walk";
  agent.running = false;
}

function goTo(state: OfficeState, agent: Agent, target: Point, goal: AgentGoal, running: boolean, random: Random): void {
  // No desk yet: wait beside its spot instead of sitting on air.
  if ((goal.kind === "work" || goal.kind === "sleep" || goal.kind === "desk") && agent.deskIndex !== undefined && !hasDesk(state, agent)) {
    goal = { kind: "waitDesk" };
    target = deskWaitSpot(state, agent);
  }
  agent.goal = goal;
  agent.target = target;
  agent.running = running;
  const path = findPath(state.layout, here(agent), target);
  if (path === undefined) {
    // Boxed in after a relayout: step to the nearest open tile and try again soon.
    const freed = nearestWalkable(state.layout, here(agent));
    agent.x = freed.x;
    agent.y = freed.y;
    agent.path = [];
    agent.goal = undefined;
    agent.target = undefined;
    setMode(state, agent, "loiter", 0.5);
    return;
  }
  agent.path = path;
  agent.mode = "walk";
  if (path.length === 0) {
    arrive(state, agent, random);
  }
}

function move(agent: Agent, dt: number): void {
  let budget = (agent.speed ?? (agent.running ? RUN_SPEED : WALK_SPEED)) * dt;
  while (budget > 0 && agent.path.length > 0) {
    const next = agent.path[0];
    const dx = next.x - agent.x;
    const dy = next.y - agent.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0.001) {
      agent.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    }
    if (distance <= budget) {
      agent.x = next.x;
      agent.y = next.y;
      agent.path.shift();
      budget -= distance;
    } else {
      agent.x += (dx / distance) * budget;
      agent.y += (dy / distance) * budget;
      budget = 0;
    }
  }
}

function arrive(state: OfficeState, agent: Agent, random: Random): void {
  const goal = agent.goal;
  agent.running = false;
  if (goal?.kind !== "door" && inInvasion(agent)) {
    invasionArrive(state, agent, random);
    return;
  }
  switch (goal?.kind) {
    case "work":
      agent.facing = "up";
      if (agent.status !== "working") {
        setMode(state, agent, agent.deskIndex === undefined ? "couch" : "sit", between(random, 3, 8));
        return;
      }
      setMode(state, agent, "type", FOREVER);
      agent.nextBubbleAt = state.time + between(random, 6, 20);
      return;
    case "sleep":
      agent.facing = "up";
      if (agent.status === "working") {
        setMode(state, agent, "loiter", 0.5);
        return;
      }
      if (random() < 0.5 * Math.min(1, talkOf(state))) {
        say(state, agent, pickPhrase(SLEEP_LINES, random), 1.4);
      }
      setMode(state, agent, "sleep", between(random, NAP_SECONDS[0], NAP_SECONDS[1]));
      return;
    case "desk":
      agent.facing = "up";
      setMode(state, agent, "sit", between(random, 4, 10));
      return;
    case "prop": {
      const prop = state.layout.props[goal.propIndex];
      agent.facing = "down";
      setMode(state, agent, prop !== undefined && DRINK_PROPS.has(prop.kind) ? "drink" : "loiter", between(random, 4, 9));
      return;
    }
    case "couch":
      agent.facing = "up";
      setMode(state, agent, "couch", between(random, 8, 15));
      return;
    case "chat": {
      const partner = state.agents.find((other) => other.id === goal.partnerId);
      if (partner === undefined || partner.goal?.kind !== "chat" || partner.goal.partnerId !== agent.id) {
        setMode(state, agent, "loiter", between(random, 1, 3));
        return;
      }
      if (partner.mode === "wait" && partner.path.length === 0) {
        const length = between(random, 6, 12);
        agent.facing = partner.x < agent.x ? "left" : "right";
        partner.facing = agent.x < partner.x ? "left" : "right";
        setMode(state, agent, "chat", length);
        setMode(state, partner, "chat", length);
        agent.nextBubbleAt = state.time + between(random, 0.2, 0.8);
        partner.nextBubbleAt = state.time + between(random, 1.2, 2);
        return;
      }
      agent.facing = partner.x < agent.x ? "left" : "right";
      setMode(state, agent, "wait", CHAT_WAIT_SECONDS);
      return;
    }
    case "visit": {
      if (visitedAgent(state, agent) === undefined) {
        setMode(state, agent, "loiter", between(random, 1, 3));
        return;
      }
      agent.facing = "up";
      setMode(state, agent, "chat", between(random, 6, 12));
      agent.nextBubbleAt = state.time + between(random, 0.2, 0.8);
      return;
    }
    case "waitDesk":
      agent.facing = "up";
      setMode(state, agent, "wait", FOREVER);
      agent.nextBubbleAt = state.time + between(random, 1, 3);
      return;
    case "crew":
      crewArrive(state, agent, random);
      return;
    case "activity":
      arriveAtActivity(state, agent, goal, random);
      return;
    case "perform":
      agent.facing = "down";
      setMode(state, agent, state.show === undefined ? "loiter" : "perform", state.show === undefined ? 0.3 : FOREVER);
      return;
    case "show": {
      const show = state.show;
      if (show === undefined || show.phase === "bows") {
        setMode(state, agent, "loiter", between(random, 0.5, 1.5));
        return;
      }
      agent.facing = facingToward(agent, show.stage);
      setMode(state, agent, "watch", FOREVER);
      agent.nextBubbleAt = state.time + between(random, 2, 6);
      agent.snack = show.food.length > 0 ? show.food[Math.floor(random() * show.food.length)] : undefined;
      if (agent.snack !== undefined && random() < 0.5) {
        say(state, agent, random() < 0.5 ? "thanks!" : "ooh!", 1.2);
      }
      return;
    }
    case "gather":
      arriveAtGathering(state, agent, random);
      return;
    case "address":
      agent.facing = "down";
      setMode(state, agent, "address", FOREVER);
      agent.nextBubbleAt = state.time + 0.3;
      return;
    case "door":
      removeAgent(state, agent);
      return;
    default:
      agent.facing = (["down", "left", "right"] as const)[Math.floor(random() * 3)];
      setMode(state, agent, "loiter", between(random, 2, 5));
  }
}

function setMode(state: OfficeState, agent: Agent, mode: AgentMode, seconds: number): void {
  agent.mode = mode;
  agent.modeUntil = state.time + seconds;
  agent.path = [];
}

function chatPartnerOf(state: OfficeState, agent: Agent): Agent | undefined {
  if (agent.goal?.kind !== "chat") {
    return undefined;
  }
  const partnerId = agent.goal.partnerId;
  const partner = state.agents.find((other) => other.id === partnerId);
  return partner?.mode === "chat" && partner.goal?.kind === "chat" && partner.goal.partnerId === agent.id ? partner : undefined;
}

// The busy guy you're visiting, while he's still at his desk working.
function visitedAgent(state: OfficeState, agent: Agent): Agent | undefined {
  if (agent.goal?.kind !== "visit") {
    return undefined;
  }
  const agentId = agent.goal.agentId;
  const other = state.agents.find((candidate) => candidate.id === agentId);
  return other !== undefined && other.status === "working" && other.path.length === 0 && isAt(other, other.workSpot) ? other : undefined;
}

// Ends this guy's chat and frees his partner to do something else next frame.
function endChat(state: OfficeState, agent: Agent): void {
  if (agent.goal?.kind !== "chat") {
    return;
  }
  const partnerId = agent.goal.partnerId;
  agent.goal = undefined;
  const partner = state.agents.find((other) => other.id === partnerId);
  if (partner !== undefined && partner.goal?.kind === "chat" && partner.goal.partnerId === agent.id) {
    partner.goal = undefined;
    partner.target = undefined;
    partner.path = [];
    partner.modeUntil = state.time;
    if (partner.mode === "chat" || partner.mode === "wait" || partner.mode === "walk") {
      partner.mode = "loiter";
    }
  }
}

// A longer line stays up long enough to read, whatever the caller asked for.
function say(state: OfficeState, agent: Agent, text: string, seconds: number): void {
  agent.bubble = { text, until: state.time + (text.length > 8 ? Math.max(seconds, lineSeconds(text)) : seconds) };
}

// What an idle session guy (or you, on a break) is doing that he might say something to nobody about.
function museMode(agent: Agent): MuseMode | undefined {
  if (agent.status === "working" || agent.visitor !== undefined || agent.crew !== undefined || agent.leaving || agent.path.length > 0) {
    return undefined;
  }
  switch (agent.mode) {
    case "drink":
    case "couch":
    case "sit":
    case "stretch":
    case "loiter":
      return agent.mode;
    default:
      return undefined;
  }
}

// A chat line: a guy owed an answer gives it, a visitor makes small talk, a guy talking to a visitor answers in
// character, and everyone else chatters, now and then opening an exchange the other guy answers on his next turn.
function chatLine(state: OfficeState, speaker: Agent, listener: Agent | undefined, random: Random): string {
  const reply = speaker.reply;
  speaker.reply = undefined;
  if (reply !== undefined && state.time < reply.until) {
    return reply.text;
  }
  const talk = speaker.visitor?.smallTalk ?? [];
  if (talk.length > 0 && random() < 0.6) {
    return talk[Math.floor(random() * talk.length)];
  }
  if (speaker.visitor === undefined && listener?.visitor !== undefined && random() < 0.6) {
    return visitorReaction(personalityOf(speaker.seed), listener.visitor.boss, false, random) ?? chatPhrase(state.layout.scene, random);
  }
  const line = random() < 0.12 ? pickExchange(random) : chatPhrase(state.layout.scene, random);
  const answer = exchangeAnswer(line);
  if (answer !== undefined && listener !== undefined && listener.visitor === undefined) {
    listener.reply = { text: answer, until: state.time + 8 };
  }
  return line;
}

function removeAgent(state: OfficeState, agent: Agent): void {
  endChat(state, agent);
  state.agents = state.agents.filter((other) => other !== agent);
}

function here(agent: Agent): Point {
  return { x: Math.round(agent.x), y: Math.round(agent.y) };
}

function isAt(agent: Agent, point: Point): boolean {
  return Math.abs(agent.x - point.x) < 0.01 && Math.abs(agent.y - point.y) < 0.01;
}

function isTargeted(state: OfficeState, self: Agent, point: Point): boolean {
  return state.agents.some((other) => other !== self && other.target !== undefined && other.target.x === point.x && other.target.y === point.y);
}

function isWorkSpotOfOther(state: OfficeState, self: Agent, point: Point): boolean {
  return state.agents.some((other) => other !== self && other.workSpot.x === point.x && other.workSpot.y === point.y);
}

// ----- The maintenance crew -----

// Works out which desks need bringing in or taking out, sends the crew in when there's work, hands out jobs, and sends
// them home when it's all done.
function manageCrew(state: OfficeState, random: Random): void {
  const wanted = new Map<number, string>();
  for (const agent of state.agents) {
    if (isSession(agent) && !agent.leaving && agent.deskIndex !== undefined) {
      wanted.set(agent.deskIndex, agent.seed);
    }
  }
  let crew = crewAgents(state);
  const deskJobs = crew.flatMap((member) => (member.crew?.job === undefined || member.crew.job.item !== undefined ? [] : [member.crew.job]));
  const claimed = new Set(deskJobs.map((job) => job.deskIndex));
  const claimedActivities = new Set(crew.flatMap((member) => (member.crew?.job?.activityId === undefined ? [] : [member.crew.job.activityId])));
  const covered = activityCovered(state);
  const jobs: CrewJob[] = [];
  // An activity on a spot a guy needs goes first, then his desk can come in.
  for (const activity of state.activities ?? []) {
    if (activity.going && !claimedActivities.has(activity.id) && activityIndexes(activity).some((index) => wanted.has(index))) {
      jobs.push({ kind: "remove", deskIndex: activity.index, seed: "", item: activity.kind, activityId: activity.id });
    }
  }
  for (const [deskIndex, seed] of wanted) {
    if (!state.placed.has(deskIndex) && !claimed.has(deskIndex) && !covered.has(deskIndex)) {
      jobs.push({ kind: "deliver", deskIndex, seed });
    }
  }
  for (const [deskIndex, seed] of state.placed) {
    if (!wanted.has(deskIndex) && !claimed.has(deskIndex)) {
      jobs.push({ kind: "remove", deskIndex, seed });
    }
  }
  for (const activity of state.activities ?? []) {
    if (activity.going && !claimedActivities.has(activity.id) && !jobs.some((job) => job.activityId === activity.id)) {
      jobs.push({ kind: "remove", deskIndex: activity.index, seed: "", item: activity.kind, activityId: activity.id });
    }
  }
  jobs.push(...(state.activityOrders ?? []));
  if (jobs.length > 0 && crew.length === 0) {
    crew = [newCrew(state, 0, random), newCrew(state, 1, random)];
    state.crewDueAt = state.time + CREW_SPACING_SECONDS;
  }
  for (const member of crew) {
    const job = jobs[0];
    const free = member.crew !== undefined && member.crew.job === undefined && (member.crew.phase === "idle" || member.crew.phase === "out" || member.crew.phase === "help");
    if (job !== undefined && free && !(member.crew?.phase === "help" && member.crew.chair)) {
      jobs.shift();
      takeOrder(state, job);
      startJob(state, member, job, random);
    }
  }
  // Desks still waiting and everyone's busy: another guy comes in for the next one.
  if (jobs.length > 0 && crew.length < MAX_CREW && state.time >= (state.crewDueAt ?? 0)) {
    state.crewDueAt = state.time + CREW_SPACING_SECONDS;
    const used = new Set(crew.map((member) => member.id));
    let number = 0;
    while (used.has(`crew-${number + 1}`)) {
      number += 1;
    }
    takeOrder(state, jobs[0]);
    startJob(state, newCrew(state, number, random), jobs[0], random);
  }
}

// An ordered activity a crew member picked up isn't waiting anymore.
function takeOrder(state: OfficeState, job: CrewJob): void {
  if (state.activityOrders !== undefined) {
    state.activityOrders = state.activityOrders.filter((order) => order !== job);
  }
}

// After a relayout: points a crew member's job at the desk's new spot, or drops a job that has no spot anymore.
function remapCrewJob(state: OfficeState, crew: CrewState, movedLeftovers: Map<number, number>): void {
  const job = crew.job;
  if (crew.phase === "help") {
    // Finds his partner again from where he stands.
    crew.phase = "idle";
  }
  if (job === undefined) {
    return;
  }
  if (crew.phase === "haul") {
    // The desk is already in his hands and headed out the door; its old spot doesn't matter.
    job.deskIndex = -1;
    return;
  }
  if (job.item !== undefined) {
    const activityId = job.activityId;
    const itemIndex = activityId !== undefined
      ? state.activities?.find((activity) => activity.id === activityId)?.index
      : pickActivitySpot(state, job.item, undefined, job);
    if (itemIndex === undefined) {
      if (crew.carrying !== undefined) {
        job.deskIndex = -1;
        crew.phase = "haul";
      } else {
        crew.job = undefined;
        crew.phase = "idle";
      }
      return;
    }
    job.deskIndex = itemIndex;
    if (crew.phase === "build") {
      crew.phase = "toSlot";
    }
    return;
  }
  const index = job.kind === "remove"
    ? movedLeftovers.get(job.deskIndex)
    : state.agents.find((other) => isSession(other) && !other.leaving && other.seed === job.seed && other.deskIndex !== undefined && !hasDesk(state, other))?.deskIndex;
  if (index === undefined) {
    if (crew.carrying !== undefined) {
      // Carrying a desk nobody has a spot for: out it goes.
      job.deskIndex = -1;
      crew.phase = "haul";
    } else {
      crew.job = undefined;
      crew.phase = "idle";
    }
    return;
  }
  job.deskIndex = index;
  if (crew.phase === "build") {
    // Walks over to the new spot and starts again there.
    crew.phase = "toSlot";
  }
}

function newCrew(state: OfficeState, index: number, random: Random): Agent {
  const agent: Agent = {
    ...newAgent(state, { id: `crew-${index + 1}`, seed: `crew|${index}`, status: "working", title: CREW_TITLE }, random),
    crew: { job: undefined, phase: "idle", carrying: undefined, chair: false },
  };
  state.agents.push(agent);
  // The second one follows a moment behind.
  setMode(state, agent, "loiter", index * 0.6);
  return agent;
}

function startJob(state: OfficeState, agent: Agent, job: CrewJob, random: Random): void {
  const crew = agent.crew as CrewState;
  crew.job = job;
  crew.chair = false;
  agent.leaving = false;
  if (job.kind === "remove") {
    crew.phase = "toSlot";
    if (job.activityId !== undefined) {
      endActivity(state, job.activityId, random, false);
    }
    say(state, agent, pickPhrase(CREW_REMOVE_LINES, random), 1.6);
    goTo(state, agent, state.layout.desks[job.deskIndex].seat, { kind: "crew" }, false, random);
    return;
  }
  crew.phase = "fetch";
  goTo(state, agent, state.layout.door, { kind: "crew" }, false, random);
}

function crewArrive(state: OfficeState, agent: Agent, random: Random): void {
  const crew = agent.crew as CrewState;
  const job = crew.job;
  switch (crew.phase) {
    case "fetch": {
      if (job === undefined) {
        crewDecide(state, agent, random);
        return;
      }
      // Picks up the desk at the door, and his partner grabs the chair if he's free.
      crew.carrying = job.item ?? job.seed;
      crew.phase = "toSlot";
      say(state, agent, pickPhrase(job.item === undefined ? CREW_START_LINES : CREW_ITEM_LINES, random), 1.6);
      goTo(state, agent, state.layout.desks[job.deskIndex].seat, { kind: "crew" }, false, random);
      if (job.item !== undefined) {
        return;
      }
      const partner = crewAgents(state).find((other) => other !== agent && other.crew?.job === undefined && other.path.length === 0 && isAt(other, state.layout.door));
      if (partner?.crew !== undefined) {
        partner.crew.chair = true;
        helpPartner(state, partner, agent, random);
      }
      return;
    }
    case "toSlot":
      agent.facing = "up";
      if (job === undefined) {
        crewDecide(state, agent, random);
        return;
      }
      crew.phase = "build";
      say(state, agent, pickPhrase(CREW_BUILD_LINES, random), 1.2);
      setMode(state, agent, "build", between(random, 1.6, 2.4));
      return;
    case "haul":
      crew.carrying = undefined;
      crew.job = undefined;
      crew.phase = "idle";
      setMode(state, agent, "loiter", 0.3);
      return;
    case "help":
      agent.facing = agent.target === undefined ? "up" : facingToward(agent, partnerSpot(state, agent) ?? agent.target);
      setMode(state, agent, "loiter", 1);
      agent.nextBubbleAt = state.time + between(random, 0.5, 1.5);
      return;
    case "out":
      removeAgent(state, agent);
      return;
    default:
      setMode(state, agent, "loiter", 0.3);
  }
}

// Called when a crew member's mode runs out: finishes setting down or taking apart a desk, keeps standing by while his
// partner works, or heads out when there's nothing left.
function crewDecide(state: OfficeState, agent: Agent, random: Random): void {
  const crew = agent.crew as CrewState;
  const job = crew.job;
  agent.running = false;
  if (crew.phase === "build" && job !== undefined && job.item !== undefined) {
    if (job.kind === "remove") {
      const activityId = job.activityId;
      const activity = state.activities?.find((candidate) => candidate.id === activityId);
      if (activity !== undefined) {
        removeActivity(state, activity);
      }
      crew.carrying = job.item;
    } else if (activityFitsAt(state, job.item, job.deskIndex, job)) {
      placeActivity(state, job.item, job.deskIndex, random);
      crew.carrying = undefined;
      crew.job = undefined;
      crew.phase = "idle";
      say(state, agent, pickPhrase(CREW_DONE_LINES, random), 1.4);
      setMode(state, agent, "loiter", 0.6);
      return;
    } else {
      say(state, agent, pickPhrase(CREW_NEVER_MIND_LINES, random), 1.4);
    }
    crew.phase = "haul";
    goTo(state, agent, state.layout.door, { kind: "crew" }, false, random);
    return;
  }
  if (crew.phase === "build" && job !== undefined) {
    if (job.kind === "remove") {
      removeDesk(state, job.deskIndex);
      crew.carrying = job.seed;
      crew.phase = "haul";
      goTo(state, agent, state.layout.door, { kind: "crew" }, false, random);
      return;
    }
    const owner = state.agents.find((other) => isSession(other) && !other.leaving && other.deskIndex === job.deskIndex);
    if (owner === undefined) {
      // Nobody needs it anymore: back out it goes.
      say(state, agent, pickPhrase(CREW_NEVER_MIND_LINES, random), 1.4);
      crew.phase = "haul";
      goTo(state, agent, state.layout.door, { kind: "crew" }, false, random);
      return;
    }
    placeDesk(state, job.deskIndex, job.seed);
    crew.carrying = undefined;
    crew.job = undefined;
    crew.phase = "idle";
    say(state, agent, pickPhrase(CREW_DONE_LINES, random), 1.4);
    for (const other of crewAgents(state)) {
      if (other.crew?.phase === "help") {
        other.crew.chair = false;
        other.crew.phase = "idle";
      }
    }
    setMode(state, agent, "loiter", 0.6);
    return;
  }
  if ((crew.phase === "toSlot" || crew.phase === "fetch" || crew.phase === "haul") && job !== undefined) {
    // Interrupted on the way (pushed aside by a desk): carry on.
    const target = crew.phase === "toSlot" ? state.layout.desks[job.deskIndex].seat : state.layout.door;
    goTo(state, agent, target, { kind: "crew" }, false, random);
    return;
  }
  if (crew.phase === "help") {
    const partner = crewAgents(state).find((other) => other !== agent && other.crew?.job !== undefined);
    if (partner !== undefined) {
      setMode(state, agent, "loiter", 1);
      return;
    }
    crew.chair = false;
    crew.phase = "idle";
  }
  if (crew.phase === "out") {
    goTo(state, agent, state.layout.door, { kind: "crew" }, false, random);
    return;
  }
  // Nothing of his own: stand by a partner who's working, or go home once both are done.
  const partner = crewAgents(state).find((other) => other !== agent && other.crew?.job !== undefined);
  if (partner !== undefined) {
    helpPartner(state, agent, partner, random);
    return;
  }
  if (crewAgents(state).some((other) => other !== agent && other.crew?.phase === "build")) {
    setMode(state, agent, "loiter", 0.5);
    return;
  }
  crew.phase = "out";
  goTo(state, agent, state.layout.door, { kind: "crew" }, false, random);
}

function partnerSpot(state: OfficeState, agent: Agent): Point | undefined {
  const partner = crewAgents(state).find((other) => other !== agent && other.crew?.job !== undefined);
  const job = partner?.crew?.job;
  return job === undefined ? undefined : state.layout.desks[job.deskIndex]?.seat;
}

// Stands on an open tile beside the spot his partner is headed for.
function helpPartner(state: OfficeState, agent: Agent, partner: Agent, random: Random): void {
  const crew = agent.crew as CrewState;
  const job = partner.crew?.job;
  const spot = job === undefined ? undefined : state.layout.desks[job.deskIndex]?.seat;
  if (spot === undefined) {
    crew.phase = "idle";
    setMode(state, agent, "loiter", 0.5);
    return;
  }
  const owner = state.agents.find((other) => isSession(other) && other.deskIndex === job?.deskIndex);
  const waitSpot = owner === undefined ? undefined : deskWaitSpot(state, owner);
  const candidates = [
    { x: spot.x - 1, y: spot.y }, { x: spot.x + 1, y: spot.y },
    { x: spot.x - 1, y: spot.y + 1 }, { x: spot.x + 1, y: spot.y + 1 }, { x: spot.x, y: spot.y + 1 },
  ].filter((tile) =>
    state.layout.tiles[tile.y]?.[tile.x] === "floor" && !isTargeted(state, agent, tile) &&
    !(waitSpot !== undefined && tile.x === waitSpot.x && tile.y === waitSpot.y) &&
    !state.layout.desks.some((desk) => desk.desk.x === tile.x && desk.desk.y === tile.y),
  );
  crew.phase = "help";
  if (candidates.length === 0) {
    setMode(state, agent, "loiter", 1);
    return;
  }
  goTo(state, agent, candidates[Math.floor(random() * candidates.length)], { kind: "crew" }, false, random);
}

function facingToward(agent: Agent, point: Point): Facing {
  const dx = point.x - agent.x;
  const dy = point.y - agent.y;
  return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
}


// ----- Activities -----

const ACTIVITY_WAIT_SECONDS = 12;
const TURN_SECONDS: readonly [number, number] = [8, 13];

function activityIndexes(activity: { kind: ActivityKindId; index: number }): number[] {
  return activityWidth(activity.kind) === 2 ? [activity.index, activity.index + 1] : [activity.index];
}

// The desk spots that have an activity on them or one on its way.
function activityCovered(state: OfficeState): Set<number> {
  const covered = new Set<number>();
  for (const activity of state.activities ?? []) {
    activityIndexes(activity).forEach((index) => covered.add(index));
  }
  for (const job of incomingActivities(state)) {
    activityIndexes({ kind: job.item as ActivityKindId, index: job.deskIndex }).forEach((index) => covered.add(index));
  }
  return covered;
}

// Activities ordered or on their way in.
function incomingActivities(state: OfficeState): CrewJob[] {
  const carried = crewAgents(state).flatMap((member) => {
    const job = member.crew?.job;
    return job !== undefined && job.item !== undefined && job.kind === "deliver" && job.deskIndex >= 0 && member.crew?.phase !== "haul" ? [job] : [];
  });
  return [...(state.activityOrders ?? []), ...carried];
}

const samePoint = (first: Point, second: Point) => first.x === second.x && first.y === second.y;

// Where an activity of this kind would go on the desk spot at index (the left of a pair), or undefined when it
// doesn't fit there: a pair needs the next spot beside it, and a table needs open floor at both ends.
export function activityFit(layout: OfficeLayout, kind: ActivityKindId, index: number): ActivityFit | undefined {
  const spec = ACTIVITIES[kind];
  const desk = layout.desks[index];
  if (desk === undefined) {
    return undefined;
  }
  const deskTile = (point: Point) => layout.desks.some((other) => samePoint(other.desk, point) || samePoint(other.seat, point));
  // Plain floor that's no desk spot, and not the tile inside the door.
  const open = (point: Point) => layout.tiles[point.y]?.[point.x] === "floor" && !deskTile(point) &&
    !samePoint(point, { x: layout.door.x, y: layout.door.y + 1 });
  const waitSpot = (seat: Point): ActivitySpot | undefined => {
    const beside = [{ x: seat.x - 1, y: seat.y }, { x: seat.x + 1, y: seat.y }].find(open);
    if (beside !== undefined) {
      return { at: beside, facing: beside.x < seat.x ? "right" : "left", wait: true };
    }
    const below = { x: seat.x, y: seat.y + 1 };
    return open(below) ? { at: below, facing: "up", wait: true } : undefined;
  };
  const withWait = (spots: ActivitySpot[], seat: Point): ActivitySpot[] => {
    const wait = spec.play === "turns" ? waitSpot(seat) : undefined;
    return wait === undefined ? spots : [...spots, wait];
  };
  if (spec.shape === "machine" || spec.shape === "floor") {
    return {
      indexes: [index],
      blocked: spec.shape === "machine" ? [desk.desk] : [],
      seats: [desk.seat],
      spots: withWait([{ at: desk.seat, facing: spec.shape === "machine" ? "up" : spec.facing ?? "down", wait: false }], desk.seat),
    };
  }
  const right = layout.desks[index + 1];
  if (right === undefined || right.desk.y !== desk.desk.y || right.desk.x !== desk.desk.x + 1) {
    return undefined;
  }
  if (spec.shape === "pair") {
    return {
      indexes: [index, index + 1],
      blocked: [desk.desk, right.desk],
      seats: [desk.seat, right.seat],
      spots: [{ at: desk.seat, facing: "up", wait: false }, { at: right.seat, facing: "up", wait: false }],
    };
  }
  const leftEnd = { x: desk.desk.x - 1, y: desk.desk.y };
  const rightEnd = { x: right.desk.x + 1, y: right.desk.y };
  if (!open(leftEnd) || !open(rightEnd)) {
    return undefined;
  }
  return {
    indexes: [index, index + 1],
    blocked: [desk.desk, right.desk],
    seats: [],
    spots: [{ at: leftEnd, facing: "right", wait: false }, { at: rightEnd, facing: "left", wait: false }],
  };
}

function fitTiles(fit: ActivityFit): Point[] {
  return [...fit.blocked, ...fit.seats, ...fit.spots.map((spot) => spot.at)];
}

// Whether this kind can go at index now: its spots free of desks, guys' spots, other activities (standing or on
// their way, except the one asking: by its id, or its own crew job), and the show's stage.
function activityFitsAt(state: OfficeState, kind: ActivityKindId, index: number, ignore: string | CrewJob | undefined): boolean {
  const fit = activityFit(state.layout, kind, index);
  if (fit === undefined) {
    return false;
  }
  const wanted = new Set(state.agents.flatMap((agent) => (isSession(agent) && !agent.leaving && agent.deskIndex !== undefined ? [agent.deskIndex] : [])));
  if (fit.indexes.some((spot) => wanted.has(spot) || state.placed.has(spot))) {
    return false;
  }
  const taken = new Set<string>();
  const others: { kind: ActivityKindId; index: number }[] = [
    ...(state.activities ?? []).filter((activity) => activity.id !== ignore),
    ...incomingActivities(state).filter((job) => job !== ignore).map((job) => ({ kind: job.item as ActivityKindId, index: job.deskIndex })),
  ];
  for (const other of others) {
    const otherFit = activityFit(state.layout, other.kind, other.index);
    otherFit?.indexes.forEach((spot) => taken.add(`i${spot}`));
    if (otherFit !== undefined) {
      fitTiles(otherFit).forEach((point) => taken.add(`${point.x},${point.y}`));
    }
  }
  if (fit.indexes.some((spot) => taken.has(`i${spot}`)) || fitTiles(fit).some((point) => taken.has(`${point.x},${point.y}`))) {
    return false;
  }
  const show = state.show;
  if (show !== undefined && fitTiles(fit).some((point) => show.spots.some((spot) => samePoint(spot, point)))) {
    return false;
  }
  // Nobody's chair is on it.
  return !fit.spots.some((spot) => state.agents.some((agent) => isSession(agent) && samePoint(agent.workSpot, spot.at)));
}

// A free spot for this kind, toward the back of the room's desk order (newcomers take desks from the front), with a
// little shuffle.
function pickActivitySpot(state: OfficeState, kind: ActivityKindId, random: Random | undefined, ignore?: CrewJob): number | undefined {
  const fitting = state.layout.desks.map((_, index) => index).filter((index) => activityFitsAt(state, kind, index, ignore)).reverse();
  if (fitting.length === 0) {
    return undefined;
  }
  return fitting[random === undefined ? 0 : Math.floor(random() * Math.min(3, fitting.length))];
}

// Puts an activity's tiles down and adds it to the room. Anyone in the way steps aside.
function standActivity(state: OfficeState, activity: ActivityState): void {
  const fit = activityFit(state.layout, activity.kind, activity.index);
  if (fit === undefined) {
    return;
  }
  state.activities = [...(state.activities ?? []), activity];
  for (const point of fit.blocked) {
    state.layout.tiles[point.y][point.x] = "gear";
  }
  for (const point of fit.seats) {
    state.layout.tiles[point.y][point.x] = "seat";
  }
  const changed = [...fit.blocked, ...fit.seats];
  for (const agent of state.agents) {
    const onIt = fit.blocked.some((point) => isAt(agent, point));
    const passing = agent.path.slice(0, -1).some((step) => changed.some((point) => samePoint(point, step)));
    if (onIt || passing) {
      if (onIt) {
        const moved = nearestWalkable(state.layout, here(agent));
        agent.x = moved.x;
        agent.y = moved.y;
      }
      agent.path = [];
      agent.modeUntil = state.time;
    }
  }
}

// Puts an activity in at once, without the crew: when the room opens, and for tests. False when it doesn't fit.
export function addActivity(state: OfficeState, kind: ActivityKindId, index: number, random: Random): boolean {
  if (!activityFitsAt(state, kind, index, undefined)) {
    return false;
  }
  placeActivity(state, kind, index, random);
  return true;
}

function placeActivity(state: OfficeState, kind: ActivityKindId, index: number, random: Random): void {
  state.activityCount = (state.activityCount ?? 0) + 1;
  standActivity(state, {
    id: `activity-${state.activityCount}`, kind, index, until: state.time + activityStay(random, state.activitySwaps), going: false, endsAt: undefined, nextTurnAt: 0,
  });
}

function removeActivity(state: OfficeState, activity: ActivityState): void {
  endActivity(state, activity.id, undefined, false);
  state.activities = (state.activities ?? []).filter((other) => other !== activity);
  const fit = activityFit(state.layout, activity.kind, activity.index);
  for (const point of fit === undefined ? [] : [...fit.blocked, ...fit.seats]) {
    state.layout.tiles[point.y][point.x] = "floor";
  }
}

// Free desk spots: not a guy's, and no desk standing on them.
function freeDeskSpots(state: OfficeState): number {
  const wanted = new Set(state.agents.flatMap((agent) => (isSession(agent) && !agent.leaving && agent.deskIndex !== undefined ? [agent.deskIndex] : [])));
  return state.layout.desks.filter((_, index) => !wanted.has(index) && !state.placed.has(index)).length;
}

function orderActivity(state: OfficeState, random: Random): boolean {
  const standing = [...(state.activities ?? []).map((activity) => activity.kind), ...incomingActivities(state).map((job) => job.item as ActivityKindId)];
  const kind = pickActivityKind(random, standing, (candidate) => pickActivitySpot(state, candidate, undefined) !== undefined);
  const index = kind === undefined ? undefined : pickActivitySpot(state, kind, random);
  if (kind === undefined || index === undefined) {
    return false;
  }
  state.activityOrders = [...(state.activityOrders ?? []), { kind: "deliver", deskIndex: index, seed: "", item: kind }];
  return true;
}

// When the room first opens, its activities are already standing.
function furnishActivities(state: OfficeState, newcomers: readonly Agent[], random: Random): void {
  if (newcomers.length === 0 && (state.activities ?? []).length > 0) {
    return;
  }
  const target = activityTarget(state.activityLevel ?? "off", freeDeskSpots(state));
  for (let tries = 0; (state.activities ?? []).length < target && tries < target * 3; tries++) {
    const standing = (state.activities ?? []).map((activity) => activity.kind);
    const kind = pickActivityKind(random, standing, (candidate) => pickActivitySpot(state, candidate, undefined) !== undefined);
    const index = kind === undefined ? undefined : pickActivitySpot(state, kind, random);
    if (kind === undefined || index === undefined) {
      break;
    }
    placeActivity(state, kind, index, random);
  }
  state.nextActivityTripAt = state.time + activityTripGap(random, state.activitySwaps);
}

// Decides what the crew brings in or takes out: one on a spot a guy needs goes at once; otherwise, one trip every
// so often, the room keeps its count for its free spots and swaps out ones that have stood a while.
function manageActivities(state: OfficeState, random: Random): void {
  const swaps = state.activitySwaps ?? "normal";
  if ((state.activitySwapsRolled ?? "normal") !== swaps) {
    // The frequency changed: give the standing ones new stays from now, and the next trip sooner if it should be.
    state.activitySwapsRolled = swaps;
    for (const activity of state.activities ?? []) {
      activity.until = state.time + activityStay(random, swaps);
    }
    state.nextActivityTripAt = Math.min(state.nextActivityTripAt ?? 0, state.time + activityTripGap(random, swaps));
  }
  const activities = state.activities ?? [];
  const level = state.activityLevel ?? "off";
  if (activities.length === 0 && (state.activityOrders ?? []).length === 0 && level === "off") {
    return;
  }
  const wanted = new Set(state.agents.flatMap((agent) => (isSession(agent) && !agent.leaving && agent.deskIndex !== undefined ? [agent.deskIndex] : [])));
  for (const activity of activities) {
    if (!activity.going && (level === "off" || activityIndexes(activity).some((index) => wanted.has(index) || state.placed.has(index)))) {
      activity.going = true;
    }
  }
  // An order whose spot got taken waits for another trip.
  state.activityOrders = (state.activityOrders ?? []).filter((order) =>
    level !== "off" && activityFitsAt(state, order.item as ActivityKindId, order.deskIndex, order));
  if (level === "off" || state.time < (state.nextActivityTripAt ?? 0)) {
    return;
  }
  const staying = activities.filter((activity) => !activity.going);
  const count = staying.length + incomingActivities(state).length;
  const target = activityTarget(level, freeDeskSpots(state));
  let tripped = false;
  if (count > target) {
    const oldest = [...staying].sort((first, second) => first.until - second.until)[0];
    if (oldest !== undefined) {
      oldest.going = true;
      tripped = true;
    }
  } else {
    // One that's stood its time goes, once nobody's on it.
    const stale = staying.find((activity) => state.time >= activity.until && activityPlayers(state, activity.id).length === 0);
    if (stale !== undefined) {
      stale.going = true;
      tripped = true;
    } else if (count < target) {
      tripped = orderActivity(state, random);
    }
  }
  state.nextActivityTripAt = state.time + (tripped ? activityTripGap(random, state.activitySwaps) : 3);
}

// The guys headed for or at an activity.
function activityPlayers(state: OfficeState, activityId: string): Agent[] {
  return state.agents.filter((agent) => agent.goal?.kind === "activity" && agent.goal.activityId === activityId);
}

// Is this guy free to go play something now?
function canPlay(agent: Agent): boolean {
  return canChat(agent) && !agent.you && agent.visitor === undefined;
}

interface ActivityChoice {
  activity: ActivityState;
  spot: number;
  partner: Agent | undefined;
  // The partner's spot, when he's coming too.
  partnerSpot: number | undefined;
}

// What this guy could go do: a free spot at an activity, with a partner when it needs one (or sometimes when he can
// bring one), or the open spot beside someone already at it.
function activityChoices(state: OfficeState, agent: Agent, partners: readonly Agent[]): ActivityChoice[] {
  const choices: ActivityChoice[] = [];
  const free = partners.filter((partner) => canPlay(partner) || partner.you || partner.visitor !== undefined);
  for (const activity of state.activities ?? []) {
    if (activity.going) {
      continue;
    }
    const fit = activityFit(state.layout, activity.kind, activity.index);
    if (fit === undefined) {
      continue;
    }
    const spec = ACTIVITIES[activity.kind];
    const players = activityPlayers(state, activity.id);
    const taken = new Set(players.map((player) => (player.goal as { spot: number }).spot));
    const openSpots = fit.spots.map((_, index) => index).filter((index) => !taken.has(index) && !isTargeted(state, agent, fit.spots[index].at));
    if (openSpots.length === 0) {
      continue;
    }
    const partner = free.length === 0 ? undefined : free[(activity.index * 7 + players.length) % free.length];
    if (spec.play === "versus") {
      if (players.length === 1 && openSpots.length === 1 && players[0].mode === "wait") {
        // Someone's waiting for an opponent.
        choices.push({ activity, spot: openSpots[0], partner: undefined, partnerSpot: undefined }, { activity, spot: openSpots[0], partner: undefined, partnerSpot: undefined });
      } else if (players.length === 0 && partner !== undefined && openSpots.length === 2) {
        choices.push({ activity, spot: openSpots[0], partner, partnerSpot: openSpots[1] });
      }
      continue;
    }
    const playSpot = openSpots.find((index) => !fit.spots[index].wait);
    if (spec.play === "turns") {
      if (players.length === 0 && playSpot !== undefined) {
        const waitSpot = openSpots.find((index) => fit.spots[index].wait);
        // Half the time he brings a buddy to take turns with.
        choices.push({ activity, spot: playSpot, partner: undefined, partnerSpot: undefined });
        if (partner !== undefined && waitSpot !== undefined) {
          choices.push({ activity, spot: playSpot, partner, partnerSpot: waitSpot });
        }
      } else if (players.length === 1 && openSpots.length === 1 && fit.spots[openSpots[0]].wait) {
        choices.push({ activity, spot: openSpots[0], partner: undefined, partnerSpot: undefined });
      }
      continue;
    }
    if (playSpot !== undefined) {
      choices.push({ activity, spot: playSpot, partner: undefined, partnerSpot: undefined });
      if (spec.play === "side" && partner !== undefined && openSpots.length === 2) {
        choices.push({ activity, spot: openSpots[0], partner, partnerSpot: openSpots[1] });
      }
    }
  }
  return choices;
}

function startActivity(state: OfficeState, agent: Agent, choice: ActivityChoice, random: Random): void {
  const { activity } = choice;
  const fit = activityFit(state.layout, activity.kind, activity.index);
  if (fit === undefined) {
    wander(state, agent, random);
    return;
  }
  goTo(state, agent, fit.spots[choice.spot].at, { kind: "activity", activityId: activity.id, activity: activity.kind, spot: choice.spot }, false, random);
  const partner = choice.partner;
  if (partner !== undefined && choice.partnerSpot !== undefined) {
    endChat(state, partner);
    if (random() < 0.5) {
      say(state, agent, ACTIVITIES[activity.kind].play === "versus" ? "rematch?" : "c'mon", 1.2);
    }
    goTo(state, partner, fit.spots[choice.partnerSpot].at, { kind: "activity", activityId: activity.id, activity: activity.kind, spot: choice.partnerSpot }, false, random);
  }
}

function arriveAtActivity(state: OfficeState, agent: Agent, goal: { activityId: string; spot: number }, random: Random): void {
  const activity = state.activities?.find((candidate) => candidate.id === goal.activityId);
  const fit = activity === undefined || activity.going ? undefined : activityFit(state.layout, activity.kind, activity.index);
  const spot = fit?.spots[goal.spot];
  if (activity === undefined || spot === undefined || !isAt(agent, spot.at)) {
    agent.goal = undefined;
    setMode(state, agent, "loiter", between(random, 1, 2));
    return;
  }
  agent.facing = spot.facing;
  const spec = ACTIVITIES[activity.kind];
  setMode(state, agent, spot.wait || spec.play === "versus" ? "wait" : "play", FOREVER);
  agent.nextBubbleAt = state.time + between(random, 1.5, 4);
  if (spot.wait && agent.bubble === undefined && random() < 0.5) {
    say(state, agent, pickPhrase(spec.cheer ?? ["my turn next"], random), 1.4);
  }
}

// Ends a go at an activity: the versus winner and loser say so (with lines), and everyone on it picks something else.
function endActivity(state: OfficeState, activityId: string, random: Random | undefined, lines: boolean): void {
  const activity = state.activities?.find((candidate) => candidate.id === activityId);
  const players = activityPlayers(state, activityId);
  if (activity !== undefined) {
    activity.endsAt = undefined;
  }
  const spec = activity === undefined ? undefined : ACTIVITIES[activity.kind];
  const playing = players.filter((player) => player.mode === "play" && player.path.length === 0);
  const winner = random === undefined || playing.length < 2 ? undefined : playing[Math.floor(random() * playing.length)];
  for (const player of players) {
    if (lines && random !== undefined && spec !== undefined) {
      if (winner !== undefined && spec.win !== undefined && spec.lose !== undefined) {
        say(state, player, pickPhrase(player === winner ? spec.win : spec.lose, random), 1.8);
      } else if (random() < 0.3) {
        say(state, player, pickPhrase(["that was fun", "ok, back to it", "nice", "again later"], random), 1.4);
      }
    }
    player.goal = undefined;
    player.target = undefined;
    if (player.path.length === 0) {
      player.mode = "loiter";
    }
    player.modeUntil = state.time + (lines ? 0.8 : 0);
  }
}

// Each frame: who's playing and who's waiting, turns, the lines they say, and the end of a go.
function stepActivities(state: OfficeState, random: Random): void {
  for (const activity of state.activities ?? []) {
    if (activity.going) {
      continue;
    }
    const spec = ACTIVITIES[activity.kind];
    const fit = activityFit(state.layout, activity.kind, activity.index);
    if (fit === undefined) {
      continue;
    }
    const coming = activityPlayers(state, activity.id);
    const here = coming.filter((agent) => agent.path.length === 0 && (agent.mode === "play" || agent.mode === "wait"));
    if (here.length === 0) {
      // Nobody at it. Only clear the clock when nobody is on the way either: taking turns, both walk for a moment.
      if (coming.length === 0) {
        activity.endsAt = undefined;
      }
      continue;
    }
    const spotOf = (agent: Agent) => fit.spots[(agent.goal as { spot: number }).spot];
    if (spec.play === "versus") {
      if (here.length < 2) {
        const waiter = here[0];
        waiter.mode = "wait";
        activity.endsAt ??= state.time + ACTIVITY_WAIT_SECONDS;
        if (coming.length < 2 && state.time >= activity.endsAt) {
          // Nobody came: off he goes.
          endActivity(state, activity.id, random, false);
        } else if (coming.length >= 2) {
          activity.endsAt = state.time + ACTIVITY_WAIT_SECONDS;
        }
        continue;
      }
      if (here.some((agent) => agent.mode === "wait")) {
        here.forEach((agent) => { agent.mode = "play"; });
        activity.endsAt = state.time + between(random, spec.seconds[0], spec.seconds[1]);
      }
    } else {
      activity.endsAt ??= state.time + between(random, spec.seconds[0], spec.seconds[1]);
      for (const agent of here) {
        agent.mode = spotOf(agent)?.wait === true ? "wait" : "play";
      }
      if (spec.play === "turns") {
        stepTurns(state, activity, fit, coming, here, random);
      }
    }
    if (activity.endsAt !== undefined && state.time >= activity.endsAt) {
      endActivity(state, activity.id, random, true);
      continue;
    }
    for (const agent of here) {
      if (state.time < agent.nextBubbleAt || agent.bubble !== undefined) {
        continue;
      }
      agent.nextBubbleAt = state.time + between(random, 4, 10) * Math.max(1, 1 / Math.sqrt(Math.max(0.05, talkOf(state))));
      if (talkOf(state) > 0 && random() < Math.min(0.9, 0.5 * talkOf(state))) {
        say(state, agent, pickPhrase(agent.mode === "wait" ? spec.cheer ?? ["my turn next"] : spec.lines, random), 1.6);
      }
    }
  }
}

// Taking turns: the buddy waiting steps up and the player steps aside, every so often; a lone waiter steps up.
function stepTurns(state: OfficeState, activity: ActivityState, fit: ActivityFit, coming: readonly Agent[], here: readonly Agent[], random: Random): void {
  const playIndex = fit.spots.findIndex((spot) => !spot.wait);
  const waitIndex = fit.spots.findIndex((spot) => spot.wait);
  const atSpot = (index: number) => coming.find((agent) => (agent.goal as { spot: number }).spot === index);
  const player = atSpot(playIndex);
  const waiter = waitIndex < 0 ? undefined : atSpot(waitIndex);
  const go = (agent: Agent, index: number) =>
    goTo(state, agent, fit.spots[index].at, { kind: "activity", activityId: activity.id, activity: activity.kind, spot: index }, false, random);
  if (player === undefined && waiter !== undefined && here.includes(waiter)) {
    go(waiter, playIndex);
    return;
  }
  if (player === undefined || waiter === undefined || !here.includes(player) || !here.includes(waiter)) {
    activity.nextTurnAt = state.time + between(random, TURN_SECONDS[0], TURN_SECONDS[1]);
    return;
  }
  if (state.time >= activity.nextTurnAt) {
    activity.nextTurnAt = state.time + between(random, TURN_SECONDS[0], TURN_SECONDS[1]) + 1;
    say(state, player, pickPhrase(["your turn", "all yours", "ok go", "beat that"], random), 1.2);
    go(player, waitIndex);
    go(waiter, playIndex);
  }
}

// ----- Shows -----

// A show comes to the Office: its performers walk in from the door to a stage near the middle of the room. Returns
// false when a show is already on, or there's no room for a stage.
export function startShow(state: OfficeState, input: ShowInput, random: Random): boolean {
  if (state.show !== undefined || input.performers.length === 0) {
    return false;
  }
  const stage = pickStage(state, input.performers.map((performer) => performer.role), random);
  if (stage === undefined) {
    return false;
  }
  const performers = input.performers.slice(0, stage.spots.length);
  const ids: string[] = [];
  performers.forEach((performer, index) => {
    const agent: Agent = {
      ...newAgent(state, { id: performer.id, seed: performer.seed, status: "working", title: performer.title }, random),
      performer: { role: performer.role, spot: stage.spots[index], bowing: false },
    };
    state.agents.push(agent);
    ids.push(agent.id);
    // They come in one after another.
    agent.goal = { kind: "perform" };
    setMode(state, agent, "loiter", index * 0.7);
  });
  state.show = {
    kind: input.kind,
    title: input.title,
    stage: stage.spots[0],
    spots: stage.spots.slice(0, performers.length),
    phase: "arriving",
    performerIds: ids,
    lines: input.lines,
    closer: input.closer,
    spoken: 0,
    nextLineAt: FOREVER,
    lineGap: 0,
    length: Math.max(5, input.length),
    startedAt: FOREVER,
    endsAt: FOREVER,
    giveUpAt: state.time + 30,
    nextGatherAt: FOREVER,
    food: input.food ?? [],
    lastCue: undefined,
  };
  return true;
}

// Ends the show now: the performers pack up and head out, and the crowd goes back to what it was doing.
export function endShow(state: OfficeState, random: Random): void {
  const show = state.show;
  if (show === undefined) {
    return;
  }
  state.show = undefined;
  for (const agent of [...state.agents]) {
    if (agent.performer !== undefined && show.performerIds.includes(agent.id)) {
      agent.performer.bowing = false;
      if (!agent.leaving) {
        leave(state, agent);
      }
    } else if (agent.goal?.kind === "show") {
      releaseWatcher(state, agent, random);
    }
  }
}

export function showPerformers(state: OfficeState): Agent[] {
  return state.agents.filter((agent) => agent.performer !== undefined);
}

function releaseWatcher(state: OfficeState, agent: Agent, random: Random): void {
  agent.goal = undefined;
  agent.target = undefined;
  agent.snack = undefined;
  agent.groggy = undefined;
  agent.react = undefined;
  agent.cheerUntil = 0;
  // Stagger it, so the crowd doesn't move as one.
  setMode(state, agent, "loiter", between(random, 0.3, 2.5));
}

// Where the performers stand, in role order: the lead in the middle of a row, the others beside him, and the drummer
// behind. Picks open floor near the middle of the room, a little toward the back, with room for a crowd in front.
function pickStage(state: OfficeState, roles: readonly ShowRole[], random: Random): { spots: Point[] } | undefined {
  const { layout } = state;
  const deskTiles = new Set(layout.desks.flatMap((desk) => [desk.desk, desk.seat]).map((point) => `${point.x},${point.y}`));
  const open = (point: Point) => layout.tiles[point.y]?.[point.x] === "floor" && point.y >= 1 && !deskTiles.has(`${point.x},${point.y}`);
  const rowRoles = roles.filter((role) => role !== "drums");
  const hasDrums = roles.includes("drums");
  // Row offsets from the lead: 0, -1, +1, -2, +2.
  const offsets = rowRoles.map((_, index) => (index === 0 ? 0 : index % 2 === 1 ? -Math.ceil(index / 2) : Math.ceil(index / 2)));
  let best: { spots: Point[]; score: number } | undefined;
  for (const tile of openFloorTiles(layout)) {
    if (tile.y > layout.rows - 3) {
      continue;
    }
    const row = offsets.map((offset) => ({ x: tile.x + offset, y: tile.y }));
    if (!row.every(open)) {
      continue;
    }
    const drums = { x: tile.x, y: tile.y - 1 };
    const drumsFit = hasDrums && open(drums);
    const spotsByRole: Point[] = [];
    let rowIndex = 0;
    for (const role of roles) {
      if (role === "drums") {
        if (drumsFit) {
          spotsByRole.push(drums);
        }
      } else {
        spotsByRole.push(row[rowIndex++]);
      }
    }
    // Room for a crowd: open floor in the three rows in front of the stage.
    let crowdRoom = 0;
    for (let dy = 1; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (open({ x: tile.x + dx, y: tile.y + dy })) {
          crowdRoom += dy === 1 ? 1.2 : 1;
        }
      }
    }
    const score = Math.abs(tile.x - (layout.cols - 1) / 2) * 0.6 - crowdRoom + (hasDrums && !drumsFit ? 4 : 0) + random() * 0.5;
    if (best === undefined || score < best.score) {
      best = { spots: spotsByRole, score };
    }
  }
  return best;
}

// A spot in the crowd for this guy: open floor in front of the stage first, then beside it, never on stage.
function crowdSpot(state: OfficeState, agent: Agent, show: ShowState): Point | undefined {
  const { layout } = state;
  const deskTiles = new Set(layout.desks.flatMap((desk) => [desk.desk, desk.seat]).map((point) => `${point.x},${point.y}`));
  const taken = (point: Point) => show.spots.some((spot) => spot.x === point.x && spot.y === point.y) || isTargeted(state, agent, point);
  const near = PERFORMANCES[show.kind].effect === "food" ? 1 : 1.5;
  const spots = openFloorTiles(layout)
    .filter((tile) => tile.y >= 1 && !deskTiles.has(`${tile.x},${tile.y}`) && !taken(tile))
    .map((tile) => {
      const dx = tile.x - show.stage.x;
      const dy = tile.y - show.stage.y;
      const distance = Math.hypot(dx * 0.8, dy);
      return { tile, score: distance + (dy < 0 ? 3 : dy === 0 ? 1 : 0) + (distance < near ? 5 : 0) };
    })
    .filter(({ score }) => score < 9)
    .sort((first, second) => first.score - second.score);
  return spots[0]?.tile;
}

// Sends this guy to the crowd if a show is playing and he's free to watch. Returns false when there's nothing to join.
function joinShow(state: OfficeState, agent: Agent, random: Random): boolean {
  const show = state.show;
  if (show === undefined || show.phase !== "playing" || agent.leaving || agent.crew !== undefined || agent.performer !== undefined || inInvasion(agent)) {
    return false;
  }
  if (agent.goal?.kind === "show" || agent.status === "working" || isAddressing(agent)) {
    return agent.goal?.kind === "show";
  }
  const spot = crowdSpot(state, agent, show);
  if (spot === undefined) {
    return false;
  }
  endChat(state, agent);
  agent.watch = undefined;
  if (agent.mode === "sleep") {
    // Woken from a nap for it: a little groggy through the show.
    agent.groggy = true;
    if (random() < 0.6) {
      say(state, agent, random() < 0.5 ? "huh? a show?" : "*yawn* …ooh!", 1.6);
    }
  }
  goTo(state, agent, spot, { kind: "show" }, false, random);
  return true;
}

// Everyone free to watch heads for the crowd.
function gatherCrowd(state: OfficeState, random: Random): void {
  for (const agent of state.agents) {
    if (agent.goal?.kind !== "show" && agent.status !== "working" && agent.watch === undefined) {
      joinShow(state, agent, random);
    }
  }
}

function performerDecide(state: OfficeState, agent: Agent, random: Random): void {
  const show = state.show;
  const performer = agent.performer as PerformerState;
  if (show === undefined || !show.performerIds.includes(agent.id)) {
    leave(state, agent);
    return;
  }
  if (!isAt(agent, performer.spot)) {
    goTo(state, agent, performer.spot, { kind: "perform" }, false, random);
    return;
  }
  agent.facing = "down";
  setMode(state, agent, "perform", FOREVER);
}

function stepShow(state: OfficeState, random: Random): void {
  const show = state.show;
  if (show === undefined) {
    return;
  }
  const performers = show.performerIds
    .map((id) => state.agents.find((agent) => agent.id === id))
    .filter((agent): agent is Agent => agent !== undefined && !agent.leaving);
  if (performers.length === 0) {
    endShow(state, random);
    return;
  }
  const lead = performers[0];
  if (show.phase === "arriving") {
    const ready = performers.every((agent) => agent.mode === "perform" && agent.path.length === 0);
    if (!ready && state.time < show.giveUpAt) {
      return;
    }
    show.phase = "playing";
    show.startedAt = state.time;
    show.endsAt = state.time + show.length;
    show.lineGap = show.length / Math.max(1, show.lines.length);
    show.nextLineAt = state.time + 1;
    show.nextGatherAt = state.time + 4;
    gatherCrowd(state, random);
    return;
  }
  if (show.phase === "playing") {
    if (state.time >= show.nextGatherAt) {
      // Anyone who just went idle or finished what he was doing comes over too.
      show.nextGatherAt = state.time + 4;
      gatherCrowd(state, random);
    }
    if (show.spoken < show.lines.length && state.time >= show.nextLineAt) {
      sayShowLine(state, show, lead, show.lines[show.spoken], random);
      show.spoken += 1;
      show.nextLineAt = state.time + show.lineGap;
    }
    if (state.time >= show.endsAt) {
      show.phase = "bows";
      show.endsAt = state.time + 4;
      sayShowLine(state, show, lead, show.closer, random);
      for (const agent of performers) {
        (agent.performer as PerformerState).bowing = true;
      }
    }
    return;
  }
  if (state.time >= show.endsAt) {
    endShow(state, random);
  }
}

function sayShowLine(state: OfficeState, show: ShowState, lead: Agent, line: ShowLine, random: Random): void {
  say(state, lead, line.text, Math.min(show.lineGap * 0.8, lineSeconds(line.text) + 0.5));
  if (line.cue === undefined) {
    return;
  }
  show.lastCue = { cue: line.cue, at: state.time };
  for (const agent of state.agents) {
    if (agent.mode !== "watch" || agent.goal?.kind !== "show") {
      continue;
    }
    const personality = personalityOf(agent.seed);
    // Most of the crowd answers out loud; the rest just cheer.
    const speaks = random() < 0.65;
    agent.react = {
      text: speaks ? audienceLine(show.kind, line.cue, personality, agent.groggy === true, random, agent.snack) : "",
      at: state.time + between(random, 0.4, 1.3),
      cheer: line.cue !== "gasp" && (line.cue !== "laugh" || random() < 0.4),
    };
  }
}

// A guy in the crowd: answers the last cue, and now and then says something to nobody.
function stepWatcher(state: OfficeState, agent: Agent, random: Random): void {
  const show = state.show;
  if (show === undefined) {
    return;
  }
  const react = agent.react;
  if (react !== undefined && state.time >= react.at) {
    agent.react = undefined;
    if (react.text !== "") {
      say(state, agent, react.text, 1.8);
    }
    if (react.cheer) {
      agent.cheerUntil = state.time + between(random, 1.2, 2.2);
    }
    agent.nextBubbleAt = state.time + between(random, 4, 9);
    return;
  }
  if (state.time >= agent.nextBubbleAt && agent.bubble === undefined) {
    agent.nextBubbleAt = state.time + between(random, 6, 14);
    if (random() < 0.45) {
      say(state, agent, audienceLine(show.kind, "idle", personalityOf(agent.seed), agent.groggy === true, random, agent.snack), 1.6);
    }
  }
}

function performerPose(agent: Agent, performer: PerformerState, time: number): AgentPose {
  if (performer.bowing) {
    return { pose: "cheer", facing: "down", frame: Math.floor(time * 3), seated: false };
  }
  switch (performer.role) {
    case "guitar":
    case "bass":
      // Strumming.
      return { pose: "build", facing: agent.facing, frame: Math.floor(time * 6), seated: false };
    case "drums":
    case "dj":
      return { pose: "build", facing: agent.facing, frame: Math.floor(time * 8), seated: false };
    case "cart":
      return { pose: agent.bubble === undefined ? "build" : "talk", facing: agent.facing, frame: Math.floor(time * (agent.bubble === undefined ? 2 : 5)), seated: false };
    default:
      return { pose: "talk", facing: agent.facing, frame: agent.bubble === undefined ? 0 : Math.floor(time * 5), seated: false };
  }
}

// ----- Invasions -----

// The most mess on the floor at once.
const MAX_DEBRIS = 16;

// An invader, or one of the guys caught up in an invasion.
function inInvasion(agent: Agent): boolean {
  return agent.invader !== undefined || agent.scare !== undefined;
}

// Who an invasion catches up: everyone in the room but the crew (they've seen worse), performers, and the invaders.
function canBeScared(agent: Agent): boolean {
  return !agent.leaving && agent.crew === undefined && agent.performer === undefined && agent.invader === undefined && agent.scare === undefined;
}

export function invaderAgents(state: OfficeState): Agent[] {
  return state.agents.filter((agent) => agent.invader !== undefined);
}

// Up on his feet, not caught, not down, not floating.
function isUp(agent: Agent): boolean {
  return agent.mode !== "down" && agent.mode !== "float" && agent.mode !== "struggle";
}

// The ones chasing: invaders on the hunt, and guys turned into zombies.
function huntersOf(state: OfficeState): Agent[] {
  return state.agents.filter((agent) =>
    !agent.leaving && ((agent.invader !== undefined && !agent.invader.exiting && agent.mode !== "beam") || agent.scare?.turned === true),
  );
}

// A turned guy hunts as one of the invasion he's caught up in.
function hunterKind(state: OfficeState, agent: Agent): InvasionKindId {
  return agent.invader?.kind ?? state.invasion?.kind ?? "zombies";
}

// What a turned guy groans.
function turnLines(state: OfficeState): readonly string[] {
  return INVASIONS[state.invasion?.kind ?? "zombies"].turn?.lines ?? INVASIONS.zombies.turn?.lines ?? ["uuurgh…"];
}

const talkChance = (state: OfficeState, chance: number) => chance * Math.min(1, talkOf(state));

// An invasion starts: the lights flicker and everyone freezes, then the invaders come in. Returns false when one is
// already on, there are no invaders, or nobody's in the room to scare. A show on now is cut short.
export function startInvasion(state: OfficeState, input: InvasionInput, random: Random): boolean {
  if (state.invasion !== undefined || input.invaders.length === 0 || !state.agents.some(canBeScared)) {
    return false;
  }
  endShow(state, random);
  endGathering(state, random);
  state.invasion = {
    kind: input.kind,
    phase: "warning",
    startedAt: state.time,
    phaseStartedAt: state.time,
    phaseEndsAt: state.time + WARNING_SECONDS,
    length: Math.max(8, input.length),
    invaderIds: [],
    pending: [...input.invaders],
    nextSpawnAt: FOREVER,
    debris: [],
    debrisCount: 0,
    hits: [],
    puffs: [],
    zaps: [],
    nextGatherAt: state.time + 2,
    allDownSince: undefined,
    nextWakeAt: FOREVER,
  };
  for (const agent of state.agents) {
    if (canBeScared(agent)) {
      enlist(state, agent, random);
    }
  }
  return true;
}

// Ends the invasion now: the invaders vanish, everyone's back on his feet and back to what he was doing, the mess is
// gone.
export function endInvasion(state: OfficeState, random: Random): void {
  if (state.invasion === undefined) {
    return;
  }
  state.invasion = undefined;
  for (const agent of [...state.agents]) {
    if (agent.invader !== undefined) {
      removeAgent(state, agent);
    } else if (agent.scare !== undefined) {
      release(state, agent, random, false);
    }
  }
}

// Drops what he's doing and freezes, or with the attack already on, runs.
function enlist(state: OfficeState, agent: Agent, random: Random): void {
  const invasion = state.invasion as InvasionState;
  endChat(state, agent);
  const napping = agent.mode === "sleep";
  agent.watch = undefined;
  agent.react = undefined;
  agent.reply = undefined;
  agent.cheerUntil = 0;
  agent.snack = undefined;
  agent.groggy = undefined;
  agent.goal = undefined;
  agent.scare = {
    since: state.time,
    nextScreamAt: state.time + between(random, 0.3, 2.4),
    down: false,
    woke: false,
    turnAt: undefined,
    turned: false,
    headLeft: random() < 0.5,
    repathAt: 0,
  };
  if (napping && random() < talkChance(state, 0.7)) {
    say(state, agent, random() < 0.5 ? "huh?!" : "wha—?", 1.2);
  }
  if (agent.path.length > 0) {
    // Finishes the step he's on, then freezes.
    agent.path = agent.path.slice(0, 1);
    agent.target = agent.path[0];
    return;
  }
  agent.target = undefined;
  if (invasion.phase === "warning") {
    if (INVASIONS[invasion.kind].entry === "door") {
      agent.facing = facingToward(agent, state.layout.door);
    }
    setMode(state, agent, "alert", invasion.phaseEndsAt - state.time + between(random, 0, 0.7));
  } else {
    setMode(state, agent, "alert", between(random, 0.1, 0.5));
  }
}

// Each frame of an invasion.
function stepInvasion(state: OfficeState, random: Random): void {
  const invasion = state.invasion;
  if (invasion === undefined) {
    return;
  }
  invasion.hits = invasion.hits.filter((hit) => state.time - hit.at < 2);
  invasion.puffs = invasion.puffs.filter((puff) => state.time - puff.at < 3);
  invasion.zaps = invasion.zaps.filter((zap) => state.time < zap.until);
  const spec = INVASIONS[invasion.kind];
  switch (invasion.phase) {
    case "warning":
      for (const agent of state.agents) {
        if (agent.scare !== undefined && state.time >= agent.scare.nextScreamAt) {
          agent.scare.nextScreamAt = FOREVER;
          if (agent.bubble === undefined && random() < talkChance(state, 0.6)) {
            say(state, agent, pickPhrase(spec.warning, random), 1.8);
          }
        }
      }
      if (state.time >= invasion.phaseEndsAt) {
        beginAttack(state, invasion, random);
      }
      return;
    case "attack":
      stepAttack(state, invasion, random);
      return;
    case "retreat":
      if (!state.agents.some((agent) => agent.invader !== undefined) || state.time >= invasion.phaseEndsAt) {
        for (const agent of invaderAgents(state)) {
          if (!agent.leaving) {
            invasion.puffs.push({ x: agent.x, y: agent.y, at: state.time, exit: true });
          }
          removeAgent(state, agent);
        }
        beginAftermath(state, invasion, random);
      }
      return;
    case "aftermath":
      stepAftermath(state, invasion, random);
      return;
  }
}

function beginAttack(state: OfficeState, invasion: InvasionState, random: Random): void {
  invasion.phase = "attack";
  invasion.phaseStartedAt = state.time;
  invasion.phaseEndsAt = state.time + invasion.length;
  invasion.nextSpawnAt = state.time;
  for (const agent of state.agents) {
    if (agent.scare === undefined) {
      continue;
    }
    agent.scare.nextScreamAt = state.time + between(random, 0.8, 3);
    if (agent.mode === "alert") {
      // They bolt one after another, not all at once.
      agent.modeUntil = state.time + between(random, 0.2, 1.2);
    }
  }
}

function stepAttack(state: OfficeState, invasion: InvasionState, random: Random): void {
  const pending = invasion.pending[0];
  if (pending !== undefined && state.time >= invasion.nextSpawnAt) {
    invasion.pending.shift();
    spawnInvader(state, invasion, pending, random, invasion.invaderIds.length === 0);
    invasion.nextSpawnAt = state.time + between(random, 0.6, 1.1);
  }
  if (state.time >= invasion.nextGatherAt) {
    // Anyone who just walked in is in it too.
    invasion.nextGatherAt = state.time + 2;
    for (const agent of state.agents) {
      if (canBeScared(agent)) {
        enlist(state, agent, random);
      }
    }
  }
  const hunters = huntersOf(state);
  for (const agent of state.agents) {
    const scare = agent.scare;
    if (scare === undefined) {
      continue;
    }
    if (scare.turnAt !== undefined && state.time >= scare.turnAt && agent.mode === "down") {
      rise(state, agent, random);
      continue;
    }
    if (agent.mode === "struggle" && !state.agents.some((other) => other.strike?.targetId === agent.id)) {
      // Whoever had him is gone: he's off again.
      setMode(state, agent, "alert", 0.2);
      continue;
    }
    if (scare.turned || !isUp(agent) || state.time < scare.nextScreamAt) {
      continue;
    }
    scare.nextScreamAt = state.time + between(random, 3, 7) / Math.max(0.4, Math.sqrt(talkOf(state)));
    if (agent.bubble === undefined && random() < talkChance(state, 0.55)) {
      say(state, agent, agent.mode === "cower" ? pickPhrase(COWER_LINES, random) : screamLine(invasion.kind, random), 1.4);
    }
  }
  for (const hunter of hunters) {
    stepHunter(state, hunter, random);
  }
  const standing = state.agents.filter((agent) => agent.scare !== undefined && !agent.scare.turned && isUp(agent) && agent.scare.turnAt === undefined);
  if (standing.length === 0 && invasion.pending.length === 0) {
    invasion.allDownSince ??= state.time;
  } else {
    invasion.allDownSince = undefined;
  }
  if (state.time >= invasion.phaseEndsAt || (invasion.allDownSince !== undefined && state.time - invasion.allDownSince > 2.5)) {
    beginRetreat(state, invasion, random);
  }
}

// An invader comes in: through the door, or beamed down or in a puff of smoke on open floor.
function spawnInvader(state: OfficeState, invasion: InvasionState, input: InvaderInput, random: Random, first: boolean): void {
  const spec = INVASIONS[invasion.kind];
  const agent: Agent = {
    ...newAgent(state, { id: input.id, seed: input.seed, status: "working", title: input.title }, random),
    invader: {
      kind: invasion.kind,
      nextTauntAt: state.time + between(random, 1.5, 4),
      nextTrashAt: state.time + between(random, spec.trashEvery[0], spec.trashEvery[1]),
      repathAt: 0,
      loot: false,
      exiting: false,
    },
    speed: spec.speed,
  };
  if (spec.entry === "door") {
    if (first) {
      popWord(state, state.layout.door, spec.doorWord ?? "CREAK…");
    }
    setMode(state, agent, "alert", 0.2);
  } else {
    const deskTiles = deskTileKeys(state.layout);
    const open = openFloorTiles(state.layout).filter((tile) => tile.y >= 1 && !deskTiles.has(`${tile.x},${tile.y}`) &&
      !state.agents.some((other) => other.invader !== undefined && Math.round(other.x) === tile.x && Math.round(other.y) === tile.y));
    const spot = open.length === 0 ? state.layout.door : open[Math.floor(random() * open.length)];
    agent.x = spot.x;
    agent.y = spot.y;
    agent.facing = "down";
    setMode(state, agent, "beam", 1.2);
    invasion.puffs.push({ x: spot.x, y: spot.y, at: state.time, exit: false });
  }
  state.agents.push(agent);
  invasion.invaderIds.push(agent.id);
}

function deskTileKeys(layout: OfficeLayout): Set<string> {
  return new Set(layout.desks.flatMap((desk) => [desk.desk, desk.seat]).map((point) => `${point.x},${point.y}`));
}

// A hunter between strikes: now and then a taunt, now and then something to smash, otherwise after the nearest guy
// still on his feet (one nobody else is after, if he can). Close enough, he strikes.
function stepHunter(state: OfficeState, hunter: Agent, random: Random): void {
  if (hunter.mode === "attack" || hunter.mode === "beam") {
    return;
  }
  const kind = hunterKind(state, hunter);
  const spec = INVASIONS[kind];
  const invader = hunter.invader;
  const scare = hunter.scare;
  if (invader !== undefined && state.time >= invader.nextTauntAt) {
    invader.nextTauntAt = state.time + between(random, 5, 11);
    if (hunter.bubble === undefined && random() < talkChance(state, 0.6)) {
      say(state, hunter, pickPhrase(spec.taunts, random), 1.8);
    }
  } else if (scare !== undefined && state.time >= scare.nextScreamAt) {
    scare.nextScreamAt = state.time + between(random, 5, 10);
    if (hunter.bubble === undefined && random() < talkChance(state, 0.5)) {
      say(state, hunter, pickPhrase(turnLines(state), random), 1.6);
    }
  }
  const repathAt = invader?.repathAt ?? scare?.repathAt ?? 0;
  if (state.time < repathAt) {
    return;
  }
  if (invader !== undefined) {
    invader.repathAt = state.time + 0.45;
  } else if (scare !== undefined) {
    scare.repathAt = state.time + 0.45;
  }
  if (invader !== undefined && state.time >= invader.nextTrashAt) {
    invader.nextTrashAt = state.time + between(random, spec.trashEvery[0], spec.trashEvery[1]);
    if (goTrash(state, hunter, random)) {
      return;
    }
  }
  if (hunter.goal?.kind === "trash" && hunter.path.length > 0) {
    return;
  }
  const prey = pickPrey(state, hunter);
  if (prey === undefined) {
    if (hunter.path.length === 0) {
      wanderHunt(state, hunter, random);
    }
    return;
  }
  if (Math.hypot(prey.x - hunter.x, prey.y - hunter.y) <= spec.reach) {
    strike(state, hunter, prey, random);
    return;
  }
  const tile = here(prey);
  if (hunter.goal?.kind === "hunt" && hunter.goal.preyId === prey.id && hunter.target !== undefined && samePoint(hunter.target, tile) && hunter.path.length > 0) {
    return;
  }
  goTo(state, hunter, tile, { kind: "hunt", preyId: prey.id }, true, random);
}

// Nobody left to chase: he prowls about.
function wanderHunt(state: OfficeState, hunter: Agent, random: Random): void {
  const open = openFloorTiles(state.layout).filter((tile) => tile.y >= 1);
  if (open.length === 0) {
    return;
  }
  goTo(state, hunter, open[Math.floor(random() * open.length)], { kind: "hunt", preyId: "" }, false, random);
}

function pickPrey(state: OfficeState, hunter: Agent): Agent | undefined {
  const chased = new Set(state.agents.flatMap((other) =>
    other === hunter ? [] : [...(other.goal?.kind === "hunt" ? [other.goal.preyId] : []), ...(other.strike?.targetId !== undefined ? [other.strike.targetId] : [])],
  ));
  let best: { agent: Agent; score: number } | undefined;
  for (const agent of state.agents) {
    if (agent === hunter || agent.scare === undefined || agent.scare.turned || agent.leaving || !isUp(agent) || agent.scare.turnAt !== undefined) {
      continue;
    }
    const score = Math.hypot(agent.x - hunter.x, agent.y - hunter.y) + (chased.has(agent.id) ? 4 : 0);
    if (best === undefined || score < best.score) {
      best = { agent, score };
    }
  }
  return best?.agent;
}

// Heads for a desk or a prop to smash. Returns false when there's nothing to get to.
function goTrash(state: OfficeState, hunter: Agent, random: Random): boolean {
  const { layout } = state;
  const spots = [
    ...[...state.placed.keys()].map((index) => layout.desks[index]).filter((desk) => desk !== undefined).map((desk) => ({ x: desk.seat.x, y: desk.seat.y + 1 })),
    ...layout.props.flatMap((prop) => (prop.stand === undefined ? [] : [prop.stand])),
  ].filter((spot) => layout.tiles[spot.y]?.[spot.x] === "floor" && Math.hypot(spot.x - hunter.x, spot.y - hunter.y) < 8 && !isTargeted(state, hunter, spot));
  if (spots.length === 0) {
    return false;
  }
  goTo(state, hunter, spots[Math.floor(random() * spots.length)], { kind: "trash" }, true, random);
  return true;
}

// Grabs, zaps, or swings at a guy: both stop, the guy in a struggle until the strike lands.
function strike(state: OfficeState, hunter: Agent, prey: Agent, random: Random): void {
  const spec = INVASIONS[hunterKind(state, hunter)];
  hunter.facing = facingToward(hunter, prey);
  prey.facing = facingToward(prey, hunter);
  hunter.goal = undefined;
  hunter.target = undefined;
  hunter.strike = { targetId: prey.id, at: here(prey), feeding: false };
  setMode(state, hunter, "attack", spec.strikeSeconds);
  prey.goal = undefined;
  prey.target = undefined;
  prey.speed = undefined;
  setMode(state, prey, "struggle", FOREVER);
  if (spec.attack === "zap" && hunter.scare === undefined) {
    state.invasion?.zaps.push({ fromId: hunter.id, toId: prey.id, until: state.time + spec.strikeSeconds });
  }
  if (random() < talkChance(state, 0.7)) {
    say(state, prey, pickPhrase(spec.caught, random), 1.3);
  }
}

// The strike lands: on the furniture, leaving a mess, or on the guy, who goes down (or up, in an alien's beam). A
// vampire's tackle is followed by a slurp over the guy, which leaves him pale.
function resolveStrike(state: OfficeState, hunter: Agent, random: Random): void {
  const strikeNow = hunter.strike as StrikeState;
  hunter.strike = undefined;
  const kind = hunterKind(state, hunter);
  const spec = INVASIONS[kind];
  const huntOn = () => {
    hunter.mode = "alert";
    hunter.modeUntil = FOREVER;
    const pause = state.time + spec.rest * between(random, 0.7, 1.3);
    if (hunter.invader !== undefined) {
      hunter.invader.repathAt = pause;
    } else if (hunter.scare !== undefined) {
      hunter.scare.repathAt = pause;
    }
  };
  if (strikeNow.targetId === undefined) {
    popWord(state, strikeNow.at, pickPhrase(spec.trashWords, random));
    addDebris(state, strikeNow.at, kind, random);
    if (random() < 0.5) {
      addDebris(state, strikeNow.at, kind, random);
    }
    if (hunter.invader !== undefined && spec.loots === true) {
      hunter.invader.loot = true;
    }
    huntOn();
    return;
  }
  const prey = state.agents.find((agent) => agent.id === strikeNow.targetId);
  if (prey?.scare === undefined) {
    huntOn();
    return;
  }
  if (strikeNow.feeding) {
    if (prey.mode === "down") {
      prey.variant = "pale";
      popWord(state, prey, "gulp!");
    }
    huntOn();
    return;
  }
  if (prey.mode !== "struggle") {
    huntOn();
    return;
  }
  const attack = hunter.scare !== undefined ? "bite" : spec.attack;
  if (attack === "zap" && random() < (spec.floatChance ?? 0)) {
    // Up in the beam, until they go.
    setMode(state, prey, "float", FOREVER);
    prey.scare.since = state.time;
    prey.scare.down = true;
    popWord(state, prey, "BZZT!");
  } else {
    knockDown(state, prey, pickPhrase(spec.hitWords, random));
    if (spec.mark !== undefined && attack !== "bite") {
      prey.variant = spec.mark;
    }
  }
  if (attack === "bite") {
    prey.scare.turnAt = state.time + between(random, 2.5, 4.5);
  }
  if (random() < 0.4) {
    addDebris(state, prey, kind, random);
  }
  if (attack === "drink") {
    // Leans over him for a slurp.
    hunter.strike = { targetId: prey.id, at: here(prey), feeding: true };
    setMode(state, hunter, "attack", 2.2);
    hunter.facing = prey.x < hunter.x ? "left" : "right";
    popWord(state, { x: prey.x, y: prey.y - 0.4 }, "SLURP!");
    return;
  }
  huntOn();
}

function knockDown(state: OfficeState, agent: Agent, word: string | undefined): void {
  agent.path = [];
  agent.goal = undefined;
  agent.target = undefined;
  agent.speed = undefined;
  agent.running = false;
  setMode(state, agent, "down", FOREVER);
  agent.facing = "down";
  if (agent.scare !== undefined) {
    agent.scare.down = true;
    agent.scare.since = state.time;
  }
  if (word !== undefined) {
    popWord(state, agent, word);
  }
}

// A bitten guy gets up again as one of them (a zombie, a wolf) and joins the chase.
function rise(state: OfficeState, agent: Agent, random: Random): void {
  const scare = agent.scare as ScareState;
  const turn = INVASIONS[state.invasion?.kind ?? "zombies"].turn ?? INVASIONS.zombies.turn;
  scare.turnAt = undefined;
  scare.turned = true;
  scare.repathAt = state.time + 0.6;
  scare.nextScreamAt = state.time + between(random, 3, 6);
  agent.variant = turn?.variant ?? "zombie";
  agent.speed = turn?.speed ?? INVASIONS.zombies.speed;
  if (random() < talkChance(state, 0.8)) {
    say(state, agent, pickPhrase(turnLines(state), random), 1.6);
  }
  agent.facing = "down";
  setMode(state, agent, "alert", FOREVER);
}

function popWord(state: OfficeState, at: { x: number; y: number }, word: string): void {
  state.invasion?.hits.push({ x: at.x, y: at.y, at: state.time, word });
}

// A bit of mess on an open tile near a point, of the invasion's kinds.
function addDebris(state: OfficeState, near: { x: number; y: number }, kind: InvasionKindId, random: Random): void {
  const invasion = state.invasion;
  if (invasion === undefined || invasion.debris.length >= MAX_DEBRIS) {
    return;
  }
  const deskTiles = deskTileKeys(state.layout);
  const spots = openFloorTiles(state.layout).filter((tile) => tile.y >= 1 && Math.abs(tile.x - near.x) <= 1.5 && Math.abs(tile.y - near.y) <= 1.5 &&
    !deskTiles.has(`${tile.x},${tile.y}`) && !invasion.debris.some((piece) => piece.x === tile.x && piece.y === tile.y));
  if (spots.length === 0) {
    return;
  }
  const tile = spots[Math.floor(random() * spots.length)];
  const kinds = INVASIONS[kind].debris;
  invasion.debrisCount += 1;
  invasion.debris.push({
    id: invasion.debrisCount,
    x: tile.x,
    y: tile.y,
    ox: Math.round(between(random, -4, 4)),
    oy: Math.round(between(random, -3, 2)),
    kind: kinds[Math.floor(random() * kinds.length) % kinds.length],
    sweeper: undefined,
  });
}

// Runs from them: to open floor far from the nearest hunter, or now and then hides where he is.
function flee(state: OfficeState, agent: Agent, random: Random): void {
  const hunters = huntersOf(state);
  if (hunters.length > 0 && agent.mode !== "cower" && random() < 0.18) {
    agent.facing = "down";
    agent.speed = undefined;
    setMode(state, agent, "cower", between(random, 2.5, 5));
    return;
  }
  const open = openFloorTiles(state.layout).filter((tile) => tile.y >= 1 && !isTargeted(state, agent, tile));
  let best: { tile: Point; score: number } | undefined;
  for (let tries = 0; tries < 14 && open.length > 0; tries++) {
    const tile = open[Math.floor(random() * open.length)];
    const danger = hunters.length === 0 ? random() * 4 : Math.min(...hunters.map((hunter) => Math.hypot(tile.x - hunter.x, tile.y - hunter.y)));
    const score = danger - 0.15 * Math.hypot(tile.x - agent.x, tile.y - agent.y) + random() * 1.2;
    if (best === undefined || score > best.score) {
      best = { tile, score };
    }
  }
  if (best === undefined) {
    setMode(state, agent, "panic", between(random, 0.6, 1.2));
    return;
  }
  agent.speed = FLEE_SPEED;
  goTo(state, agent, best.tile, { kind: "flee" }, true, random);
}

// They leave, each his own way: out the door (raiders with something under their arm), beamed up, or off as bats.
// Anyone still caught goes down, guys up in a beam drop, and turned zombies keel over.
function beginRetreat(state: OfficeState, invasion: InvasionState, random: Random): void {
  invasion.phase = "retreat";
  invasion.phaseStartedAt = state.time;
  invasion.phaseEndsAt = state.time + RETREAT_SECONDS;
  invasion.pending = [];
  invasion.zaps = [];
  const spec = INVASIONS[invasion.kind];
  for (const agent of state.agents) {
    const scare = agent.scare;
    if (scare !== undefined) {
      scare.turnAt = undefined;
      agent.strike = undefined;
      if (scare.turned || agent.mode === "float" || agent.mode === "struggle") {
        scare.turned = false;
        knockDown(state, agent, agent.mode === "float" ? "THUD!" : undefined);
      } else if (agent.mode !== "down") {
        // Never caught: he stops where he is and waits for it to be over.
        agent.path = agent.path.slice(0, 1);
        agent.goal = undefined;
        agent.speed = undefined;
        agent.running = false;
        if (agent.path.length === 0) {
          setMode(state, agent, "alert", FOREVER);
        }
      }
      continue;
    }
    if (agent.invader === undefined || agent.leaving) {
      continue;
    }
    agent.strike = undefined;
    if (random() < talkChance(state, 0.7)) {
      say(state, agent, pickPhrase(spec.exitLines, random), 1.8);
    }
    if (spec.loots === true) {
      agent.invader.loot = true;
    }
    // A moment to say it, then off.
    setMode(state, agent, "alert", between(random, 0.3, 1.4));
  }
}

function invaderLeaves(state: OfficeState, agent: Agent, random: Random): void {
  const invader = agent.invader as InvaderState;
  const spec = INVASIONS[invader.kind];
  if (spec.exit === "door") {
    agent.speed = spec.speed * (spec.exitSpeed ?? 1.1);
    leave(state, agent);
    agent.running = true;
    return;
  }
  invader.exiting = true;
  state.invasion?.puffs.push({ x: agent.x, y: agent.y, at: state.time, exit: true });
  setMode(state, agent, "beam", between(random, 0.9, 1.2));
}

function beginAftermath(state: OfficeState, invasion: InvasionState, random: Random): void {
  invasion.phase = "aftermath";
  invasion.phaseStartedAt = state.time;
  invasion.phaseEndsAt = state.time + AFTERMATH_SECONDS;
  invasion.nextWakeAt = state.time + between(random, 2, 3);
  for (const agent of state.agents) {
    if (agent.scare !== undefined && !agent.scare.down) {
      agent.scare.nextScreamAt = state.time + between(random, 0.5, 2.5);
    }
  }
}

// The guys come to one by one; the ones never caught come out of it first. Done when everyone's back to normal.
function stepAftermath(state: OfficeState, invasion: InvasionState, random: Random): void {
  if (state.time >= invasion.nextWakeAt) {
    const downs = state.agents.filter((agent) => agent.scare !== undefined && agent.mode === "down" && !agent.scare.woke);
    if (downs.length > 0) {
      wake(state, downs[Math.floor(random() * downs.length)], invasion, random);
      invasion.nextWakeAt = state.time + between(random, 1, 2.4);
    } else {
      invasion.nextWakeAt = FOREVER;
    }
  }
  for (const agent of state.agents) {
    const scare = agent.scare;
    if (scare !== undefined && !scare.down && !scare.woke && state.time >= scare.nextScreamAt) {
      scare.woke = true;
      if (agent.bubble === undefined && random() < talkChance(state, 0.7)) {
        say(state, agent, pickPhrase(SURVIVOR_LINES, random), 1.8);
      }
      agent.path = [];
      setMode(state, agent, "dazed", between(random, 1.5, 2.5));
    }
  }
  if (state.time >= invasion.phaseEndsAt) {
    // Long enough: the room snaps back.
    invasion.debris = [];
    endInvasion(state, random);
    return;
  }
  if (!state.agents.some(inInvasion)) {
    state.invasion = undefined;
  }
}

// Comes to: looks around, says something about it, then dusts off. A turned guy is himself again.
function wake(state: OfficeState, agent: Agent, invasion: InvasionState, random: Random): void {
  const scare = agent.scare as ScareState;
  scare.woke = true;
  if (agent.variant === "zombie" || agent.variant === "wolf") {
    agent.variant = undefined;
  }
  if (random() < talkChance(state, 0.9)) {
    say(state, agent, wakeLine(invasion.kind, personalityOf(agent.seed), random), 2.6);
  }
  setMode(state, agent, "dazed", between(random, 2.6, 3.6));
}

// Off to sweep up the nearest mess nobody's on, or, with none left, back to normal.
function cleanUp(state: OfficeState, agent: Agent, random: Random): void {
  const invasion = state.invasion;
  const sweeping = new Set(state.agents.flatMap((other) => (other !== agent && other.goal?.kind === "sweep" ? [other.goal.debrisId] : [])));
  const free = (invasion?.debris ?? []).filter((piece) => !sweeping.has(piece.id));
  if (free.length === 0) {
    release(state, agent, random, true);
    return;
  }
  const nearest = free.reduce((best, piece) =>
    Math.hypot(piece.x - agent.x, piece.y - agent.y) < Math.hypot(best.x - agent.x, best.y - agent.y) ? piece : best);
  nearest.sweeper = agent.id;
  goTo(state, agent, { x: nearest.x, y: nearest.y }, { kind: "sweep", debrisId: nearest.id }, false, random);
}

// Back to normal: he picks up what he was doing (a working guy heads back to his desk).
function release(state: OfficeState, agent: Agent, random: Random, lines: boolean): void {
  agent.scare = undefined;
  agent.variant = undefined;
  agent.speed = undefined;
  agent.strike = undefined;
  agent.goal = undefined;
  agent.target = undefined;
  agent.running = false;
  if (lines && agent.bubble === undefined && random() < talkChance(state, 0.3)) {
    say(state, agent, pickPhrase(DONE_LINES, random), 1.8);
  }
  setMode(state, agent, "loiter", between(random, 0.4, 1.5));
}

// What comes next for an invader or a guy caught up in it, when his mode runs out.
function invasionDecide(state: OfficeState, agent: Agent, random: Random): void {
  const invasion = state.invasion;
  if (agent.invader !== undefined) {
    if (invasion === undefined || agent.invader.exiting) {
      removeAgent(state, agent);
      return;
    }
    if (agent.strike !== undefined) {
      resolveStrike(state, agent, random);
      return;
    }
    if (invasion.phase === "retreat" || invasion.phase === "aftermath") {
      invaderLeaves(state, agent, random);
      return;
    }
    // Back on the hunt; stepHunter takes it from here.
    agent.invader.repathAt = 0;
    agent.mode = "alert";
    agent.modeUntil = FOREVER;
    return;
  }
  const scare = agent.scare as ScareState;
  if (invasion === undefined) {
    release(state, agent, random, false);
    return;
  }
  agent.running = false;
  if (agent.strike !== undefined) {
    resolveStrike(state, agent, random);
    return;
  }
  switch (agent.mode) {
    case "down":
    case "float":
      setMode(state, agent, agent.mode, FOREVER);
      return;
    case "struggle":
      if (state.agents.some((other) => other.strike?.targetId === agent.id)) {
        setMode(state, agent, "struggle", FOREVER);
        return;
      }
      break;
    case "dazed":
      if (random() < talkChance(state, 0.3) && agent.bubble === undefined) {
        say(state, agent, pickPhrase(DUST_LINES, random), 1.4);
      }
      setMode(state, agent, "dust", between(random, 1.2, 1.8));
      return;
    case "dust":
      agent.variant = undefined;
      cleanUp(state, agent, random);
      return;
    case "sweep": {
      const goal = agent.goal;
      if (goal?.kind === "sweep") {
        invasion.debris = invasion.debris.filter((piece) => piece.id !== goal.debrisId);
      }
      if (random() < talkChance(state, 0.25) && agent.bubble === undefined) {
        say(state, agent, pickPhrase(CLEAN_LINES, random), 1.6);
      }
      cleanUp(state, agent, random);
      return;
    }
  }
  if (scare.turned && invasion.phase === "attack") {
    scare.repathAt = 0;
    agent.mode = "alert";
    agent.modeUntil = FOREVER;
    agent.path = [];
    return;
  }
  switch (invasion.phase) {
    case "warning":
      setMode(state, agent, "alert", Math.max(0, invasion.phaseEndsAt - state.time) + between(random, 0, 0.6));
      return;
    case "attack":
      flee(state, agent, random);
      return;
    case "retreat":
      setMode(state, agent, "alert", FOREVER);
      return;
    case "aftermath":
      if (scare.woke) {
        cleanUp(state, agent, random);
      } else {
        setMode(state, agent, "alert", FOREVER);
      }
      return;
  }
}

// Got where he was going, in an invasion.
function invasionArrive(state: OfficeState, agent: Agent, random: Random): void {
  const goal = agent.goal;
  switch (goal?.kind) {
    case "flee":
      setMode(state, agent, "panic", between(random, 0.3, 1));
      return;
    case "hunt":
      agent.mode = "alert";
      agent.modeUntil = FOREVER;
      if (agent.invader !== undefined) {
        agent.invader.repathAt = 0;
      } else if (agent.scare !== undefined) {
        agent.scare.repathAt = 0;
      }
      return;
    case "trash":
      agent.strike = { targetId: undefined, at: here(agent), feeding: false };
      agent.facing = "up";
      setMode(state, agent, "attack", 1);
      return;
    case "sweep":
      if (state.invasion?.debris.some((piece) => piece.id === goal.debrisId) === true) {
        agent.facing = "down";
        setMode(state, agent, "sweep", between(random, 2, 3));
      } else {
        cleanUp(state, agent, random);
      }
      return;
    default:
      setMode(state, agent, "alert", 0);
  }
}

// How an invader, or a guy caught up in an invasion, stands, walks, and falls.
function invasionPose(agent: Agent, time: number, phase: number): AgentPose | undefined {
  const scare = agent.scare;
  const invader = agent.invader;
  if (scare === undefined && invader === undefined) {
    return undefined;
  }
  // Zombies and mummies walk with their arms out; so do guys turned into zombies.
  const zombie = invader !== undefined ? INVASIONS[invader.kind].shamble === true : scare?.turned === true && agent.variant === "zombie";
  const turned = scare?.turned === true;
  const facing = agent.facing;
  switch (agent.mode) {
    case "down":
      return { pose: "down", facing: "down", frame: 0, seated: false, lying: true };
    case "float":
      return { pose: "panic", facing: "down", frame: Math.floor(time * 6 + phase * 2), seated: false, offset: { x: 0, y: -Math.round(Math.min(10, (time - (scare?.since ?? time)) * 8)) } };
    case "struggle":
      return { pose: "panic", facing, frame: Math.floor(time * 10), seated: false, offset: { x: Math.floor(time * 16) % 2, y: 0 } };
    case "cower":
      return { pose: "cower", facing: "down", frame: 0, seated: false, offset: { x: Math.floor(time * 9 + phase * 3) % 2, y: 1 } };
    case "dazed":
      // Looking around.
      return { pose: agent.bubble === undefined ? "stand" : "talk", facing: (["left", "down", "right", "down"] as const)[Math.floor(time * 1.3 + phase * 4) % 4], frame: Math.floor(time * 5), seated: false };
    case "dust":
      return { pose: "build", facing: "down", frame: Math.floor(time * 6), seated: false };
    case "sweep":
      return { pose: "build", facing, frame: Math.floor(time * 4 + phase * 2), seated: false };
    case "beam":
      return { pose: "stand", facing: "down", frame: 0, seated: false };
    case "attack": {
      const attack = turned || invader === undefined ? "bite" : INVASIONS[invader.kind].attack;
      if (agent.strike?.targetId === undefined || attack === "bonk") {
        return { pose: zombie ? "reach" : "punch", facing, frame: Math.floor(time * 5), seated: false };
      }
      if (agent.strike.feeding) {
        // Bent over the guy he tackled.
        return { pose: "reach", facing, frame: 0, seated: false, offset: { x: 0, y: 3 } };
      }
      return { pose: "reach", facing, frame: attack === "zap" ? 0 : Math.floor(time * 8), seated: false };
    }
    default:
      break;
  }
  if (agent.path.length > 0) {
    if (invader?.loot === true) {
      return { pose: "carry", facing, frame: Math.floor(time * 12), seated: false };
    }
    if (zombie) {
      return { pose: "reach", facing, frame: Math.floor(time * (agent.running ? 6 : 5)), seated: false };
    }
    if (scare !== undefined) {
      return { pose: "panic", facing, frame: Math.floor(time * 12), seated: false };
    }
    return { pose: "walk", facing, frame: Math.floor(time * (agent.running ? 12 : 7)), seated: false };
  }
  if (agent.mode === "panic") {
    return { pose: "panic", facing, frame: Math.floor(time * 6 + phase * 2), seated: false };
  }
  if (zombie) {
    return { pose: "reach", facing, frame: 0, seated: false };
  }
  return { pose: agent.bubble === undefined ? "stand" : "talk", facing, frame: agent.bubble === undefined ? 0 : Math.floor(time * 5), seated: false };
}

// ----- Group gatherings -----

// call: the lead calls everyone over (the host walks in). gather: the desks are pushed aside and everyone heads for a
// spot. on: it happens, the lead's lines spread over its length, turns in the middle for the turn kinds. closing: the
// closer and a cheer, then everyone goes back and the desks slide back.
export type GatheringPhase = "call" | "gather" | "on" | "closing";

export interface GatheringTurn {
  id: string;
  phase: "going" | "doing" | "back";
  until: number;
  // Halfway: a second line; a faller falls.
  midAt: number;
  midDone: boolean;
  caught?: boolean;
}

export interface GatheringState {
  kind: GatheringKindId;
  title: string;
  phase: GatheringPhase;
  phaseEndsAt: number;
  // The room as it was, to put the desks back; undefined until they're pushed.
  home: OfficeLayout | undefined;
  // The cleared floor, once the desks are pushed (undefined if no strip would open: it happens on the open floor).
  area: ClearedArea | undefined;
  // The middle, where the prop stands or the turns happen; the lead's spot, the other duelist's, and the prop's.
  center: Point;
  front: Point | undefined;
  otherSpot: Point | undefined;
  propAt: Point | undefined;
  leadId: string;
  otherId: string | undefined;
  hostId: string | undefined;
  // Each guy's spot in the ring or the rows.
  spots: Map<string, Point>;
  call: string;
  lines: readonly GatherLine[];
  closer: GatherLine;
  turnLines: readonly string[];
  spoken: number;
  nextLineAt: number;
  lineGap: number;
  length: number;
  endsAt: number;
  nextGatherAt: number;
  // What everyone following the lead is doing, and when each moment happened (for the view).
  pose: GroupPose;
  acts: Partial<Record<GatherAct, number>>;
  turn: GatheringTurn | undefined;
  nextTurnAt: number;
  turnsTaken: string[];
}

export interface GatheringInput {
  kind: GatheringKindId;
  title: string;
  call: string;
  lines: readonly GatherLine[];
  closer: GatherLine;
  length: number;
  turnLines?: readonly string[];
  // Someone who walks in to lead it; without one, one of the guys leads.
  host?: { id: string; seed: string; title: string };
}

// The seconds between the call and the desks moving, and how long they slide.
export const GATHER_CALL_SECONDS = 1.6;
export const DESK_SLIDE_SECONDS = 1.6;

// Starts a group gathering: not over a show, an invasion, or another gathering, and only with enough guys free to
// come. The lead calls everyone over; the desks get pushed aside a moment later.
export function startGathering(state: OfficeState, input: GatheringInput, random: Random): boolean {
  const spec = GATHERINGS[input.kind];
  if (state.gathering !== undefined || state.show !== undefined || state.invasion !== undefined) {
    return false;
  }
  const free = state.agents.filter((agent) => canGather(agent));
  if (free.length < spec.minGuys) {
    return false;
  }
  // The awake ones first: someone has to have the idea.
  const awake = free.filter((agent) => agent.mode !== "sleep");
  const pool = [...(awake.length > 0 ? awake : free)];
  const takeOne = () => pool.splice(Math.floor(random() * pool.length), 1)[0] ?? free.find((agent) => agent.id !== leadGuy?.id);
  let leadGuy: Agent | undefined;
  let host: Agent | undefined;
  if (input.host !== undefined && spec.host !== undefined) {
    host = {
      ...newAgent(state, { id: input.host.id, seed: input.host.seed, status: "working", title: input.host.title }, random),
      gatherHost: true,
    };
    state.agents.push(host);
  } else {
    leadGuy = takeOne();
  }
  const other = spec.duel === true ? takeOne() : undefined;
  const lead = host ?? (leadGuy as Agent);
  state.gathering = {
    kind: input.kind,
    title: input.title,
    phase: "call",
    phaseEndsAt: state.time + GATHER_CALL_SECONDS,
    home: undefined,
    area: undefined,
    center: state.layout.door,
    front: undefined,
    otherSpot: undefined,
    propAt: undefined,
    leadId: lead.id,
    otherId: other?.id,
    hostId: host?.id,
    spots: new Map(),
    call: input.call,
    lines: input.lines,
    closer: input.closer,
    turnLines: input.turnLines ?? [],
    spoken: 0,
    nextLineAt: FOREVER,
    lineGap: 0,
    length: Math.max(8, input.length),
    endsAt: FOREVER,
    nextGatherAt: FOREVER,
    pose: "stand",
    acts: {},
    turn: undefined,
    nextTurnAt: FOREVER,
    turnsTaken: [],
  };
  for (const agent of [lead, other]) {
    if (agent !== undefined && agent !== host) {
      // The lead (and the other duelist) stop what they're doing and stand up for it.
      endChat(state, agent);
      agent.watch = undefined;
      agent.goal = { kind: "gather" };
      agent.target = undefined;
      setMode(state, agent, "loiter", FOREVER);
    }
  }
  if (host !== undefined) {
    host.goal = { kind: "gather" };
    setMode(state, host, "loiter", FOREVER);
  }
  say(state, lead, input.call, 2.4);
  return true;
}

// Ends the gathering now: the host heads out, everyone goes back to what he was doing, and (restore) the desks slide
// back where they were.
export function endGathering(state: OfficeState, random: Random, restore = true): void {
  const gathering = state.gathering;
  if (gathering === undefined) {
    return;
  }
  state.gathering = undefined;
  for (const agent of [...state.agents]) {
    if (agent.gatherHost === true) {
      if (!agent.leaving) {
        leave(state, agent);
      }
    } else if (agent.goal?.kind === "gather") {
      releaseGatherer(state, agent, random);
    }
  }
  if (restore && gathering.home !== undefined) {
    applyLayout(state, gathering.home, random, false);
    state.slideUntil = state.time + DESK_SLIDE_SECONDS;
  }
}

export function gatheringHosts(state: OfficeState): Agent[] {
  return state.agents.filter((agent) => agent.gatherHost === true);
}

// Free to come: a session's guy (or you, on a break) who isn't busy, leaving, or caught up in something else.
function canGather(agent: Agent): boolean {
  return !agent.leaving && agent.status !== "working" && agent.crew === undefined && agent.performer === undefined && agent.visitor === undefined &&
    agent.gatherHost !== true && !inInvasion(agent) && !isAddressing(agent);
}

function releaseGatherer(state: OfficeState, agent: Agent, random: Random): void {
  agent.goal = undefined;
  agent.target = undefined;
  agent.snack = undefined;
  agent.groggy = undefined;
  agent.react = undefined;
  agent.cheerUntil = 0;
  agent.running = false;
  if (agent.mode === "gather" || agent.mode === "loiter") {
    setMode(state, agent, "loiter", between(random, 0.3, 2.5));
  }
}

// Pushes the desks aside and works out where everything goes: the middle, the front, the duelists, the prop. The
// spots are worked out on the new layout first, since moving the desks sends everyone to his spot.
function clearFloor(state: OfficeState, gathering: GatheringState, random: Random): void {
  const spec = GATHERINGS[gathering.kind];
  const pushed = pushDesksAside(state.layout);
  gathering.home = state.layout;
  gathering.area = pushed?.area;
  const layout = pushed?.layout ?? state.layout;
  const open = (point: Point) => layout.tiles[point.y]?.[point.x] === "floor" && point.y >= 1;
  const nearestOpen = (point: Point, avoid: readonly Point[] = []) => openFloorTiles(layout)
    .filter((tile) => tile.y >= 1 && !avoid.some((other) => samePoint(other, tile)))
    .sort((first, second) => Math.hypot(first.x - point.x, first.y - point.y) - Math.hypot(second.x - point.x, second.y - point.y))[0] ?? layout.door;
  const area = gathering.area;
  const middle = area?.center ?? { x: Math.floor((layout.cols - 1) / 2), y: Math.round((layout.rows - 1) / 2) };
  gathering.center = open(middle) ? middle : nearestOpen(middle);
  const center = gathering.center;
  if (spec.formation === "rows") {
    // The lead up front, a step out from the wall so his lines have room above him; the crowd in rows below, and
    // the demo bin between them.
    gathering.front = nearestOpen({ x: center.x, y: (area?.top ?? 1) + (layout.rows >= 7 ? 1 : 0) });
    if (spec.prop === "fireDemo") {
      gathering.propAt = nearestOpen({ x: gathering.front.x, y: gathering.front.y + 1 }, [gathering.front]);
    }
  } else {
    if (spec.prop === "cake" || spec.prop === "campfire" || spec.prop === "cardTable") {
      gathering.propAt = center;
    } else if (spec.prop === "boombox") {
      gathering.propAt = nearestOpen({ x: center.x, y: area?.top ?? 1 }, [center]);
    }
    if (spec.duel === true) {
      // Across the table from each other, side by side or (in a narrow strip) above and below.
      const sides: [Point, Point][] = [[{ x: center.x - 1, y: center.y }, { x: center.x + 1, y: center.y }], [{ x: center.x, y: center.y - 1 }, { x: center.x, y: center.y + 1 }]];
      const first = nearestOpen(center, [center]);
      const pair = sides.find(([left, right]) => open(left) && open(right)) ?? [first, nearestOpen(center, [center, first])];
      [gathering.front, gathering.otherSpot] = pair;
    } else if (spec.prop === "cake" || spec.prop === "campfire") {
      // Behind the cake, or at the head of the fire.
      gathering.front = nearestOpen({ x: center.x, y: center.y - 1 }, [center]);
    } else if (spec.host !== undefined) {
      gathering.front = nearestOpen({ x: center.x, y: center.y - 2 }, [center]);
    }
  }
  if (pushed !== undefined) {
    applyLayout(state, pushed.layout, random, false);
    state.slideUntil = state.time + DESK_SLIDE_SECONDS;
  }
}

// Where this guy stands for it: the lead's or the other duelist's spot, the middle on his turn, else his own spot.
function gatherSpotOf(state: OfficeState, gathering: GatheringState, agent: Agent): Point | undefined {
  if (agent.id === gathering.leadId && gathering.front !== undefined) {
    return gathering.front;
  }
  if (agent.id === gathering.otherId && gathering.otherSpot !== undefined) {
    return gathering.otherSpot;
  }
  if (gathering.turn?.id === agent.id && gathering.turn.phase !== "back") {
    return gathering.center;
  }
  const kept = gathering.spots.get(agent.id);
  if (kept !== undefined && state.layout.tiles[kept.y]?.[kept.x] === "floor") {
    return kept;
  }
  const spot = crowdSpotFor(state, gathering, agent);
  if (spot !== undefined) {
    gathering.spots.set(agent.id, spot);
  }
  return spot;
}

// The nearest free tile to the middle (a ring), or in front of the lead (rows), never on the reserved spots.
function crowdSpotFor(state: OfficeState, gathering: GatheringState, agent: Agent): Point | undefined {
  const spec = GATHERINGS[gathering.kind];
  // Nobody stands in the middle of a ring, or right in front of what's on the floor there (the cake, the fire).
  const inFront = spec.formation === "ring" && gathering.propAt !== undefined && samePoint(gathering.propAt, gathering.center)
    ? { x: gathering.center.x, y: gathering.center.y + 1 } : undefined;
  const reserved = [gathering.front, gathering.otherSpot, gathering.propAt, spec.formation === "ring" ? gathering.center : undefined, inFront]
    .filter((point): point is Point => point !== undefined);
  const taken = (point: Point) => reserved.some((spot) => samePoint(spot, point)) || isTargeted(state, agent, point) ||
    [...gathering.spots].some(([id, spot]) => id !== agent.id && samePoint(spot, point));
  const front = gathering.front ?? gathering.center;
  const rows = spec.formation === "rows";
  const spots = openFloorTiles(state.layout)
    .filter((tile) => tile.y >= 1 && !taken(tile) && (!rows || tile.y > front.y))
    .map((tile) => {
      const from = rows ? { x: front.x, y: front.y + (gathering.propAt === undefined ? 1 : 2) } : gathering.center;
      // A ring keeps a step back from the middle; rows fill in close to the front, then back.
      const distance = Math.hypot(tile.x - from.x, (tile.y - from.y) * (rows ? 1.2 : 1));
      const inside = gathering.area === undefined || (tile.x >= gathering.area.left && tile.x <= gathering.area.right) ? 0 : 0.6;
      return { tile, score: distance + inside };
    })
    .filter(({ score }) => score < 12)
    .sort((first, second) => first.score - second.score);
  return spots[0]?.tile;
}

// Sends this guy to his spot if a gathering is on and he's free to come. Returns false when there's nothing to join.
function joinGathering(state: OfficeState, agent: Agent, random: Random): boolean {
  const gathering = state.gathering;
  if (gathering === undefined) {
    return false;
  }
  const leading = agent.id === gathering.leadId || agent.id === gathering.otherId;
  if (!leading && (gathering.phase === "call" || gathering.phase === "closing" || !canGather(agent))) {
    return false;
  }
  if (gathering.phase === "call") {
    // The lead waits for the desks to move.
    agent.goal = { kind: "gather" };
    setMode(state, agent, "loiter", FOREVER);
    return true;
  }
  const spot = gatherSpotOf(state, gathering, agent);
  if (spot === undefined) {
    return false;
  }
  if (agent.goal?.kind !== "gather") {
    endChat(state, agent);
    agent.watch = undefined;
    if (agent.mode === "sleep") {
      agent.groggy = true;
      if (random() < 0.6) {
        say(state, agent, random() < 0.5 ? "huh? what's going on?" : "*yawn* …ooh!", 1.6);
      }
    }
  }
  goTo(state, agent, spot, { kind: "gather" }, false, random);
  return true;
}

function hostDecide(state: OfficeState, agent: Agent, random: Random): void {
  const gathering = state.gathering;
  if (gathering === undefined || gathering.hostId !== agent.id) {
    leave(state, agent);
    return;
  }
  if (gathering.phase === "call") {
    setMode(state, agent, "loiter", FOREVER);
    return;
  }
  const spot = gatherSpotOf(state, gathering, agent) ?? gathering.center;
  goTo(state, agent, spot, { kind: "gather" }, false, random);
}

function arriveAtGathering(state: OfficeState, agent: Agent, random: Random): void {
  const gathering = state.gathering;
  if (gathering === undefined) {
    setMode(state, agent, "loiter", between(random, 0.5, 1.5));
    return;
  }
  const spec = GATHERINGS[gathering.kind];
  const turn = gathering.turn;
  if (turn?.id === agent.id && turn.phase === "going" && isAt(agent, gathering.center)) {
    agent.facing = "down";
    setMode(state, agent, "gather", FOREVER);
    beginTurn(state, gathering, agent, random);
    return;
  }
  if (turn?.id === agent.id && turn.phase === "back") {
    gathering.turn = undefined;
    gathering.nextTurnAt = state.time + between(random, 0.4, 1.2);
  }
  if (agent.id === gathering.leadId || agent.id === gathering.otherId) {
    const facingPoint = spec.duel === true ? (agent.id === gathering.leadId ? gathering.otherSpot : gathering.front) : undefined;
    agent.facing = facingPoint !== undefined ? facingToward(agent, facingPoint) : spec.formation === "rows" || gathering.front !== undefined ? "down" : facingToward(agent, gathering.center);
  } else if (spec.formation === "rows") {
    agent.facing = "up";
  } else {
    agent.facing = isAt(agent, gathering.center) ? "down" : facingToward(agent, gathering.center);
  }
  setMode(state, agent, "gather", FOREVER);
  agent.nextBubbleAt = state.time + between(random, 3, 8);
  if (gathering.acts.serve !== undefined) {
    agent.snack = "cake";
  }
}

function stepGathering(state: OfficeState, random: Random): void {
  const gathering = state.gathering;
  if (gathering === undefined) {
    return;
  }
  const spec = GATHERINGS[gathering.kind];
  const find = (id: string | undefined) => (id === undefined ? undefined : state.agents.find((agent) => agent.id === id));
  const inIt = (agent: Agent | undefined): agent is Agent => agent !== undefined && !agent.leaving && agent.goal?.kind === "gather";
  for (const id of [...gathering.spots.keys()]) {
    if (!inIt(find(id))) {
      gathering.spots.delete(id);
    }
  }
  if (gathering.turn !== undefined && !inIt(find(gathering.turn.id))) {
    gathering.turn = undefined;
    gathering.nextTurnAt = state.time + 1;
  }
  // Someone else steps up if a lead from the room has to go; without its host, it's over.
  for (const role of ["lead", "other"] as const) {
    const id = role === "lead" ? gathering.leadId : gathering.otherId;
    if (id === undefined || inIt(find(id))) {
      continue;
    }
    if (id === gathering.hostId) {
      endGathering(state, random);
      return;
    }
    const stand = state.agents.filter((agent) => inIt(agent) && agent.id !== gathering.leadId && agent.id !== gathering.otherId && agent.id !== gathering.turn?.id);
    const next = stand[Math.floor(random() * stand.length)];
    if (next === undefined) {
      endGathering(state, random);
      return;
    }
    gathering.spots.delete(next.id);
    if (role === "lead") {
      gathering.leadId = next.id;
    } else {
      gathering.otherId = next.id;
    }
    if (gathering.phase !== "call") {
      joinGathering(state, next, random);
    }
  }
  const lead = find(gathering.leadId) as Agent;
  switch (gathering.phase) {
    case "call":
      if (state.time >= gathering.phaseEndsAt) {
        gathering.phase = "gather";
        gathering.phaseEndsAt = state.time + 25;
        gathering.nextGatherAt = state.time + 2;
        clearFloor(state, gathering, random);
        // applyLayout sent everyone off already; the host and the leads head for their spots.
        for (const agent of [lead, find(gathering.otherId)]) {
          if (agent !== undefined && agent.goal?.kind === "gather" && agent.path.length === 0 && agent.mode === "loiter") {
            decide(state, agent, random);
          }
        }
        gatherEveryone(state, random);
      }
      return;
    case "gather": {
      if (state.time >= gathering.nextGatherAt) {
        gathering.nextGatherAt = state.time + 2;
        gatherEveryone(state, random);
      }
      const ready = (agent: Agent | undefined) => agent === undefined || (agent.mode === "gather" && agent.path.length === 0);
      const crowdIn = state.agents.filter(inIt).every(ready);
      if ((ready(lead) && ready(find(gathering.otherId)) && crowdIn) || state.time >= gathering.phaseEndsAt) {
        gathering.phase = "on";
        gathering.endsAt = state.time + gathering.length;
        gathering.lineGap = gathering.length / Math.max(1, gathering.lines.length);
        gathering.nextLineAt = state.time + 0.6;
        gathering.nextGatherAt = state.time + 4;
        gathering.nextTurnAt = state.time + 2.5;
      }
      return;
    }
    case "on":
      if (state.time >= gathering.nextGatherAt) {
        gathering.nextGatherAt = state.time + 4;
        gatherEveryone(state, random);
      }
      if (gathering.spoken < gathering.lines.length && state.time >= gathering.nextLineAt) {
        sayGatherLine(state, gathering, gathering.lines[gathering.spoken], random);
        gathering.spoken += 1;
        gathering.nextLineAt = state.time + gathering.lineGap;
      }
      if (spec.turns !== undefined) {
        stepTurn(state, gathering, random);
      }
      if (state.time >= gathering.endsAt && gathering.turn?.phase !== "doing") {
        gathering.phase = "closing";
        gathering.phaseEndsAt = state.time + 4.5;
        const turner = find(gathering.turn?.id);
        if (turner !== undefined && gathering.turn !== undefined) {
          gathering.turn.phase = "back";
          joinGathering(state, turner, random);
        }
        sayGatherLine(state, gathering, gathering.closer, random);
      }
      return;
    case "closing":
      if (state.time >= gathering.phaseEndsAt) {
        endGathering(state, random);
      }
      return;
  }
}

// Everyone free to come heads over: the ones who just went idle, woke up, or finished what they were doing.
function gatherEveryone(state: OfficeState, random: Random): void {
  for (const agent of state.agents) {
    if (agent.goal?.kind !== "gather" && agent.watch === undefined && canGather(agent) && (agent.path.length === 0 || agent.goal?.kind !== "work")) {
      joinGathering(state, agent, random);
    }
  }
}

function participants(state: OfficeState, gathering: GatheringState): Agent[] {
  return state.agents.filter((agent) => !agent.leaving && agent.goal?.kind === "gather" && agent.id !== gathering.hostId);
}

function sayGatherLine(state: OfficeState, gathering: GatheringState, line: GatherLine, random: Random): void {
  const seconds = Math.min(Math.max(2, gathering.lineGap * 0.85), lineSeconds(line.text) + 0.5);
  const crowd = participants(state, gathering).filter((agent) => agent.id !== gathering.leadId && agent.id !== gathering.otherId);
  if (line.by === "crowd") {
    // One guy's bubble carries the line; a couple more chime in, and the rest just join in.
    const voices = [...crowd].sort(() => random() - 0.5);
    voices.forEach((agent, index) => {
      const text = index === 0 ? line.text : index < 3 ? (random() < 0.5 ? "♪" : "♪♪") : "";
      agent.react = { text, at: state.time + between(random, 0, 0.5), cheer: line.cue === "cheer" };
    });
  } else {
    const speaker = state.agents.find((agent) => agent.id === (line.by === "other" ? gathering.otherId : gathering.leadId));
    if (speaker !== undefined) {
      say(state, speaker, line.text, seconds);
    }
  }
  if (line.pose !== undefined) {
    gathering.pose = line.pose;
  }
  if (line.act !== undefined) {
    gathering.acts[line.act] = state.time;
    if (line.act === "serve") {
      for (const agent of participants(state, gathering)) {
        agent.snack = "cake";
      }
    }
  }
  if (line.cue !== undefined && line.by !== "crowd") {
    cueCrowd(state, gathering, crowd, line.cue, random);
  }
}

function cueCrowd(state: OfficeState, gathering: GatheringState, crowd: readonly Agent[], cue: GatherCue, random: Random): void {
  const delay = cue === "answer" ? [0.5, 2.2] : [0.4, 1.3];
  // A silence is one or two coughs; a question gets a few guesses.
  const share = cue === "crickets" ? 0.2 : cue === "answer" ? 0.5 : 0.65;
  for (const agent of crowd) {
    if (agent.mode !== "gather" || agent.path.length > 0) {
      continue;
    }
    const speaks = random() < share;
    const cheer = cue === "cheer" || cue === "applause" || (cue === "laugh" && random() < 0.4);
    if (!speaks && !cheer) {
      continue;
    }
    agent.react = {
      text: speaks ? gatherCrowdLine(gathering.kind, cue, personalityOf(agent.seed), random) : "",
      at: state.time + between(random, delay[0], delay[1]),
      cheer,
    };
  }
}

// A guy at a gathering: answers the last cue, and now and then says something to nobody.
function stepGatherer(state: OfficeState, agent: Agent, random: Random): void {
  const gathering = state.gathering;
  if (gathering === undefined) {
    return;
  }
  const react = agent.react;
  if (react !== undefined && state.time >= react.at) {
    agent.react = undefined;
    if (react.text !== "") {
      say(state, agent, react.text, 1.8);
    }
    if (react.cheer) {
      agent.cheerUntil = state.time + between(random, 1.2, 2.2);
    }
    agent.nextBubbleAt = state.time + between(random, 4, 9);
    return;
  }
  const leading = agent.id === gathering.leadId || agent.id === gathering.otherId || agent.id === gathering.turn?.id;
  if (!leading && gathering.phase === "on" && state.time >= agent.nextBubbleAt && agent.bubble === undefined) {
    agent.nextBubbleAt = state.time + between(random, 7, 16);
    if (random() < 0.4 * Math.min(1, talkOf(state))) {
      say(state, agent, gatherCrowdLine(gathering.kind, "idle", personalityOf(agent.seed), random), 1.6);
    }
  }
}

// The turn kinds: one guy at a time steps into the middle, the ones who haven't had a go first.
function stepTurn(state: OfficeState, gathering: GatheringState, random: Random): void {
  const style = GATHERINGS[gathering.kind].turns;
  const turn = gathering.turn;
  if (turn === undefined) {
    if (state.time < gathering.nextTurnAt || state.time > gathering.endsAt - 5) {
      return;
    }
    const ready = participants(state, gathering).filter((agent) => agent.mode === "gather" && agent.path.length === 0 && agent.id !== gathering.otherId);
    if (ready.length === 0) {
      return;
    }
    let fresh = ready.filter((agent) => !gathering.turnsTaken.includes(agent.id));
    if (fresh.length === 0) {
      gathering.turnsTaken = [];
      fresh = ready;
    }
    const next = fresh[Math.floor(random() * fresh.length)];
    gathering.turnsTaken.push(next.id);
    gathering.turn = { id: next.id, phase: "going", until: FOREVER, midAt: FOREVER, midDone: false };
    joinGathering(state, next, random);
    return;
  }
  const agent = state.agents.find((candidate) => candidate.id === turn.id);
  if (agent === undefined || turn.phase !== "doing") {
    return;
  }
  if (!turn.midDone && state.time >= turn.midAt) {
    turn.midDone = true;
    if (style === "fall") {
      turn.caught = random() < 0.75;
      const crowd = participants(state, gathering).filter((other) => other !== agent);
      for (const other of crowd) {
        if (random() < 0.55) {
          other.react = { text: turnCrowdLine("fall", turn.caught ? "good" : "bad", random), at: state.time + between(random, 0.1, 0.6), cheer: turn.caught && random() < 0.5 };
        }
      }
      agent.react = { text: fallerLine(turn.caught, random), at: state.time + 1.4, cheer: false };
    } else if (gathering.turnLines.length > 0) {
      say(state, agent, gathering.turnLines[Math.floor(random() * gathering.turnLines.length)], 2);
    }
  }
  if (state.time >= turn.until) {
    turn.phase = "back";
    agent.cheerUntil = 0;
    joinGathering(state, agent, random);
  }
}

function beginTurn(state: OfficeState, gathering: GatheringState, agent: Agent, random: Random): void {
  const turn = gathering.turn as GatheringTurn;
  const style = GATHERINGS[gathering.kind].turns;
  turn.phase = "doing";
  const length = style === "fall" ? between(random, 5, 6.5) : between(random, 5, 7.5);
  turn.until = state.time + length;
  turn.midAt = state.time + (style === "fall" ? 2 : length / 2);
  if (gathering.turnLines.length > 0) {
    say(state, agent, gathering.turnLines[Math.floor(random() * gathering.turnLines.length)], 2);
  }
  if (style === "fall") {
    return;
  }
  // The crowd hypes a dancer; a singer gets cheers or winces.
  const good = style === "dance" || random() < 0.65;
  for (const other of participants(state, gathering)) {
    if (other !== agent && random() < 0.5) {
      other.react = { text: turnCrowdLine(style ?? "dance", good ? "good" : "bad", random), at: state.time + between(random, 0.6, 2.5), cheer: good };
    }
  }
}

const DANCE_MOVES: readonly Pose[] = ["cheer", "punch", "yoga", "reach", "panic", "build", "cheer", "lift"];
const SPIN: readonly Facing[] = ["down", "left", "up", "right"];

function gatherPose(agent: Agent, gathering: GatheringState, time: number, phase: number): AgentPose {
  const spec = GATHERINGS[gathering.kind];
  const turn = gathering.turn;
  const talking = agent.bubble !== undefined;
  if (turn?.id === agent.id && turn.phase === "doing" && agent.path.length === 0) {
    switch (spec.turns) {
      case "dance": {
        const move = DANCE_MOVES[Math.floor(time / 1.1 + phase * 3) % DANCE_MOVES.length];
        const spinning = Math.floor(time / 1.1 + phase * 3) % 3 === 2;
        return {
          pose: move, facing: spinning ? SPIN[Math.floor(time * 6) % 4] : "down", frame: Math.floor(time * 4), seated: false,
          offset: { x: 0, y: -Math.round(Math.abs(Math.sin(time * 7)) * 3) },
        };
      }
      case "sing":
        return { pose: time < agent.cheerUntil ? "cheer" : "talk", facing: "down", frame: Math.floor(time * 5), seated: false };
      case "fall":
        if (turn.midDone) {
          return { pose: "down", facing: "down", frame: 0, seated: false, lying: true, resting: turn.caught === true };
        }
        return { pose: talking ? "talk" : "stand", facing: "up", frame: Math.floor(time * 5), seated: false };
    }
  }
  if (time < agent.cheerUntil) {
    return { pose: "cheer", facing: agent.facing, frame: Math.floor(time * 4 + phase * 2), seated: false };
  }
  const isLead = (agent.id === gathering.leadId || agent.id === gathering.otherId) && spec.turns === undefined;
  if (isLead || agent.gatherHost === true) {
    if (spec.duel === true) {
      return { pose: talking ? "talk" : "build", facing: agent.facing, frame: Math.floor(time * 2.5 + phase * 2), seated: false };
    }
    if (gathering.acts.douse !== undefined && time < gathering.acts.douse + 3.5) {
      return { pose: "build", facing: agent.facing, frame: Math.floor(time * 6), seated: false };
    }
    if (spec.crowd === "follow" && spec.lead === "yoga") {
      return groupPose(agent, gathering.pose, time, phase, talking);
    }
    const pose: Pose = spec.lead === "talk" ? (talking ? "talk" : "stand") : talking && spec.lead === "stand" ? "talk" : spec.lead;
    return { pose, facing: agent.facing, frame: Math.floor(time * 4), seated: false };
  }
  if (agent.snack !== undefined && !talking) {
    return { pose: "eat", facing: agent.facing, frame: Math.floor(time * 1.2 + phase * 2), seated: false };
  }
  if (spec.crowd === "follow") {
    return groupPose(agent, gathering.pose, time, phase, talking);
  }
  if (spec.crowd === "sit") {
    return { pose: "sit", facing: agent.facing, frame: 0, seated: true };
  }
  return { pose: talking ? "talk" : "stand", facing: agent.facing, frame: Math.floor(time * 5), seated: false };
}

function groupPose(agent: Agent, pose: GroupPose, time: number, phase: number, talking: boolean): AgentPose {
  switch (pose) {
    case "sit":
      return { pose: "sit", facing: agent.facing, frame: 0, seated: true };
    case "stretch":
      return { pose: "stretch", facing: agent.facing, frame: 0, seated: true };
    case "yoga":
      return { pose: "yoga", facing: agent.facing, frame: Math.floor(time * 0.25 + phase * 2), seated: false };
    case "cheer":
      return { pose: "cheer", facing: agent.facing, frame: 0, seated: false };
    case "down":
      return { pose: "down", facing: agent.facing, frame: 0, seated: false, lying: true, resting: true };
    default:
      return { pose: talking ? "talk" : "stand", facing: agent.facing, frame: Math.floor(time * 5), seated: false };
  }
}
