import { describe, expect, it } from "vitest";
import { changeRace, makerOptions, randomLook } from "../../src/characterMaker";
import { DEFAULT_YOUR_LOOK, LOOK_PALETTES, pixelGuyLook, seededRandom } from "../../src/pixelGuy";
import { RACES, raceSpec } from "../../src/pixelRaces";

describe("character maker", () => {
  it("offers every race, and a human everything", () => {
    const options = makerOptions(DEFAULT_YOUR_LOOK);
    expect(options.races).toHaveLength(RACES.length);
    expect(options.hairStyles).toEqual(LOOK_PALETTES.hairStyles);
    expect(options.accessories).toEqual(LOOK_PALETTES.accessories);
    expect(options.marks).toEqual([]);
  });

  it("narrows the choices to what a race allows, with its own colors first", () => {
    for (const race of RACES.filter((spec) => spec.id !== "human")) {
      const look = changeRace(DEFAULT_YOUR_LOOK, race.id);
      const options = makerOptions(look);
      expect(look.race).toBe(race.id);
      expect(options.hairStyles).toContain(look.hairStyle);
      expect(options.accessories).toContain(look.accessory);
      for (const blocked of race.blocks ?? []) {
        expect(options.accessories).not.toContain(blocked);
      }
      if (race.skins !== undefined) {
        expect(options.skins[0]).toBe(race.skins[0]);
        expect(look.skin).toBe(race.skins[0]);
      }
      expect(options.marks).toHaveLength(race.marks === undefined ? 0 : 3);
      expect(look.marks).toHaveLength(3);
    }
  });

  it("keeps the clothes across a race change, and human takes the race off", () => {
    const orc = changeRace(DEFAULT_YOUR_LOOK, "orc");
    expect(orc.shirt).toBe(DEFAULT_YOUR_LOOK.shirt);
    expect(orc.flipFlops).toBe(true);
    const back = changeRace(orc, "human");
    expect(back.race).toBeUndefined();
    expect(back.marks).toBeUndefined();
    expect(LOOK_PALETTES.skins).toContain(back.skin);
    expect(raceSpec(back.race).id).toBe("human");
  });

  it("makes random looks the maker can show", () => {
    const random = seededRandom(5);
    for (let count = 0; count < 50; count++) {
      const look = randomLook(random);
      const options = makerOptions(look);
      expect(options.accessories).toContain(look.accessory);
      expect(options.hairStyles).toContain(look.hairStyle);
      expect(look.eyes).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(randomLook(seededRandom(1))).not.toEqual(pixelGuyLook("x"));
  });
});
