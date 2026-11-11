import type { Accessory, HairStyle, PixelGuyLook } from "./pixelGuy";
import type { RaceId } from "./pixelRaces";
import type { Personality } from "./officeVisitors";

// Pure: the invasions that hit the Office now and then. Aliens, zombies, raiders, vampires, robots, ghosts, werewolves,
// slimes, mummies, or demons come through and trash the place. Nobody gets hurt for real: the guys run around screaming, hide, and get zapped, bitten, bonked, or
// tackled, and fall down seeing stars. Then the invaders leave, the guys come to one by one, look around, say
// something like "wow, that was weird", dust themselves off, sweep up the mess, and get back to it.
// It's cartoon trouble, never gore: a vampire "drinks" with a SLURP! and his guy goes pale, a zombie's bite turns his
// guy green for a bit, an alien's zap puts his guy to sleep or floats him up in a beam, a mummy wraps his guy up, a
// slime leaves his guy sticky, a demon's fireball leaves his guy sooty, a ghost's BOO! makes his guy faint.

export type InvasionKindId = "aliens" | "zombies" | "raiders" | "vampires" | "robots" | "ghosts" | "werewolves" | "slimes" | "mummies" | "demons";

export const INVASION_KINDS: readonly InvasionKindId[] = ["aliens", "zombies", "raiders", "vampires", "robots", "ghosts", "werewolves", "slimes", "mummies", "demons"];

// How the invaders come in and go out: through the door, beamed down and up, or in a puff of smoke (and out as bats,
// in another puff, or fading away).
export type InvaderEntry = "door" | "beam" | "smoke";
export type InvaderExit = "door" | "beam" | "bats" | "smoke" | "fade";

// What a hit does. bite: down, then up again as one of them (the spec's turn), chasing the rest. drink: a tackle, then
// a slurp that leaves him pale. zap: from a few tiles off; down, or (by floatChance) up in a beam until they leave.
// bonk: down with stars. spook: a BOO! from a couple of tiles off, and he faints.
export type InvaderAttack = "bite" | "drink" | "zap" | "bonk" | "spook";

// How a zap looks: a crackling bolt, a straight laser, or a fireball flying across.
export type ZapStyle = "bolt" | "laser" | "fireball";

// How a guy looks for a while after: turned (zombie, wolf) until he comes to; pale, wrapped, slimed, or sooty until he
// dusts himself off.
export type LookVariant = "zombie" | "wolf" | "pale" | "wrapped" | "slimed" | "sooty";

// The mess they leave, swept up after.
export type DebrisKind = "papers" | "mug" | "goo" | "scorch" | "cans" | "cobweb" | "plant" | "bolts" | "ecto" | "fur" | "sand";

export const DEBRIS_KINDS: readonly DebrisKind[] = ["papers", "mug", "goo", "scorch", "cans", "cobweb", "plant", "bolts", "ecto", "fur", "sand"];

export interface InvaderOutfit {
  race: RaceId;
  // Over the race's skin (a mummy's bandages).
  skin?: string;
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
  // With attack "bite": who he gets up as, how fast he chases, and what he groans.
  turn?: { variant: "zombie" | "wolf"; speed: number; lines: readonly string[] };
  // What a hit leaves on him till he dusts off (a vampire's pale comes from the slurp instead).
  mark?: LookVariant;
  // With attack "zap": the chance a zap floats him up in a beam instead, and how it looks.
  floatChance?: number;
  zapStyle?: ZapStyle;
  zapColor?: string;
  // Walks with his arms out, like a zombie.
  shamble?: boolean;
  // Smashing something, he grabs it; he runs off with it.
  loots?: boolean;
  // What pops off the door as the first one comes in through it.
  doorWord?: string;
  // How much faster than his hunt he heads out the door.
  exitSpeed?: number;
  // The puff he comes and goes in, two colors.
  puff?: readonly [string, string];
  // How much the room darkens, whether the sunrise chases them off, and how see-through they are (1 is solid).
  dark?: number;
  sunrise?: boolean;
  opacity?: number;
  // The color of the words off a hit.
  wordColor: string;
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
    floatChance: 0.35,
    zapStyle: "bolt",
    zapColor: "#B4FF5A",
    wordColor: "#B4FF5A",
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
    turn: { variant: "zombie", speed: 1.9, lines: ["braaains…", "uuurgh…", "*groan*", "mmm… brains"] },
    shamble: true,
    exitSpeed: 1.7,
    wordColor: "#FFE14A",
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
    loots: true,
    doorWord: "BAM!",
    wordColor: "#FFE14A",
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
    puff: ["#6B4A8A", "#3A2A4A"],
    dark: 0.3,
    sunrise: true,
    wordColor: "#FF6B8A",
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
  robots: {
    id: "robots",
    label: "Robot Uprising",
    banner: "ROBOT UPRISING",
    titles: ["UNIT-7", "RX-404", "B0LT", "SERVO", "K-9000", "D3BUG"],
    outfit: { race: "robot", shirt: "#6E7B85", pants: "#3A434A", accessory: "none" },
    entry: "door",
    exit: "door",
    attack: "zap",
    zapStyle: "laser",
    zapColor: "#FF4040",
    doorWord: "CLANK!",
    wordColor: "#FF6B6B",
    speed: 2.4,
    reach: 3,
    strikeSeconds: 0.8,
    rest: 3,
    base: 2,
    perGuys: 5,
    trashEvery: [6, 12],
    hitWords: ["ZZZT!", "PEW!", "BEEP!", "DELETED!"],
    trashWords: ["CLANK!", "BZZT!", "CRUNCH!"],
    debris: ["bolts", "papers", "scorch", "bolts"],
    tint: "#FF3B3B",
    warning: ["did the printer just… blink red?", "why is the coffee machine beeping?", "the Roomba's looking at me", "is the AI… awake?", "uh, guys?"],
    taunts: ["EXTERMINATE BUGS", "YOUR CODE IS DEPRECATED", "01001000 01001001", "I AM THE CI NOW", "RESISTANCE IS 404", "HUMANS DETECTED", "ROBOTS DO NOT NEED STANDUPS"],
    exitLines: ["SHUTTING DOWN", "UPDATE REQUIRED", "I'LL BE BACK", "*low battery*"],
    screams: ["THE ROBOTS!", "unplug them!", "I always said please to the AI!", "where's the power strip?!", "it's the singularity!", "ctrl-alt-delete!"],
    caught: ["beep—", "not the firmware!", "I'm a person!", "I accept the terms!"],
    wake: [
      "did I just get… rebooted?", "I dreamed in binary", "I accept all cookies now", "who turned me off and on again?",
      "my fillings are buzzing", "I'm thanking the toaster from now on", "I feel… patched", "was that the AI?",
    ],
  },
  ghosts: {
    id: "ghosts",
    label: "Haunting",
    banner: "HAUNTED!",
    titles: ["The Grey Lady", "Old Man Jenkins", "The Intern (1987)", "Sir Boo", "The Former CTO", "Wisp"],
    outfit: { race: "ghost", shirt: "#E8EEF4", pants: "#C8D2DC", accessory: "none" },
    entry: "smoke",
    exit: "fade",
    attack: "spook",
    mark: "pale",
    puff: ["#DDE8F0", "#9FB4C8"],
    dark: 0.35,
    opacity: 0.72,
    wordColor: "#CDEBFF",
    speed: 2.2,
    reach: 2.2,
    strikeSeconds: 0.7,
    rest: 2.5,
    base: 2,
    perGuys: 5,
    trashEvery: [7, 13],
    hitWords: ["BOO!", "BOOO!", "WOOO!"],
    trashWords: ["RATTLE!", "CREAK!", "WHOOSH!"],
    debris: ["cobweb", "ecto", "papers", "ecto"],
    tint: "#9FD8FF",
    warning: ["is it cold in here?", "the lights are flickering", "did that chair just move?", "who's whispering?", "uh, guys?"],
    taunts: ["wooooo…", "get ouuut…", "this was MY desk…", "rebase… forever…", "the deadline… never ends…", "BOO!", "I died in a code review…"],
    exitLines: ["I'll be baaack…", "wooo…", "*fades*", "remember meee…"],
    screams: ["GHOST!", "who you gonna call?!", "it went through the wall!", "I'm not scared, YOU'RE scared", "it's the old CTO!", "sage! anyone have sage?!"],
    caught: ["eep!", "it's so cold!", "*faints*", "nope nope nope"],
    wake: [
      "I fainted, didn't I", "I'm never working late again", "the old CTO says hi", "why is my coffee cold?",
      "did I see a ghost?", "I need a nightlight", "my hair's standing up", "I'm moving desks",
    ],
  },
  werewolves: {
    id: "werewolves",
    label: "Werewolves",
    banner: "FULL MOON",
    titles: ["Lupo", "Fang", "Barkley", "Howler", "Shaggy Steve", "Ruffus"],
    outfit: { race: "wolffolk", shirt: "#7A3B2E", pants: "#3B4A6B", accessory: "none", sleeveless: true },
    entry: "door",
    exit: "door",
    attack: "bite",
    turn: { variant: "wolf", speed: 3.4, lines: ["awoo!", "grrr…", "*sniff sniff*", "woof?", "GRRR"] },
    doorWord: "AWOOO!",
    exitSpeed: 1.4,
    dark: 0.3,
    sunrise: true,
    wordColor: "#FFD27A",
    speed: 4,
    reach: 0.9,
    strikeSeconds: 0.8,
    rest: 1.6,
    base: 2,
    perGuys: 5,
    trashEvery: [6, 10],
    hitWords: ["CHOMP!", "RAWR!", "SNARL!"],
    trashWords: ["RIP!", "CRASH!", "SHRED!"],
    debris: ["fur", "papers", "plant", "fur"],
    tint: "#6A7BD8",
    warning: ["is that a full moon?", "did someone hear howling?", "why is Steve so hairy today?", "who let the dogs in?", "uh, guys?"],
    taunts: ["AWOOOO!", "*sniff* fresh devs", "who's a good boy? ME", "GRRRR", "I smell fear… and pizza", "fetch THIS"],
    exitLines: ["AWOO!", "*yelp*", "the sun!", "*whimper*"],
    screams: ["WEREWOLF!", "silver! anyone have silver?!", "bad dog! BAD DOG!", "don't let it bite!", "it's a full moon!", "sit! SIT!"],
    caught: ["not the ankles!", "down boy!", "ow ow ow", "good doggy?"],
    wake: [
      "why do I want to chase the mailman?", "I chewed my shoes", "I have fur in my teeth", "did I howl?",
      "I feel like rolling in the grass", "why is my tail— oh. phew.", "I need a flea bath", "who's a good boy?",
    ],
  },
  slimes: {
    id: "slimes",
    label: "Slime Outbreak",
    banner: "SLIME OUTBREAK",
    titles: ["Blob", "Gloop", "Squish", "Oozy", "Jiggles", "Splort"],
    outfit: { race: "slime", shirt: "#4FB548", pants: "#2F7A2C", accessory: "none" },
    entry: "smoke",
    exit: "smoke",
    attack: "bonk",
    mark: "slimed",
    puff: ["#7CF06A", "#3FAF3A"],
    wordColor: "#B4FF5A",
    speed: 2.2,
    reach: 1.1,
    strikeSeconds: 1,
    rest: 1.2,
    base: 3,
    perGuys: 4,
    trashEvery: [5, 9],
    hitWords: ["SPLAT!", "SPLORCH!", "GLORP!", "SQUELCH!"],
    trashWords: ["SPLASH!", "GLUG!"],
    debris: ["goo", "goo", "papers"],
    tint: "#7CF06A",
    warning: ["is the ceiling dripping?", "what's this goo?", "did someone spill something?", "the drain is gurgling…", "uh, guys?"],
    taunts: ["*blorp*", "gloop gloop", "*jiggles*", "SQUISH!", "absorb… absorb…", "*wobble*"],
    exitLines: ["*blorp*", "*melts*", "gloop…", "*squelch*"],
    screams: ["SLIME!", "it's in my shoes!", "don't step in it!", "is it… lime flavored?", "it ate my lunch!", "get a mop!"],
    caught: ["ew ew ew!", "it's sticky!", "not my hoodie!", "glub—"],
    wake: [
      "I'm so sticky", "this is going to stain", "I smell like lime", "I can't feel my socks",
      "it got in my ears", "I'm… kind of minty?", "why is my keyboard jiggling?", "I need a shower",
    ],
  },
  mummies: {
    id: "mummies",
    label: "Mummy's Curse",
    banner: "THE MUMMY'S CURSE",
    titles: ["Ramesses the Intern", "Pharaoh Fred", "Nefer-Tito", "King Tut-Tut", "Imhotep (QA)"],
    outfit: { race: "human", skin: "#D8CDA8", hair: "#D8CDA8", hairStyle: "bald", shirt: "#E6DCBF", pants: "#CFC3A0", accessory: "none" },
    entry: "door",
    exit: "door",
    attack: "bonk",
    mark: "wrapped",
    shamble: true,
    doorWord: "CREAK…",
    exitSpeed: 1.5,
    wordColor: "#FFD27A",
    speed: 2.3,
    reach: 1.1,
    strikeSeconds: 1.1,
    rest: 0.6,
    base: 3,
    perGuys: 4,
    trashEvery: [9, 15],
    hitWords: ["WRAP!", "THWUMP!", "SWADDLE!"],
    trashWords: ["CRASH!", "THUD!"],
    debris: ["sand", "papers", "sand"],
    tint: "#E8B84A",
    warning: ["why is there sand everywhere?", "who opened the old crate?", "is that a sarcophagus?", "the delivery said 'do not open'…", "uh, guys?"],
    taunts: ["mmmmph…", "the curse… of legacy code…", "who… disturbs… my tomb…", "mmmrrrgh", "wrap… them… up…"],
    exitLines: ["mmmph…", "back… to… the tomb…", "*shuffles off*"],
    screams: ["MUMMY!", "it's the curse!", "who opened the crate?!", "pull a loose end!", "don't get wrapped!", "it's slow, just walk!"],
    caught: ["mmph!", "not the tape!", "I'm getting wrapped!", "help, mmph—"],
    wake: [
      "mmph— oh, I can talk", "I'm all tangled up", "I look like a burrito", "who wrapped me?",
      "I'm never opening a delivery again", "the curse is real", "there's sand in my keyboard", "I feel… preserved",
    ],
  },
  demons: {
    id: "demons",
    label: "Hellgate",
    banner: "HELLGATE OPENED",
    titles: ["Malphas", "Bael", "Grumblor", "Ashley", "Belphegor", "Imp of Merge Conflicts"],
    outfit: { race: "demon", shirt: "#3A1010", pants: "#1A0A0A", accessory: "none" },
    entry: "smoke",
    exit: "smoke",
    attack: "zap",
    zapStyle: "fireball",
    zapColor: "#FF8A2A",
    mark: "sooty",
    puff: ["#FF5A1F", "#7A1A10"],
    dark: 0.15,
    wordColor: "#FF9A3A",
    speed: 3,
    reach: 2.6,
    strikeSeconds: 0.9,
    rest: 3,
    base: 2,
    perGuys: 5,
    trashEvery: [7, 12],
    hitWords: ["FWOOSH!", "BLAM!", "SIZZLE!", "TOASTY!"],
    trashWords: ["KABOOM!", "FWOOSH!"],
    debris: ["scorch", "papers", "scorch", "mug"],
    tint: "#FF3A10",
    warning: ["is it hot in here?", "why does it smell like sulfur?", "the floor is glowing…", "did someone deploy on a Friday?", "uh, guys?"],
    taunts: ["YOUR SOUL… FOR A LGTM", "WELCOME TO PROD", "ALL YOUR MERGES ARE CONFLICTS", "BURN THE BACKLOG", "mwahahaha!", "sign here, here, and here", "THE DEADLINE WAS YESTERDAY"],
    exitLines: ["THIS ISN'T OVER", "back to the pit!", "*poof*", "see you at the retro"],
    screams: ["DEMONS!", "who deployed on a Friday?!", "it's on fire!", "the floor is lava!", "roll it back! ROLL IT BACK!", "fire extinguisher!"],
    caught: ["it burns!", "not my eyebrows!", "hot hot hot!", "I didn't sign anything!"],
    wake: [
      "I smell like a campfire", "my eyebrows!", "I'm toasted", "never deploying on a Friday again",
      "is the floor still lava?", "I think I signed something", "I'm… extra crispy", "that was a hellish standup",
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
