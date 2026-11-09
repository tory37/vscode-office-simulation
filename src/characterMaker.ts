// Pure: what the character maker offers for a look. A race narrows the choices (no cap over horns, no beard on a
// beak), and its own skins, hair, and eyes come first in the swatches.

import { Accessory, HairStyle, LOOK_PALETTES, lookWithRace, PixelGuyLook, pixelGuyLook } from "./pixelGuy";
import { RACES, raceSpec, RaceId } from "./pixelRaces";

export const EYE_COLORS = ["#1A1A2E", "#3D8BFD", "#4CAF50", "#8D5524", "#7E57C2", "#E53935", "#F2C94C", "#9E9E9E"];
export const MARK_COLORS = ["#FFFFFF", "#1A1A22", "#E8B931", "#C0392B", "#2E86AB", "#4CB944", "#7950F2", "#F06595"];
const BEARD_COLORS = ["#2C1B12", "#5A3825", "#A0522D", "#D9772B", "#D9A441", "#B8B8B8", "#2E2E2E"];

export const HAIR_STYLE_LABELS: Record<HairStyle, string> = {
  short: "Short", long: "Long", spiky: "Spiky", bob: "Bob", bald: "Bald", mohawk: "Mohawk", bun: "Bun", curly: "Curly", ponytail: "Ponytail",
};

export const ACCESSORY_LABELS: Record<Accessory, string> = {
  none: "None", glasses: "Glasses", headphones: "Headphones", cap: "Cap", beard: "Beard", fullBeard: "Full beard",
};

export interface MakerOptions {
  races: readonly { id: RaceId; label: string }[];
  skins: readonly string[];
  hairs: readonly string[];
  hairStyles: readonly HairStyle[];
  eyes: readonly string[];
  accessories: readonly Accessory[];
  accessoryColors: readonly string[];
  beards: readonly string[];
  shirts: readonly string[];
  pants: readonly string[];
  shoes: readonly string[];
  // One palette per mark, or none when the race has no marks.
  marks: readonly (readonly string[])[];
  // The race always draws a full beard, or bare arms, whatever the look says.
  alwaysBeard: boolean;
  alwaysSleeveless: boolean;
}

const unique = (lists: readonly (readonly string[] | undefined)[]) => [...new Set(lists.flatMap((list) => list ?? []))];

export function makerOptions(look: PixelGuyLook): MakerOptions {
  const spec = raceSpec(look.race);
  const blocked = new Set<Accessory>(spec.blocks ?? []);
  return {
    races: RACES.map((race) => ({ id: race.id, label: race.label })),
    skins: unique([spec.skins, look.race === undefined ? LOOK_PALETTES.skins : undefined]),
    hairs: unique([spec.hairs, LOOK_PALETTES.hairs]),
    hairStyles: spec.hairStyles ?? LOOK_PALETTES.hairStyles,
    eyes: unique([spec.eyes, EYE_COLORS]),
    accessories: LOOK_PALETTES.accessories.filter((accessory) => !blocked.has(accessory)),
    accessoryColors: LOOK_PALETTES.accessoryColors,
    beards: unique([BEARD_COLORS, LOOK_PALETTES.hairs]),
    shirts: LOOK_PALETTES.shirts,
    pants: LOOK_PALETTES.pants,
    shoes: LOOK_PALETTES.shoes,
    marks: look.race === undefined || spec.marks === undefined ? [] : spec.marks.map((palette) => unique([palette, MARK_COLORS])),
    alwaysBeard: spec.beard === true,
    alwaysSleeveless: spec.sleeveless === true,
  };
}

// Switches the race and fits the rest of the look to it: its own skin, hair, and eyes, a style and accessory it allows.
export function changeRace(look: PixelGuyLook, race: RaceId): PixelGuyLook {
  let next = lookWithRace(look, race);
  if (race === "human") {
    // Back to a human skin and hair if the old race's don't suit.
    if (!LOOK_PALETTES.skins.includes(next.skin)) {
      next = { ...next, skin: LOOK_PALETTES.skins[1] };
    }
    if (!LOOK_PALETTES.hairs.includes(next.hair)) {
      next = { ...next, hair: LOOK_PALETTES.hairs[1] };
    }
  }
  const options = makerOptions(next);
  if (!options.hairStyles.includes(next.hairStyle)) {
    next = { ...next, hairStyle: options.hairStyles[0] };
  }
  if (!options.accessories.includes(next.accessory)) {
    next = { ...next, accessory: "none" };
  }
  return next;
}

// A random look: a random seed's, with your guy's extras (eyes, beard color, bare arms and shins, flip flops) mixed in.
export function randomLook(random: () => number): PixelGuyLook {
  const pick = <Item>(items: readonly Item[]) => items[Math.min(items.length - 1, Math.floor(random() * items.length))];
  const look = pixelGuyLook(`maker|${Math.floor(random() * 1e9)}`, true);
  const options = makerOptions(look);
  return {
    ...look,
    eyes: look.eyes ?? pick(EYE_COLORS),
    beard: pick(options.beards),
    accessory: pick(options.accessories),
    sleeveless: options.alwaysSleeveless || random() < 0.3,
    shorts: random() < 0.3,
    flipFlops: random() < 0.15,
  };
}
