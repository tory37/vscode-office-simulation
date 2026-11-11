import type { Pose } from "./pixelGuy";
import { cueLine, RoleOutfit, ShowCue } from "./officePerformances";
import type { Personality } from "./officeVisitors";

// Pure: group gatherings. Now and then the whole room stops for something together: a yoga class, a fire safety
// lesson, a card duel, a dance circle, a birthday. The desks in the middle get pushed to the sides (officeLayout's
// pushDesksAside), every guy who isn't busy comes over, and it happens in the cleared middle. Some are led by someone
// who walks in for it (the yoga instructor, the fire marshal); the rest by one of the guys. Busy guys keep working.

export type GatheringKindId =
  | "yoga" | "fireSafety" | "cardDuel" | "danceCircle" | "birthday"
  | "allHands" | "trivia" | "karaoke" | "campfire" | "teamBuilding";

export const GATHERING_KINDS: readonly GatheringKindId[] = [
  "yoga", "fireSafety", "cardDuel", "danceCircle", "birthday", "allHands", "trivia", "karaoke", "campfire", "teamBuilding",
];

// ring: everyone in a circle around the middle, facing in. rows: in rows facing the lead at the front (the top of
// the cleared strip).
export type GatheringFormation = "ring" | "rows";

// What stands in the middle (or at the front): yoga mats under everyone, the marshal's demo bin, a card table, a
// cake, a projector screen, a mic stand, a campfire, a boombox, or nothing.
export type GatheringProp = "mats" | "fireDemo" | "cardTable" | "cake" | "screen" | "mic" | "campfire" | "boombox" | "none";

// The room's light while it's on: calm and warm, disco lights, a spotlight on the middle, the fire's flicker, or none.
export type GatheringEffect = "calm" | "disco" | "spotlight" | "flicker" | "none";

// What the guy in the middle does on his turn: busts moves, sings into the mic, or falls back into the crowd's arms.
export type TurnStyle = "dance" | "sing" | "fall";

// Poses everyone follows at once (the yoga class, stop drop and roll).
export type GroupPose = "stand" | "sit" | "yoga" | "stretch" | "cheer" | "down";

// Moments the view shows: the demo bin lights, the extinguisher puts it out, the candles blow out, the cake's served,
// a card is played, the screen's chart goes up.
export type GatherAct = "light" | "douse" | "blow" | "serve" | "play" | "chart";

// How the crowd answers a line: a show's cues, shouted guesses, an awkward silence, or wincing.
export type GatherCue = ShowCue | "answer" | "crickets" | "wince";

export interface GatheringSpec {
  id: GatheringKindId;
  label: string;
  // Someone who comes in to lead it, or undefined for one of the guys.
  host?: { title: string; outfit: RoleOutfit };
  formation: GatheringFormation;
  prop: GatheringProp;
  effect: GatheringEffect;
  // The crowd between cues: standing, sitting on the floor, or doing what the lead does.
  crowd: "stand" | "sit" | "follow";
  // The lead's pose while it's on.
  lead: Pose;
  // One guy at a time takes the middle.
  turns?: TurnStyle;
  // Two guys face off across the middle: the lead and another.
  duel?: boolean;
  // Seconds, low and high.
  length: readonly [number, number];
  // Guys from the room it needs (besides a host).
  minGuys: number;
}

export const GATHERINGS: Record<GatheringKindId, GatheringSpec> = {
  yoga: {
    id: "yoga", label: "Yoga Class", formation: "rows", prop: "mats", effect: "calm", crowd: "follow", lead: "yoga", length: [50, 70], minGuys: 1,
    host: { title: "Yoga Instructor", outfit: { shirt: "#7FD1B9", pants: "#3B3355", accessory: "none" } },
  },
  fireSafety: {
    id: "fireSafety", label: "Fire Safety", formation: "rows", prop: "fireDemo", effect: "none", crowd: "follow", lead: "talk", length: [50, 70], minGuys: 1,
    host: { title: "Fire Marshal", outfit: { shirt: "#C0392B", pants: "#2C2C34", accessory: "cap", accessoryColor: "#F1C40F" } },
  },
  cardDuel: {
    id: "cardDuel", label: "Card Duel", formation: "ring", prop: "cardTable", effect: "spotlight", crowd: "stand", lead: "build", duel: true, length: [45, 65], minGuys: 2,
  },
  danceCircle: {
    id: "danceCircle", label: "Dance Circle", formation: "ring", prop: "boombox", effect: "disco", crowd: "stand", lead: "cheer", turns: "dance", length: [50, 75], minGuys: 2,
  },
  birthday: {
    id: "birthday", label: "Birthday Party", formation: "ring", prop: "cake", effect: "none", crowd: "stand", lead: "stand", length: [40, 55], minGuys: 2,
  },
  allHands: {
    id: "allHands", label: "All-Hands Meeting", formation: "rows", prop: "screen", effect: "none", crowd: "sit", lead: "talk", length: [45, 65], minGuys: 1,
    host: { title: "CEO", outfit: { shirt: "#2C3E50", pants: "#1C2833", accessory: "none", tie: "#C0392B" } },
  },
  trivia: {
    id: "trivia", label: "Trivia Quiz", formation: "rows", prop: "mic", effect: "spotlight", crowd: "stand", lead: "talk", length: [50, 70], minGuys: 1,
    host: { title: "Quiz Master", outfit: { shirt: "#8E44AD", pants: "#22252E", accessory: "glasses", accessoryColor: "#222831", tie: "#F1C40F" } },
  },
  karaoke: {
    id: "karaoke", label: "Karaoke", formation: "ring", prop: "mic", effect: "spotlight", crowd: "stand", lead: "cheer", turns: "sing", length: [50, 75], minGuys: 2,
  },
  campfire: {
    id: "campfire", label: "Campfire Stories", formation: "ring", prop: "campfire", effect: "flicker", crowd: "sit", lead: "talk", length: [45, 60], minGuys: 2,
  },
  teamBuilding: {
    id: "teamBuilding", label: "Team Building", formation: "ring", prop: "none", effect: "none", crowd: "stand", lead: "talk", turns: "fall", length: [45, 65], minGuys: 2,
    host: { title: "Team Coach", outfit: { shirt: "#2E86DE", pants: "#2E86DE", accessory: "cap", accessoryColor: "#F4F4F4" } },
  },
};

// Who says a line: the lead, the other duelist, or the crowd together.
export type GatherSpeaker = "lead" | "other" | "crowd";

export interface GatherLine {
  text: string;
  by?: GatherSpeaker;
  cue?: GatherCue;
  // Everyone following the lead takes this pose from here on.
  pose?: GroupPose;
  act?: GatherAct;
}

export interface GatheringPlan {
  kind: GatheringKindId;
  title: string;
  // Said when it starts, before the desks move: the lead calling everyone over.
  call: string;
  lines: GatherLine[];
  closer: GatherLine;
  length: number;
  // What the guy in the middle says on his turn, for the turn kinds.
  turnLines: readonly string[];
}

const YOGA_FILLER: readonly GatherLine[] = [
  { text: "Let go of that merge conflict." },
  { text: "Wobbling is fine. Wobbling is growth.", cue: "laugh" },
  { text: "Breathe into your tight deadlines." },
  { text: "Your inbox can wait. It always waits." },
  { text: "Feel your spine compile." },
];

const ALL_HANDS_FILLER: readonly GatherLine[] = [
  { text: "Q3 was… a learning opportunity.", cue: "laugh" },
  { text: "Revenue is up! Ish.", act: "chart", cue: "applause" },
  { text: "We're pivoting to AI.", cue: "gasp" },
  { text: "Synergy. Alignment. Velocity.", cue: "crickets" },
  { text: "Our values: ship it, then fix it.", cue: "laugh" },
  { text: "Remember, we're a family. A family with OKRs." },
  { text: "Big news: new coffee machine!", cue: "cheer" },
];

const TRIVIA: readonly [string, string][] = [
  ["What does HTTP stand for?", "HyperText Transfer Protocol!"],
  ["How many bits in a byte?", "Eight! Correct!"],
  ["When did Unix time start?", "1970! Point to that table!"],
  ["Tabs or spaces?", "Trick question. Both are wrong."],
  ["The answer to everything?", "42! Obviously!"],
  ["It's not DNS. There's no way it's DNS…", "It was DNS."],
  ["What's 0.1 + 0.2?", "0.30000000000000004!"],
  ["How do you exit Vim?", "Nobody knows!"],
  ["What does SQL stand for?", "Structured Query Language!"],
  ["What's the first rule of prod?", "Never deploy on Friday!"],
  ["What color is a failing build?", "Red! Too easy!"],
];

const TRIVIA_GUESSES: readonly string[] = [
  "42!", "JavaScript!", "is it DNS?", "1970!", "tabs!", "spaces!", "uhh… Python?", "the cloud?", "segfault!", "pass",
  "C!", "ooh! ooh! um…", "Linus!", "a byte!", "no idea", "Stack Overflow!",
];

const CARD_PLAYS: readonly string[] = [
  "I summon Segfault Dragon! Attack mode!", "I play Infinite Loop, face down.", "Legacy Codebase! 9000 defense!",
  "Activate Hotfix! Plus 500 life points!", "I sacrifice two interns to summon… the CTO!", "Trap card! Breaking Change!",
  "Counter! Rollback!", "I equip Rubber Duck +3!", "You've triggered my Code Review!", "Draw! …it's another Jira ticket.",
  "Blue Screen Dragon! Attack!", "Pot of Coffee! I draw two!", "Spaghetti Code! Your monsters are tangled!",
  "Reverse card! Your bug is my feature!", "Merge Conflict! Nobody moves!",
];

const CARD_WINS: readonly string[] = [
  "Final move: Rubber Duck of Debugging! I win!", "Zero Downtime! Your life points are gone!", "Green Build! It's over!",
];

const CAMPFIRE_STORIES: readonly GatherLine[][] = [
  [
    { text: "It was a dark and stormy deploy…" },
    { text: "Friday, 4:59 PM. Someone typed git push --force.", cue: "gasp" },
    { text: "The build went red. Then the logs went silent…" },
    { text: "And from the server room, a voice whispered…" },
    { text: "\"It works on my machine…\"", cue: "gasp" },
    { text: "They say that bug is still out there." },
    { text: "…in production.", cue: "gasp" },
  ],
  [
    { text: "Long ago, there was a dev who never wrote tests." },
    { text: "Every night, his code worked. Every morning, it didn't.", cue: "gasp" },
    { text: "One night he stayed late to find out why…" },
    { text: "He opened the file. The last commit was… his own.", cue: "gasp" },
    { text: "From three years ago. Message: 'temp fix'." },
    { text: "BOO!", cue: "gasp" },
  ],
  [
    { text: "Have you heard of the haunted ticket?" },
    { text: "It's been 'in progress' since 2019." },
    { text: "Whoever's assigned to it… vanishes.", cue: "gasp" },
    { text: "Last week, I checked the board." },
    { text: "It's assigned to… YOU!", cue: "gasp" },
  ],
];

const DANCE_MOVES: readonly string[] = [
  "*the robot*", "*moonwalk*", "*the worm*", "*breakdance!*", "watch this!", "*spins*", "*the floss*", "*the sprinkler*",
  "*windmill!*", "*does the running man*", "*disco finger*", "old school!",
];

const KARAOKE_LYRICS: readonly string[] = [
  "♪ I will survive… this sprint ♪", "♪ Don't stop deployin' ♪", "♪ We are the champions… of QA ♪",
  "♪ Never gonna push to prod ♪", "♪ Bohemian refactor-y ♪", "♪ Total eclipse of the build ♪", "♪ I want it that way… (in TypeScript) ♪",
  "♪ Livin' on a merge ♪", "♪ Hit me baby one more ticket ♪", "♪ Sweet caroline… (BUM BUM BUM) ♪",
];

const TRUST_LINES: readonly string[] = ["Catch me!", "Trust the process…", "Here goes!", "I trust you guys. Mostly.", "Don't drop me!", "Falling in 3, 2…"];

export function planGathering(random: () => number, kind: GatheringKindId = pick(GATHERING_KINDS, random)): GatheringPlan {
  const spec = GATHERINGS[kind];
  const length = spec.length[0] + random() * (spec.length[1] - spec.length[0]);
  const base = { kind, title: spec.host?.title ?? spec.label, length, turnLines: [] as readonly string[] };
  switch (kind) {
    case "yoga": {
      const [first, second] = sample(YOGA_FILLER, 2, random);
      return {
        ...base,
        call: "Yoga break! Desks to the sides, mats out!",
        lines: [
          { text: "Find your mat. Breathe in…", pose: "stand" },
          { text: "Arms up! Sun salutation!", pose: "cheer" },
          first,
          { text: "Tree pose. Find your balance.", pose: "yoga" },
          second,
          { text: "Now sit. Reach for your toes.", pose: "stretch" },
          { text: "And lie back. Savasana.", pose: "down" },
          { text: "No snoring, please.", cue: "laugh" },
        ],
        closer: { text: "Namaste, everyone!", cue: "applause", pose: "stand" },
      };
    }
    case "fireSafety":
      return {
        ...base,
        call: "Fire safety class! Clear the floor!",
        lines: [
          { text: "Morning! Today: fire safety." },
          { text: "Rule one: know your exits." },
          { text: "Rule two: no microwaving fish.", cue: "laugh" },
          { text: "Now, a small demonstration…", act: "light", cue: "gasp" },
          { text: "Don't panic! Pull, aim, squeeze, sweep!", act: "douse", cue: "applause" },
          { text: "And if YOU catch fire?" },
          { text: "Stop, drop, and roll!", pose: "down" },
          { text: "Good! Up you get.", pose: "stand" },
        ],
        closer: { text: "Stay safe out there!", cue: "applause" },
      };
    case "cardDuel": {
      const plays = sample(CARD_PLAYS, 6, random);
      const leadWins = random() < 0.5;
      return {
        ...base,
        call: "Card duel! Push the desks back!",
        lines: [
          { text: "It's time to duel!", by: "lead", cue: "cheer" },
          ...plays.map((text, index): GatherLine => ({ text, by: index % 2 === 0 ? "lead" : "other", act: "play", cue: random() < 0.6 ? "gasp" : "cheer" })),
          { text: pick(CARD_WINS, random), by: leadWins ? "lead" : "other", act: "play", cue: "cheer" },
        ],
        closer: { text: "Good game. Rematch tomorrow.", by: leadWins ? "other" : "lead", cue: "applause" },
      };
    }
    case "danceCircle":
      return {
        ...base,
        call: "Dance circle! Desks out of the way!",
        lines: [{ text: "Everybody in!", cue: "cheer" }, { text: "Who's next?!" }, { text: "Show us what you got!", cue: "cheer" }, { text: "One more!" }],
        closer: { text: "Best dance circle ever!", by: "crowd", cue: "cheer" },
        turnLines: DANCE_MOVES,
      };
    case "birthday":
      return {
        ...base,
        call: "Wait, what's going on? A party? For me?!",
        lines: [
          { text: "♪ Happy birthday to you ♪", by: "crowd" },
          { text: "♪ Happy birthday to you ♪", by: "crowd" },
          { text: "♪ Happy birthday, dear… uh… ♪", by: "crowd", cue: "laugh" },
          { text: "♪ Happy birthday to you! ♪", by: "crowd", cue: "cheer" },
          { text: "Okay… make a wish…" },
          { text: "*fwoosh*", act: "blow", cue: "applause" },
          { text: "Cake for everyone!", act: "serve", cue: "cheer" },
          { text: "Best birthday ever." },
        ],
        closer: { text: "Thanks, everyone! Back to work, I guess.", cue: "applause" },
      };
    case "allHands":
      return {
        ...base,
        call: "All-hands! Everyone, grab a spot on the floor!",
        lines: [
          { text: "Thanks for coming, team!" },
          ...sample(ALL_HANDS_FILLER, 4, random),
          { text: "Any questions?", cue: "crickets" },
          { text: "Great! Pizza's in the kitchen.", cue: "cheer" },
        ],
        closer: { text: "Let's crush Q4!", cue: "applause" },
      };
    case "trivia":
      return {
        ...base,
        call: "Trivia time! Desks back, brains on!",
        lines: [
          { text: "Welcome to Office Trivia!", cue: "cheer" },
          ...sample(TRIVIA, 4, random).flatMap(([question, answer]): GatherLine[] => [{ text: question, cue: "answer" }, { text: answer, cue: random() < 0.5 ? "cheer" : "laugh" }]),
        ],
        closer: { text: "That's the quiz! Everyone gets a sticker!", cue: "cheer" },
      };
    case "karaoke":
      return {
        ...base,
        call: "Karaoke! Push the desks back!",
        lines: [{ text: "Who's first?!", cue: "cheer" }, { text: "Give it up for the singer!", cue: "applause" }, { text: "Next!" }],
        closer: { text: "♪ Goodnight, office! ♪", by: "crowd", cue: "cheer" },
        turnLines: KARAOKE_LYRICS,
      };
    case "campfire":
      return {
        ...base,
        call: "Campfire stories! Gather round, desks back!",
        lines: [{ text: "Gather round… I have a story." }, ...pick(CAMPFIRE_STORIES, random)],
        closer: { text: "The end. Sleep tight!", cue: "applause" },
      };
    case "teamBuilding":
      return {
        ...base,
        call: "Team building! Desks to the walls!",
        lines: [
          { text: "Trust falls! One at a time." },
          { text: "Remember: we're a team!" },
          { text: "Catch with your hearts!", cue: "laugh" },
          { text: "Next!" },
        ],
        closer: { text: "Great job, team! Synergy achieved!", cue: "applause" },
        turnLines: TRUST_LINES,
      };
  }
}

// What a guy in the crowd says: his answer to a cue, or now and then something to nobody ("idle").
const IDLE_LINES: Record<GatheringKindId, readonly string[]> = {
  yoga: ["*breathes*", "my hamstrings…", "*creak*", "namaste", "is this the burpee one?", "*wobbles*", "ommm"],
  fireSafety: ["*takes notes*", "is that real fire?", "where's the exit again?", "can I hold the extinguisher?", "*nods*"],
  cardDuel: ["ooh", "rookie move", "he's bluffing", "*holds breath*", "I have that card", "that's not legal", "*shuffles*"],
  danceCircle: ["♪", "*claps*", "*dances*", "ayy!", "next!", "*bops*"],
  birthday: ["*party horn*", "nom", "best cake", "*blows a kazoo*", "how old?", "speech!"],
  allHands: ["*yawn*", "*checks phone*", "is there pizza?", "synergy…", "*takes notes*", "this could've been an email"],
  trivia: ["ooh I know this", "tip of my tongue…", "*whispers answer*", "rigged", "*buzzes*"],
  karaoke: ["♪", "*sways*", "my ears…", "encore!", "*lighter up*", "sing it!"],
  campfire: ["*shivers*", "*roasts a marshmallow*", "it's just a story… right?", "*hugs knees*", "*crackle*"],
  teamBuilding: ["is this mandatory?", "*stretches*", "I trust no one", "*cracks knuckles*", "we got you!"],
};

const CRICKETS = ["…", "*cough*", "*crickets*", "…", "*looks at shoes*"];
const WINCES = ["*covers ears*", "oof", "*winces*", "…brave", "pitch perfect! (not)"];

export function gatherCrowdLine(kind: GatheringKindId, cue: GatherCue | "idle", personality: Personality, random: () => number): string {
  switch (cue) {
    case "idle":
      return pick(IDLE_LINES[kind], random);
    case "answer":
      return pick(TRIVIA_GUESSES, random);
    case "crickets":
      return pick(CRICKETS, random);
    case "wince":
      return pick(WINCES, random);
    default:
      return cueLine(cue, personality, random);
  }
}

// The crowd during someone's turn in the middle: cheering a dancer, a singer good or bad, catching a faller or not.
export function turnCrowdLine(style: TurnStyle, outcome: "good" | "bad", random: () => number): string {
  switch (style) {
    case "dance":
      return pick(["GO! GO! GO!", "AYYY!", "WOOO!", "*claps*", "yeah!", "get it!"], random);
    case "sing":
      return outcome === "good" ? pick(["WOOO!", "sing it!", "*lighter up*", "encore!", "♪♪"], random) : pick(WINCES, random);
    case "fall":
      return outcome === "good" ? pick(["got you!", "caught!", "teamwork!", "we got you!"], random) : pick(["…oops", "my bad", "butterfingers", "*steps back*"], random);
  }
}

// The faller's line once he's down: caught, or not.
export function fallerLine(caught: boolean, random: () => number): string {
  return caught ? pick(["I feel so trusted!", "wow. teamwork.", "again!"], random) : pick(["I'm okay!", "…worth it", "ow.", "noted."], random);
}

// How often a gathering comes (officeSim.gatherings), as minutes between them.
export type GatheringFrequency = "off" | "rare" | "normal" | "often";

export const GATHERING_FREQUENCIES: Record<Exclude<GatheringFrequency, "off">, readonly [number, number]> = {
  rare: [40, 80],
  normal: [15, 30],
  often: [5, 10],
};

export function gatheringFrequency(value: unknown): GatheringFrequency {
  if (value === false) {
    return "off";
  }
  return value === "off" || (typeof value === "string" && value in GATHERING_FREQUENCIES) ? (value as GatheringFrequency) : "normal";
}

// Seconds until the next gathering; the first one comes a little sooner.
export function gatheringGap(random: () => number, frequency: Exclude<GatheringFrequency, "off"> = "normal", first = false): number {
  const [low, high] = GATHERING_FREQUENCIES[frequency];
  const minutes = first ? low * (0.5 + random() * 0.5) : low + random() * (high - low);
  return minutes * 60;
}

export function isGatheringKind(value: unknown): value is GatheringKindId {
  return typeof value === "string" && (GATHERING_KINDS as readonly string[]).includes(value);
}

function pick<T>(list: readonly T[], random: () => number): T {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

function sample<T>(list: readonly T[], count: number, random: () => number): T[] {
  const pool = [...list];
  const result: T[] = [];
  while (result.length < count && pool.length > 0) {
    result.push(pool.splice(Math.min(pool.length - 1, Math.floor(random() * pool.length)), 1)[0]);
  }
  return result;
}
