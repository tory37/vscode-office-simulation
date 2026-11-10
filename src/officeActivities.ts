// Pure: the things to do in the Office between jobs. The maintenance crew brings them in on empty desk spots and
// takes them out again now and then, so the room changes. How many stand depends on the room's free spots and the
// officeSim.activities setting. Idle guys go use them: some alone, some take turns, and the table games need two.

import type { Facing, Pose } from "./pixelGuy";

export type ActivityKindId =
  | "pinball" | "arcade" | "arcadeDuo" | "clawMachine" | "hoops" | "dartboard" | "karaoke" | "jukebox"
  | "pingPong" | "foosball" | "airHockey" | "chess"
  | "punchingBag" | "treadmill" | "exerciseBike" | "piano" | "easel"
  | "yogaMat" | "weights" | "trampoline" | "beanbag" | "massageChair" | "meditation" | "vr";

// Where it stands on a desk spot (the desk tile, and the seat tile below it):
// machine: on the desk tile, used from the seat tile, facing up.
// floor: on the seat tile; the guy stands or sits on it.
// table: across a pair of desk tiles; the players stand at its two ends, facing in.
// pair: one on each desk tile of a pair, each used from the seat tile below it.
export type ActivityShape = "machine" | "floor" | "table" | "pair";

// solo: one guy. turns: one plays, a buddy waits beside him, and they swap. versus: two face off, and it needs both.
// side: each spot on its own, side by side.
export type ActivityPlay = "solo" | "turns" | "versus" | "side";

export interface ActivitySpec {
  label: string;
  shape: ActivityShape;
  play: ActivityPlay;
  // The player's pose; a floor activity also says which way he faces.
  pose: Pose;
  facing?: Facing;
  seated?: boolean;
  // Bounces in place (the trampoline), or shakes a little (the massage chair).
  hop?: boolean;
  shake?: boolean;
  // How long a go at it lasts, in seconds, and a turn when they take turns.
  seconds: readonly [number, number];
  lines: readonly string[];
  // Said by the winner and the loser of a versus game, or the buddy waiting his turn.
  win?: readonly string[];
  lose?: readonly string[];
  cheer?: readonly string[];
  // A screen or lights that glow at night.
  glow?: string;
}

const TURN_CHEERS = ["my turn next", "go go go", "ooh, close", "nice!", "you got this", "come on…", "lemme try"];

export const ACTIVITIES: Record<ActivityKindId, ActivitySpec> = {
  pinball: {
    label: "Pinball", shape: "machine", play: "turns", pose: "build", seconds: [40, 80], glow: "#FF7AD9",
    lines: ["multiball!", "TILT—no no no", "come on, come on", "extra ball!", "the flippers hate me", "jackpot!", "nudge it…"],
    cheer: [...TURN_CHEERS, "hit the ramp!", "multiball, do it"],
  },
  arcade: {
    label: "Arcade cabinet", shape: "machine", play: "turns", pose: "build", seconds: [35, 70], glow: "#6EE7FF",
    lines: ["new high score", "one more life…", "boss fight", "pew pew", "hadouken!", "insert coin"],
    cheer: [...TURN_CHEERS, "jump! JUMP!", "behind you"],
  },
  arcadeDuo: {
    label: "Two arcade cabinets", shape: "pair", play: "side", pose: "build", seconds: [30, 60], glow: "#B98CFF",
    lines: ["race you", "level 9!", "pew pew", "co-op time", "dodge!", "game over? again?"],
  },
  clawMachine: {
    label: "Claw machine", shape: "machine", play: "turns", pose: "build", seconds: [25, 45], glow: "#FFD25E",
    lines: ["got it… got it…", "it dropped it!", "rigged", "the pink one", "one more try", "YES. a duck."],
    cheer: [...TURN_CHEERS, "left, left!", "it's rigged, man"],
  },
  hoops: {
    label: "Arcade hoops", shape: "machine", play: "turns", pose: "punch", seconds: [25, 45], glow: "#FF9A4D",
    lines: ["swish", "nothing but net", "brick.", "on fire!", "buzzer beater", "three!"],
    cheer: [...TURN_CHEERS, "from downtown"],
  },
  dartboard: {
    label: "Dartboard", shape: "machine", play: "turns", pose: "punch", seconds: [30, 55],
    lines: ["bullseye!", "triple twenty", "missed the board", "oops, the wall", "double out", "lucky shot"],
    cheer: [...TURN_CHEERS, "watch the wall"],
  },
  karaoke: {
    label: "Karaoke", shape: "machine", play: "turns", pose: "talk", seconds: [30, 50], glow: "#FF6FAE",
    lines: ["♪ don't stop believin' ♪", "♪ la la laaa ♪", "♪ is this the real life ♪", "♪ ooh baby ♪", "*hits the high note*", "♪ we will rock you ♪"],
    cheer: [...TURN_CHEERS, "encore!", "duet next"],
  },
  jukebox: {
    label: "Jukebox", shape: "machine", play: "solo", pose: "build", seconds: [12, 20], glow: "#FFB347",
    lines: ["this one's a banger", "B-7, the classic", "something chill", "who picked that last one", "♪"],
  },
  pingPong: {
    label: "Ping pong", shape: "table", play: "versus", pose: "build", seconds: [35, 70],
    lines: ["ping", "pong", "spin serve", "net!", "11–9", "rally!", "smash!", "edge ball, sorry"],
    win: ["game!", "too easy", "rematch?"], lose: ["best of three", "lucky", "ugh, the net"],
  },
  foosball: {
    label: "Foosball", shape: "table", play: "versus", pose: "build", seconds: [35, 60],
    lines: ["no spinning!", "goal!", "the goalie!", "*rattle rattle*", "nice pass", "own goal…"],
    win: ["GOAL! game!", "foos master"], lose: ["you spun", "rematch."],
  },
  airHockey: {
    label: "Air hockey", shape: "table", play: "versus", pose: "build", seconds: [30, 50], glow: "#7FE3FF",
    lines: ["*clack*", "bank shot!", "goal!", "blocked", "it went off the table", "so fast"],
    win: ["7–5, done", "too slow"], lose: ["next time", "my wrist"],
  },
  chess: {
    label: "Chess", shape: "table", play: "versus", pose: "build", seconds: [60, 110],
    lines: ["hmm.", "your move", "check.", "interesting…", "en passant!", "*taps clock*", "wait, no"],
    win: ["checkmate.", "good game"], lose: ["I resign", "good game"],
  },
  punchingBag: {
    label: "Punching bag", shape: "machine", play: "turns", pose: "punch", seconds: [25, 45],
    lines: ["hya!", "one-two", "that's for the merge conflict", "pow", "that's for the flaky test", "huff… huff…"],
    cheer: ["hold the bag", "your form!", "harder!", "rocky!"],
  },
  treadmill: {
    label: "Treadmill", shape: "machine", play: "solo", pose: "walk", seconds: [30, 60],
    lines: ["one more mile", "cardio", "walking meeting", "10,000 steps", "huff…"],
  },
  exerciseBike: {
    label: "Exercise bike", shape: "machine", play: "solo", pose: "type", seated: true, seconds: [30, 60],
    lines: ["climbing a hill", "spin class", "legs. burning.", "tour de office", "pedal pedal"],
  },
  piano: {
    label: "Piano", shape: "machine", play: "turns", pose: "type", seated: true, seconds: [30, 60],
    lines: ["♪ chopsticks ♪", "♪ plink plonk ♪", "♪ heart and soul ♪", "*dramatic chord*", "♪ moonlight… ♪"],
    cheer: ["play the other part", "do the bit!", "bravo", "my turn on keys"],
  },
  easel: {
    label: "Easel", shape: "machine", play: "solo", pose: "build", seconds: [30, 60],
    lines: ["happy little trees", "it's abstract", "a self-portrait", "needs more blue", "art."],
  },
  yogaMat: {
    label: "Yoga mat", shape: "floor", play: "solo", pose: "yoga", facing: "down", seconds: [30, 60],
    lines: ["namaste", "tree pose", "breathe in…", "…and out", "inner peace", "my back cracked"],
  },
  weights: {
    label: "Weights", shape: "floor", play: "turns", pose: "lift", facing: "down", seconds: [25, 45],
    lines: ["one more rep", "feel the burn", "light weight!", "hnngh", "leg day? never"],
    cheer: ["spot me next", "push!", "you got it", "two more!"],
  },
  trampoline: {
    label: "Trampoline", shape: "floor", play: "solo", pose: "cheer", facing: "down", hop: true, seconds: [20, 35],
    lines: ["boing", "wheee", "higher!", "don't tell facilities", "boing boing"],
  },
  beanbag: {
    label: "Beanbag", shape: "floor", play: "solo", pose: "type", facing: "down", seated: true, seconds: [40, 80],
    lines: ["just one more level", "handheld time", "*beep boop*", "save point", "comfy"],
  },
  massageChair: {
    label: "Massage chair", shape: "floor", play: "solo", pose: "sit", facing: "down", seated: true, shake: true, seconds: [35, 60],
    lines: ["ahhh", "right there", "brrrrr", "best chair", "the knots…"],
  },
  meditation: {
    label: "Meditation cushion", shape: "floor", play: "solo", pose: "sit", facing: "down", seated: true, seconds: [40, 70],
    lines: ["ommm", "…", "clearing the cache", "be the code", "zen"],
  },
  vr: {
    label: "VR headset", shape: "floor", play: "solo", pose: "cheer", facing: "down", seconds: [25, 45],
    lines: ["whoa", "there's a dragon!", "am I near a wall?", "it's so real", "duck!", "I'm flying"],
  },
};

export const ACTIVITY_KINDS = Object.keys(ACTIVITIES) as ActivityKindId[];

export function isActivityKind(value: unknown): value is ActivityKindId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ACTIVITIES, value);
}

// How many desk spots it takes.
export function activityWidth(kind: ActivityKindId): number {
  const shape = ACTIVITIES[kind].shape;
  return shape === "table" || shape === "pair" ? 2 : 1;
}

export type ActivityLevel = "off" | "few" | "some" | "lots";

export function activityLevel(value: unknown): ActivityLevel {
  return value === "off" || value === "few" || value === "lots" ? value : "some";
}

// How many activities the room holds for its free desk spots: a share of them, with a cap, and none when there are
// only one or two.
export function activityTarget(level: ActivityLevel, freeSpots: number): number {
  if (level === "off" || freeSpots < 2) {
    return 0;
  }
  const share = { few: 4, some: 2.5, lots: 1.5 }[level];
  const cap = { few: 3, some: 6, lots: 10 }[level];
  return Math.min(cap, Math.max(1, Math.floor(freeSpots / share)));
}

// How often the crew swaps one out for something new (officeSim.activitySwaps). never: they stay until a guy needs the
// spot or the count changes.
export type ActivitySwaps = "never" | "rare" | "normal" | "often";

export function activitySwaps(value: unknown): ActivitySwaps {
  return value === "never" || value === "rare" || value === "often" ? value : "normal";
}

// How long one stands before the crew swaps it for something else, in seconds.
const STAY_SECONDS: Record<ActivitySwaps, readonly [number, number]> = {
  never: [Infinity, Infinity], rare: [360, 720], normal: [120, 300], often: [45, 100],
};

// The gap between the crew's trips for them.
const TRIP_SECONDS: Record<ActivitySwaps, readonly [number, number]> = {
  never: [15, 40], rare: [30, 70], normal: [15, 40], often: [6, 15],
};

export function activityStay(random: () => number, swaps: ActivitySwaps = "normal"): number {
  const [low, high] = STAY_SECONDS[swaps];
  return low === Infinity ? Infinity : low + random() * (high - low);
}

export function activityTripGap(random: () => number, swaps: ActivitySwaps = "normal"): number {
  const [low, high] = TRIP_SECONDS[swaps];
  return low + random() * (high - low);
}

// A kind to bring in: one the room doesn't have yet when it can, of a width that fits.
export function pickActivityKind(random: () => number, standing: readonly ActivityKindId[], fits: (kind: ActivityKindId) => boolean): ActivityKindId | undefined {
  const fitting = ACTIVITY_KINDS.filter(fits);
  const fresh = fitting.filter((kind) => !standing.includes(kind));
  const pool = fresh.length > 0 ? fresh : fitting;
  return pool.length === 0 ? undefined : pool[Math.floor(random() * pool.length) % pool.length];
}

// What the crew says bringing one in.
export const CREW_ITEM_LINES = ["delivery!", "where's this one go?", "one, as ordered", "watch your toes", "facilities says hi", "fun's here"];
