import type { Accessory, HairStyle, PixelGuyLook } from "./pixelGuy";
import type { RaceId } from "./pixelRaces";
import type { Personality } from "./officeVisitors";

// Pure: the invasions that hit the Office now and then. Aliens, zombies, raiders, or vampires come through and trash
// the place. Nobody gets hurt for real: the guys run around screaming, hide, and get zapped, bitten, bonked, or
// tackled, and fall down seeing stars. Then the invaders leave, the guys come to one by one, look around, say
// something like "wow, that was weird", dust themselves off, sweep up the mess, and get back to it.
// It's cartoon trouble, never gore: a vampire "drinks" with a SLURP! and his guy goes pale, a zombie's bite turns his
// guy green for a bit, an alien's zap puts his guy to sleep or floats him up in a beam.

export type InvasionKindId = "aliens" | "zombies" | "raiders" | "vampires";

export const INVASION_KINDS: readonly InvasionKindId[] = ["aliens", "zombies", "raiders", "vampires"];

// How the invaders come in and go out: through the door, beamed down and up, or in a puff of smoke (and out as bats).
export type InvaderEntry = "door" | "beam" | "smoke";
export type InvaderExit = "door" | "beam" | "bats";

// What a hit does. bite: down, then up again as a zombie who chases the rest. drink: a tackle, then a slurp that
// leaves him pale. zap: from a few tiles off; down, or up in a beam until they leave. bonk: down with stars.
export type InvaderAttack = "bite" | "drink" | "zap" | "bonk";

// The mess they leave, swept up after.
export type DebrisKind = "papers" | "mug" | "goo" | "scorch" | "cans" | "cobweb" | "plant";

export const DEBRIS_KINDS: readonly DebrisKind[] = ["papers", "mug", "goo", "scorch", "cans", "cobweb", "plant"];

export interface InvaderOutfit {
  race: RaceId;
  shirt: string;
  pants: string;
  hair?: string;
  hairStyle?: HairStyle;
  accessory?: Accessory;
  accessoryColor?: string;
  tie?: string;
  sleeveless?: boolean;
}

// An outfit's clothes and hair, to lay over a look that already has the race.
export function invaderClothes(outfit: InvaderOutfit): Partial<PixelGuyLook> {
  const { race: _race, ...clothes } = outfit;
  return clothes;
}

export interface InvasionSpec {
  id: InvasionKindId;
  label: string;
  // Across the top of the room as it starts.
  banner: string;
  // What one invader is called, for his name tag.
  titles: readonly string[];
  outfit: InvaderOutfit;
  // A second race some of them have (grey aliens beside the green ones).
  altRace?: RaceId;
  entry: InvaderEntry;
  exit: InvaderExit;
  attack: InvaderAttack;
  // Tiles a second, on the hunt; the guys run at FLEE_SPEED.
  speed: number;
  // How close he has to get, in tiles, and how long a strike takes.
  reach: number;
  strikeSeconds: number;
  // Seconds he catches his breath after a strike.
  rest: number;
  // How many come in: a base, plus one for every so many guys in the room, up to MAX_INVADERS.
  base: number;
  perGuys: number;
  // How often each one stops to trash something, in seconds.
  trashEvery: readonly [number, number];
  // The words that pop up on a hit, and on trashing something.
  hitWords: readonly string[];
  trashWords: readonly string[];
  debris: readonly DebrisKind[];
  // The room's tint while they're here.
  tint: string;
  // What the room says when the lights flicker, before anyone shows up.
  warning: readonly string[];
  // What the invaders say on the hunt, and on the way out.
  taunts: readonly string[];
  exitLines: readonly string[];
  // What the guys scream about them, what a guy says when one gets him, and what he says when he comes to.
  screams: readonly string[];
  caught: readonly string[];
  wake: readonly string[];
}

export const MAX_INVADERS = 6;
export const FLEE_SPEED = 4.2;

export const INVASIONS: Record<InvasionKindId, InvasionSpec> = {
  aliens: {
    id: "aliens",
    label: "Alien Invasion",
    banner: "ALIEN INVASION",
    titles: ["Zorp", "Glarb", "Xix", "Blorbo", "Qwib", "Mmrk"],
    outfit: { race: "greenAlien", shirt: "#B8C4CC", pants: "#5B6770", accessory: "none" },
    altRace: "greyAlien",
    entry: "beam",
    exit: "beam",
    attack: "zap",
    speed: 2.6,
    reach: 2.4,
    strikeSeconds: 0.9,
    rest: 4,
    base: 2,
    perGuys: 5,
    trashEvery: [8, 14],
    hitWords: ["ZAP!", "BZZT!", "PEW!", "ZORT!"],
    trashWords: ["ZAP!", "FZZT!", "PEW PEW!"],
    debris: ["papers", "scorch", "goo", "scorch"],
    tint: "#3DFF8A",
    warning: ["did the lights just…", "what's that hum?", "is that… a UFO?", "why is it green in here?", "uh, guys?"],
    taunts: ["TAKE US TO YOUR LEAD DEV", "*beep boop*", "PUNY CODERS", "WE COME IN PEACE (no)", "PROBE THEM", "what is… 'Jira'?", "SPECIMEN ACQUIRED"],
    exitLines: ["WE WILL RETURN", "*beep*", "SAMPLES COLLECTED", "FAREWELL, EARTH DEVS"],
    screams: ["ALIENS!", "they're green!", "don't let them probe me!", "not the beam!", "I want my mom!", "is this in the SLA?!"],
    caught: ["bzzzt—", "noooo", "put me dooown!", "I come in peace too!", "wait—"],
    wake: [
      "did anyone else see… lights?", "I think they probed me", "I saw the light, man", "I'm never leaving the lid open again",
      "why do I know Klingon now?", "they took my notes!", "was that… a UFO?", "I have missing time",
    ],
  },
  zombies: {
    id: "zombies",
    label: "Zombie Takeover",
    banner: "ZOMBIE TAKEOVER",
    titles: ["Zombie (Accounting)", "Zombie (Legal)", "Zombie (Marketing)", "Zombie (IT)", "Zombie (Sales)", "Zombie (HR)"],
    outfit: { race: "zombie", shirt: "#8E9AAF", pants: "#3D405B", tie: "#6B2E3A" },
    entry: "door",
    exit: "door",
    attack: "bite",
    speed: 1.9,
    reach: 0.8,
    strikeSeconds: 1.1,
    rest: 0.8,
    base: 2,
    perGuys: 6,
    trashEvery: [10, 18],
    hitWords: ["NOM!", "CHOMP!", "MUNCH!"],
    trashWords: ["CRASH!", "THUD!"],
    debris: ["papers", "mug", "goo", "papers"],
    tint: "#7A9A5A",
    warning: ["did you hear that?", "who's groaning?", "is that Dave from Accounting?", "why does it smell like Mondays?", "uh, guys?"],
    taunts: ["braaains…", "uuurgh…", "BRAAAINS", "mmmeetings…", "reply… alllll…", "need… coffeeee…", "synergyyy…"],
    exitLines: ["uuurgh…", "lunch… time…", "braaains…"],
    screams: ["ZOMBIES!", "aim for the… uh… keyboard!", "don't let them bite you!", "is that Dave?!", "they're slow, just walk!", "I knew Monday would do this"],
    caught: ["not the brain!", "ow ow ow", "I'm too young to zombie!", "noooo"],
    wake: [
      "why do I want… brains?", "I feel like I ate a stapler", "ugh, I taste keyboard", "was I… a zombie?",
      "I chased Dave for ten minutes", "my head… so many meetings", "I don't feel… undead anymore", "that was some Monday",
    ],
  },
  raiders: {
    id: "raiders",
    label: "Raiders",
    banner: "RAIDERS!",
    titles: ["Rust", "Gnash", "Scrap", "Torque", "Grit", "Sprocket"],
    outfit: { race: "human", shirt: "#5C3B28", pants: "#2B2B2B", hair: "#E2504B", hairStyle: "mohawk", accessory: "glasses", accessoryColor: "#2A2A2A", sleeveless: true },
    entry: "door",
    exit: "door",
    attack: "bonk",
    speed: 4.4,
    reach: 0.8,
    strikeSeconds: 0.6,
    rest: 1.6,
    base: 3,
    perGuys: 4,
    trashEvery: [4, 8],
    hitWords: ["BONK!", "POW!", "WHACK!", "THWACK!"],
    trashWords: ["SMASH!", "CRASH!", "KRAK!"],
    debris: ["cans", "papers", "mug", "plant", "cans"],
    tint: "#FF7A2E",
    warning: ["was that an engine?", "is someone revving outside?", "why's the door shaking?", "uh, guys?", "who ordered a motorcycle?"],
    taunts: ["WITNESS ME!", "GRAB THE SNACKS!", "THIS OFFICE IS OURS!", "SHINY!", "TAKE THE CHAIRS!", "YEEEHAW!", "WHERE'S THE COFFEE?!"],
    exitLines: ["GOT THE STAPLER!", "RIDE ON!", "GRAB IT AND GO!", "YEEEHAW!"],
    screams: ["RAIDERS!", "hide the coffee!", "not the monitors!", "they took my chair!", "run for the stairs!", "is this a team-building thing?"],
    caught: ["oof!", "ow!", "my head!", "not the face!", "hey!"],
    wake: [
      "they took my stapler!", "where's the coffee machine?", "did they… take the chairs?", "I think I got bonked",
      "I've got a bump the size of a mouse", "so… is it Friday?", "who were those guys?", "they left their cans everywhere",
    ],
  },
  vampires: {
    id: "vampires",
    label: "Vampires",
    banner: "VAMPIRES!",
    titles: ["Count Bytecula", "Countess Nullity", "Lord Fangsworth", "Baron Von Bitrot", "Lady Nightshift"],
    outfit: { race: "vampire", shirt: "#1A1A22", pants: "#1A1A22", tie: "#9B1B30", accessory: "none" },
    entry: "smoke",
    exit: "bats",
    attack: "drink",
    speed: 4.8,
    reach: 0.8,
    strikeSeconds: 0.6,
    rest: 1.4,
    base: 1,
    perGuys: 4,
    trashEvery: [12, 20],
    hitWords: ["POUNCE!", "GOTCHA!", "SWOOP!"],
    trashWords: ["CRASH!", "WHOOSH!"],
    debris: ["cobweb", "papers", "mug", "cobweb"],
    tint: "#5A2A8A",
    warning: ["who turned the lights down?", "did it get dark?", "was that a bat?", "it's freezing in here…", "uh, guys?"],
    taunts: ["I vant to drink your… coffee", "bleh bleh!", "the night is young!", "such lovely necks", "ah, fresh devs", "mwahaha!"],
    exitLines: ["THE SUN!", "hssss!", "until tonight!", "bleh!"],
    screams: ["VAMPIRES!", "garlic! anyone have garlic?!", "cover your necks!", "open the blinds!", "not my neck!", "I'm anemic, take him!"],
    caught: ["eek!", "not the neck!", "noooo", "I'm O negative!", "help!"],
    wake: [
      "I feel… lightheaded", "why am I craving tomato juice?", "is the sun out? thank goodness", "my neck itches",
      "I feel weirdly anemic", "did someone say garlic bread?", "the blinds stay open now", "I need a juice box",
    ],
  },
};

// How the guys come to, whatever hit them, by personality.
const PERSONALITY_WAKE: Record<Personality, readonly string[]> = {
  suckUp: ["should I tell the boss?", "I'll file an incident report!", "I'm fine! totally fine! still productive!", "nobody tell my manager"],
  grumbler: ["this is not in my job description", "every single quarter", "I'm billing overtime for this", "I should've stayed home"],
  deadpan: ["huh.", "that happened.", "well.", "neat."],
  snark: ["great. love that for us.", "HR is gonna hear about this", "best team-building yet", "five stars, would not repeat"],
  eager: ["that was AWESOME", "can we do that again?!", "did anyone film that?!", "best day ever!"],
};

const GENERIC_WAKE: readonly string[] = [
  "wow, that was weird", "what just happened?", "…ow", "is it over?", "did we… win?", "huh?", "where am I?", "five more minutes…",
  "was that real?", "my head…",
];

// The guys who were never caught, when it all goes quiet.
export const SURVIVOR_LINES: readonly string[] = ["is it over?", "are they gone?", "I'm not coming out", "phew", "did we win?", "hello…?"];

export const COWER_LINES: readonly string[] = ["*whimper*", "please no please no", "I'm not here", "hide hide hide", "mommy…", "shhh!"];

export const GENERIC_SCREAMS: readonly string[] = ["AAAAH!", "RUN!", "HELP!", "not like this!", "every dev for himself!", "EEEK!", "save the laptops!", "why today?!"];

export const DUST_LINES: readonly string[] = ["*dusts off*", "okay. okay.", "*shakes it off*", "where's my mug?", "ugh"];

export const CLEAN_LINES: readonly string[] = ["what a mess", "is this… goo?", "who's paying for this?", "I'll get the broom", "somebody call maintenance", "gross"];

export const DONE_LINES: readonly string[] = ["back to work, I guess", "let's never speak of this", "so… standup?", "okay, where was I?", "good as new"];

function pick<T>(list: readonly T[], random: () => number): T {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

// What a guy says when he comes to: about what hit him, in his own way, or just dazed.
export function wakeLine(kind: InvasionKindId, personality: Personality, random: () => number): string {
  const roll = random();
  if (roll < 0.5) {
    return pick(INVASIONS[kind].wake, random);
  }
  return roll < 0.75 ? pick(PERSONALITY_WAKE[personality], random) : pick(GENERIC_WAKE, random);
}

// What a guy screams on the run: about them, or just screaming.
export function screamLine(kind: InvasionKindId, random: () => number): string {
  return random() < 0.45 ? pick(INVASIONS[kind].screams, random) : pick(GENERIC_SCREAMS, random);
}

// How many come in for a room of this many guys.
export function invaderCount(kind: InvasionKindId, guys: number): number {
  const spec = INVASIONS[kind];
  return Math.max(1, Math.min(MAX_INVADERS, spec.base + Math.floor(Math.max(0, guys) / spec.perGuys)));
}

// Seconds the attack lasts at most; it ends sooner once everyone's down.
export const ATTACK_SECONDS: readonly [number, number] = [30, 45];
// The flicker before they show up, and the most the way out can take.
export const WARNING_SECONDS = 3.5;
export const RETREAT_SECONDS = 10;
// The most the wake-up and the sweep-up can take before the room just snaps back.
export const AFTERMATH_SECONDS = 80;

export interface InvasionPlan {
  kind: InvasionKindId;
  label: string;
  titles: string[];
  length: number;
}

export function planInvasion(random: () => number, kind: InvasionKindId | undefined, guys: number): InvasionPlan {
  const id = kind ?? pick(INVASION_KINDS, random);
  const spec = INVASIONS[id];
  const count = invaderCount(id, guys);
  const offset = Math.floor(random() * spec.titles.length);
  return {
    kind: id,
    label: spec.label,
    titles: Array.from({ length: count }, (_, index) => spec.titles[(offset + index) % spec.titles.length]),
    length: ATTACK_SECONDS[0] + random() * (ATTACK_SECONDS[1] - ATTACK_SECONDS[0]),
  };
}

export type InvasionFrequency = "off" | "rare" | "normal" | "often";

// Minutes between invasions, low and high.
export const INVASION_FREQUENCIES: Record<Exclude<InvasionFrequency, "off">, readonly [number, number]> = {
  rare: [45, 90],
  normal: [20, 40],
  often: [6, 12],
};

export function invasionFrequency(value: unknown): InvasionFrequency {
  if (value === false) {
    return "off";
  }
  return value === "off" || (typeof value === "string" && value in INVASION_FREQUENCIES) ? (value as InvasionFrequency) : "normal";
}

// Seconds until the next invasion; the first comes a little sooner, but never in the first few minutes.
export function invasionGap(random: () => number, frequency: Exclude<InvasionFrequency, "off"> = "normal", first = false): number {
  const [low, high] = INVASION_FREQUENCIES[frequency];
  const minutes = first ? low * (0.5 + random() * 0.5) : low + random() * (high - low);
  return minutes * 60;
}

export function isInvasionKind(value: unknown): value is InvasionKindId {
  return typeof value === "string" && (INVASION_KINDS as readonly string[]).includes(value);
}
