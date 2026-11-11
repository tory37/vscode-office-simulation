import { describe, expect, it } from "vitest";
import { buildOfficeLayout } from "../../src/officeLayout";
import {
  ATTACK_SECONDS, INVASION_KINDS, INVASIONS, InvasionKindId, invaderClothes, invaderCount, invasionFrequency, invasionGap, isInvasionKind, MAX_INVADERS, planInvasion,
  wakeLine,
} from "../../src/officeInvasions";
import {
  Agent, AgentInput, agentPose, createOffice, endInvasion, invaderAgents, OfficeState, ShowInput, startInvasion, startShow, stepOffice, syncOffice, syncYou,
} from "../../src/officeSim";
import { pixelGuyFrame, pixelGuyLook, seededRandom } from "../../src/pixelGuy";

const input = (id: string, status: AgentInput["status"]): AgentInput => ({ id, seed: id, status, title: `Session ${id}` });

function room(seed: number, guys = 8): { state: OfficeState; random: () => number } {
  const random = seededRandom(seed);
  const state = createOffice(buildOfficeLayout(16, 9, "office"));
  syncOffice(state, Array.from({ length: guys }, (_, index) => input(`g${index}`, (["working", "idle", "asleep"] as const)[index % 3])), random, "seated");
  syncYou(state, "you|look", random);
  run(state, 15, random);
  return { state, random };
}

function run(state: OfficeState, seconds: number, random: () => number, each?: (state: OfficeState) => void): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) {
    stepOffice(state, 0.05, random);
    each?.(state);
  }
}

function invade(state: OfficeState, kind: InvasionKindId, random: () => number): boolean {
  const plan = planInvasion(random, kind, state.agents.length);
  return startInvasion(state, { kind, length: plan.length, invaders: plan.titles.map((title, index) => ({ id: `invader${index}`, seed: `invader|${kind}|${index}`, title })) }, random);
}

// Runs an invasion to its end, noting what happened along the way.
function watch(state: OfficeState, random: () => number): { phases: string[]; downed: Set<string>; variants: Set<string>; floated: boolean; maxDebris: number; words: Set<string>; seconds: number } {
  const seen = { phases: [] as string[], downed: new Set<string>(), variants: new Set<string>(), floated: false, maxDebris: 0, words: new Set<string>(), seconds: 0 };
  const start = state.time;
  while (state.invasion !== undefined && state.time - start < 240) {
    stepOffice(state, 0.05, random);
    const invasion = state.invasion;
    if (invasion === undefined) {
      break;
    }
    if (seen.phases.at(-1) !== invasion.phase) {
      seen.phases.push(invasion.phase);
    }
    for (const agent of state.agents) {
      if (agent.mode === "down") {
        seen.downed.add(agent.id);
      }
      if (agent.mode === "float") {
        seen.floated = true;
      }
      if (agent.variant !== undefined) {
        seen.variants.add(agent.variant);
      }
    }
    seen.maxDebris = Math.max(seen.maxDebris, invasion.debris.length);
    invasion.hits.forEach((hit) => seen.words.add(hit.word));
  }
  seen.seconds = state.time - start;
  return seen;
}

const guysOf = (state: OfficeState) => state.agents.filter((agent) => agent.crew === undefined && agent.invader === undefined);

describe("officeInvasions", () => {
  it("reads the frequency setting, off for false, normal for anything it doesn't know", () => {
    expect(invasionFrequency("often")).toBe("often");
    expect(invasionFrequency("off")).toBe("off");
    expect(invasionFrequency(false)).toBe("off");
    expect(invasionFrequency("weekly")).toBe("normal");
    expect(invasionFrequency(undefined)).toBe("normal");
  });

  it("spaces invasions out by the frequency, the first a little sooner", () => {
    const random = seededRandom(3);
    for (let index = 0; index < 50; index++) {
      const often = invasionGap(random, "often");
      const rare = invasionGap(random, "rare");
      expect(often).toBeGreaterThanOrEqual(6 * 60);
      expect(often).toBeLessThanOrEqual(12 * 60);
      expect(rare).toBeGreaterThanOrEqual(45 * 60);
      expect(invasionGap(random, "normal", true)).toBeLessThanOrEqual(20 * 60);
    }
  });

  it("sends more invaders for a bigger room, never more than the cap", () => {
    for (const kind of INVASION_KINDS) {
      expect(invaderCount(kind, 0)).toBeGreaterThanOrEqual(1);
      expect(invaderCount(kind, 30)).toBeLessThanOrEqual(MAX_INVADERS);
      expect(invaderCount(kind, 12)).toBeGreaterThanOrEqual(invaderCount(kind, 2));
    }
    const plan = planInvasion(seededRandom(1), "raiders", 8);
    expect(plan.titles).toHaveLength(invaderCount("raiders", 8));
    expect(plan.length).toBeGreaterThanOrEqual(ATTACK_SECONDS[0]);
    expect(plan.length).toBeLessThanOrEqual(ATTACK_SECONDS[1]);
    expect(INVASION_KINDS).toContain(planInvasion(seededRandom(2), undefined, 4).kind);
    expect(isInvasionKind("vampires")).toBe(true);
    expect(isInvasionKind("goblins")).toBe(false);
  });

  it("gives every kind its lines, words, and mess, and keeps the race out of the clothes", () => {
    for (const kind of INVASION_KINDS) {
      const spec = INVASIONS[kind];
      for (const list of [spec.titles, spec.hitWords, spec.trashWords, spec.debris, spec.warning, spec.taunts, spec.exitLines, spec.screams, spec.caught, spec.wake]) {
        expect(list.length).toBeGreaterThan(0);
      }
      expect(invaderClothes(spec.outfit)).not.toHaveProperty("race");
      expect(typeof wakeLine(kind, "snark", seededRandom(4))).toBe("string");
    }
  });
});

describe("invasions in the Office", () => {
  it("won't start with nobody to scare, or while one is on", () => {
    const random = seededRandom(1);
    const empty = createOffice(buildOfficeLayout(12, 8, "office"));
    expect(invade(empty, "zombies", random)).toBe(false);
    const { state } = room(1);
    expect(invade(state, "zombies", random)).toBe(true);
    expect(invade(state, "aliens", random)).toBe(false);
  });

  for (const kind of INVASION_KINDS) {
    it(`plays ${kind} through: a warning, the attack, the way out, then everyone comes to and sweeps up`, () => {
      const { state, random } = room(2);
      const before = guysOf(state).length;
      expect(invade(state, kind, random)).toBe(true);
      expect(state.invasion?.phase).toBe("warning");
      // Everyone freezes, busy guys too.
      expect(guysOf(state).every((agent) => agent.scare !== undefined)).toBe(true);
      const seen = watch(state, random);
      expect(state.invasion).toBeUndefined();
      expect(seen.phases).toEqual(["warning", "attack", "retreat", "aftermath"]);
      expect(seen.seconds).toBeLessThan(150);
      // Most of the room got knocked down at some point, and something got hit.
      expect(seen.downed.size).toBeGreaterThanOrEqual(Math.floor(before / 2));
      expect(seen.words.size).toBeGreaterThan(0);
      // They're gone, nobody's still scared or turned, and the mess is swept up.
      expect(invaderAgents(state)).toEqual([]);
      expect(state.agents.every((agent) => agent.scare === undefined && agent.variant === undefined && agent.strike === undefined && agent.speed === undefined)).toBe(true);
      // And the busy guys head back to work.
      run(state, 20, random);
      const busy = state.agents.filter((agent) => agent.status === "working" && !agent.you);
      expect(busy.every((agent) => agent.mode === "type")).toBe(true);
    });
  }

  it("turns a bitten guy into a zombie who chases the rest, and back after", () => {
    const { state, random } = room(3);
    invade(state, "zombies", random);
    let turned: Agent | undefined;
    run(state, 40, random, (now) => {
      turned ??= now.agents.find((agent) => agent.scare?.turned === true);
    });
    expect(turned).toBeDefined();
    expect(turned?.variant).toBe("zombie");
    watch(state, random);
    expect(turned?.variant).toBeUndefined();
    expect(turned?.scare).toBeUndefined();
  });

  it("leaves a vampire's guys pale until they dust off", () => {
    const { state, random } = room(4);
    invade(state, "vampires", random);
    const seen = watch(state, random);
    expect(seen.variants.has("pale")).toBe(true);
    expect(seen.words.has("SLURP!")).toBe(true);
  });

  it("zaps from a few tiles off, and sometimes floats a guy up in a beam", () => {
    let floated = false;
    let zapped = false;
    for (const seed of [1, 2, 3, 4]) {
      const { state, random } = room(seed);
      invade(state, "aliens", random);
      run(state, 30, random, (now) => {
        zapped ||= (now.invasion?.zaps.length ?? 0) > 0;
      });
      floated ||= watch(state, random).floated;
    }
    expect(zapped).toBe(true);
    expect(floated).toBe(true);
  });

  it("has raiders trash the place and run off with loot", () => {
    const { state, random } = room(5);
    invade(state, "raiders", random);
    let looting = false;
    const seen = watch(state, random);
    expect(seen.maxDebris).toBeGreaterThan(2);
    const again = room(6);
    invade(again.state, "raiders", again.random);
    run(again.state, 60, again.random, (now) => {
      looting ||= invaderAgents(now).some((agent) => agent.invader?.loot === true && agent.leaving);
    });
    expect(looting).toBe(true);
  });

  it("keeps a guy in it when his session goes busy, and sends him to his desk after", () => {
    const { state, random } = room(7);
    invade(state, "raiders", random);
    run(state, 8, random);
    const inputs = state.agents.filter((agent) => agent.status !== undefined && !agent.you && agent.invader === undefined && agent.crew === undefined)
      .map((agent) => input(agent.id, "working"));
    syncOffice(state, inputs, random);
    expect(guysOf(state).filter((agent) => !agent.you).every((agent) => agent.scare !== undefined)).toBe(true);
    watch(state, random);
    run(state, 20, random);
    expect(state.agents.filter((agent) => !agent.you && agent.crew === undefined).every((agent) => agent.mode === "type")).toBe(true);
  });

  it("cuts a show short and catches up guys who walk in during the attack", () => {
    const { state, random } = room(8, 4);
    const show: ShowInput = { kind: "guitarist", title: "Busker", performers: [{ id: "p", seed: "p", title: "Busker", role: "guitar" }], lines: [{ text: "♪" }], closer: { text: "bye" }, length: 30 };
    expect(startShow(state, show, random)).toBe(true);
    invade(state, "zombies", random);
    expect(state.show).toBeUndefined();
    run(state, 6, random);
    syncOffice(state, [...guysOf(state).filter((agent) => !agent.you && agent.performer === undefined).map((agent) => input(agent.id, agent.status)), input("late", "idle")], random);
    run(state, 6, random);
    expect(state.agents.find((agent) => agent.id === "late")?.scare).toBeDefined();
  });

  it("ends at once with endInvasion, everyone back on his feet", () => {
    const { state, random } = room(9);
    invade(state, "aliens", random);
    run(state, 20, random);
    endInvasion(state, random);
    expect(state.invasion).toBeUndefined();
    expect(invaderAgents(state)).toEqual([]);
    expect(state.agents.every((agent) => agent.scare === undefined)).toBe(true);
  });

  it("lays a downed guy on his side, and draws the new poses", () => {
    const { state, random } = room(10);
    invade(state, "raiders", random);
    let down: Agent | undefined;
    run(state, 40, random, (now) => {
      down ??= now.agents.find((agent) => agent.mode === "down");
    });
    expect(down).toBeDefined();
    if (down?.mode === "down") {
      expect(agentPose(down, state.time)).toMatchObject({ pose: "down", lying: true });
    }
    const look = pixelGuyLook("someone");
    for (const pose of ["panic", "down", "cower", "reach"] as const) {
      for (const facing of ["down", "up", "left", "right"] as const) {
        expect(pixelGuyFrame(look, pose, facing, 1).length).toBeGreaterThan(0);
      }
    }
    // Screaming, his mouth is open; out cold, his eyes are shut.
    expect(JSON.stringify(pixelGuyFrame(look, "panic", "down", 0))).not.toBe(JSON.stringify(pixelGuyFrame(look, "stand", "down", 0)));
    expect(JSON.stringify(pixelGuyFrame(look, "down", "down", 0))).not.toBe(JSON.stringify(pixelGuyFrame(look, "stand", "down", 0)));
  });
});
