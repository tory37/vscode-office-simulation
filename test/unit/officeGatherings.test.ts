import { describe, expect, it } from "vitest";
import { buildOfficeLayout, isWalkable, pushDesksAside } from "../../src/officeLayout";
import {
  GATHERING_KINDS, GATHERINGS, GatheringKindId, gatheringFrequency, gatheringGap, isGatheringKind, planGathering,
} from "../../src/officeGatherings";
import {
  AgentInput, agentPose, createOffice, endGathering, gatheringHosts, OfficeState, startGathering, startInvasion, stepOffice, syncOffice, syncYou,
} from "../../src/officeSim";
import { seededRandom } from "../../src/pixelGuy";

const input = (id: string, status: AgentInput["status"]): AgentInput => ({ id, seed: id, status, title: `Session ${id}` });

function room(seed: number, guys = 8, cols = 16): { state: OfficeState; random: () => number } {
  const random = seededRandom(seed);
  const state = createOffice(buildOfficeLayout(cols, 9, "office", true));
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

function gather(state: OfficeState, kind: GatheringKindId, random: () => number): boolean {
  const plan = planGathering(random, kind);
  const host = GATHERINGS[kind].host;
  return startGathering(state, {
    kind, title: plan.title, call: plan.call, lines: plan.lines, closer: plan.closer, length: plan.length, turnLines: plan.turnLines,
    host: host === undefined ? undefined : { id: `host|${kind}`, seed: `gather|${kind}|0`, title: host.title },
  }, random);
}

const deskSpots = (state: OfficeState) => JSON.stringify([state.layout.desks, state.layout.station]);

describe("pushDesksAside", () => {
  it("opens a strip of floor down the middle, keeps the corridors, and every seat still opens onto an aisle", () => {
    for (const [cols, rows, station] of [[10, 8, true], [16, 8, true], [13, 11, false], [22, 9, true], [40, 14, true]] as const) {
      const layout = buildOfficeLayout(cols, rows, "office", station);
      const pushed = pushDesksAside(layout);
      expect(pushed).toBeDefined();
      const { area, layout: after } = pushed!;
      expect(area.right - area.left + 1).toBeGreaterThanOrEqual(2);
      for (let y = area.top; y <= area.bottom; y++) {
        for (let x = area.left; x <= area.right; x++) {
          expect(after.tiles[y][x]).toBe("floor");
        }
      }
      for (let y = 1; y < rows - 1; y++) {
        expect(after.tiles[y][0]).toBe("floor");
        expect(after.tiles[y][cols - 1]).toBe("floor");
      }
      expect(after.desks).toHaveLength(layout.desks.length);
      for (const desk of after.desks) {
        expect(after.tiles[desk.desk.y][desk.desk.x]).toBe("desk");
        expect(isWalkable(after, { x: desk.seat.x, y: desk.seat.y + 1 })).toBe(true);
      }
      // The original isn't touched.
      expect(layout.tiles).toEqual(buildOfficeLayout(cols, rows, "office", station).tiles);
    }
  });
});

describe("gatherings", () => {
  it("has sane specs and plans", () => {
    expect(GATHERING_KINDS).toHaveLength(10);
    for (const kind of GATHERING_KINDS) {
      const plan = planGathering(seededRandom(3), kind);
      expect(plan.kind).toBe(kind);
      expect(plan.lines.length).toBeGreaterThan(2);
      expect(plan.call.length).toBeGreaterThan(0);
      expect(plan.length).toBeGreaterThanOrEqual(GATHERINGS[kind].length[0]);
      if (GATHERINGS[kind].turns !== undefined) {
        expect(plan.turnLines.length).toBeGreaterThan(0);
      }
    }
    expect(isGatheringKind("yoga")).toBe(true);
    expect(isGatheringKind("rave")).toBe(false);
    expect(gatheringFrequency(undefined)).toBe("normal");
    expect(gatheringFrequency(false)).toBe("off");
    expect(gatheringGap(() => 0.5, "often")).toBeGreaterThan(4 * 60);
  });

  for (const kind of GATHERING_KINDS) {
    it(`plays ${kind} from the call to the desks sliding back`, () => {
      const { state, random } = room(11 + GATHERING_KINDS.indexOf(kind));
      const before = deskSpots(state);
      expect(gather(state, kind, random)).toBe(true);
      expect(gather(state, kind, random)).toBe(false);
      const phases: string[] = [];
      let pushed = false;
      let most = 0;
      let turns = 0;
      const start = state.time;
      while (state.gathering !== undefined && state.time - start < 200) {
        stepOffice(state, 0.05, random);
        const gathering = state.gathering;
        if (gathering === undefined) {
          break;
        }
        if (phases.at(-1) !== gathering.phase) {
          phases.push(gathering.phase);
        }
        pushed ||= deskSpots(state) !== before;
        const at = state.agents.filter((agent) => agent.mode === "gather");
        most = Math.max(most, at.length);
        if (gathering.turn?.phase === "doing") {
          turns = Math.max(turns, gathering.turnsTaken.length);
        }
        for (const agent of at) {
          expect(() => agentPose(agent, state.time, gathering)).not.toThrow();
        }
        // Busy guys keep working.
        for (const agent of state.agents) {
          if (agent.status === "working" && !agent.you && agent.gatherHost !== true) {
            expect(agent.goal?.kind).not.toBe("gather");
          }
        }
      }
      expect(phases).toEqual(["call", "gather", "on", "closing"]);
      expect(pushed).toBe(true);
      expect(deskSpots(state)).toBe(before);
      // Everyone free came: the idle and asleep guys (and you, maybe) plus a host.
      expect(most).toBeGreaterThanOrEqual(5);
      if (GATHERINGS[kind].turns !== undefined) {
        expect(turns).toBeGreaterThanOrEqual(2);
      }
      run(state, 20, random);
      expect(gatheringHosts(state)).toHaveLength(0);
      expect(state.agents.some((agent) => agent.goal?.kind === "gather" || agent.mode === "gather")).toBe(false);
      // Everyone is somewhere he can stand.
      for (const agent of state.agents) {
        expect(isWalkable(state.layout, { x: Math.round(agent.x), y: Math.round(agent.y) })).toBe(true);
      }
    });
  }

  it("needs someone free to come", () => {
    const random = seededRandom(5);
    const state = createOffice(buildOfficeLayout(16, 9, "office"));
    syncOffice(state, [input("a", "working"), input("b", "working")], random, "seated");
    expect(gather(state, "yoga", random)).toBe(false);
    expect(gather(state, "cardDuel", random)).toBe(false);
  });

  it("serves cake and lies everyone down for savasana", () => {
    const { state, random } = room(21);
    gather(state, "birthday", random);
    let ate = false;
    run(state, 90, random, (now) => {
      ate ||= now.agents.some((agent) => agent.mode === "gather" && agentPose(agent, now.time, now.gathering).pose === "eat");
    });
    expect(ate).toBe(true);
    gather(state, "yoga", random);
    let resting = 0;
    run(state, 100, random, (now) => {
      resting = Math.max(resting, now.agents.filter((agent) => agent.mode === "gather" && agentPose(agent, now.time, now.gathering).resting === true).length);
    });
    expect(resting).toBeGreaterThanOrEqual(3);
  });

  it("ends when an invasion comes, and the desks go back", () => {
    const { state, random } = room(31);
    const before = deskSpots(state);
    gather(state, "danceCircle", random);
    run(state, 10, random);
    expect(deskSpots(state)).not.toBe(before);
    startInvasion(state, { kind: "zombies", length: 20, invaders: [{ id: "z", seed: "invader|zombies|0", title: "Zombie" }] }, random);
    expect(state.gathering).toBeUndefined();
    expect(deskSpots(state)).toBe(before);
  });

  it("stops, and a guy who gets busy goes back to work", () => {
    const { state, random } = room(41);
    gather(state, "karaoke", random);
    run(state, 12, random);
    const guy = state.agents.find((agent) => agent.goal?.kind === "gather" && !agent.you && agent.id !== state.gathering?.leadId)!;
    syncOffice(state, state.agents.filter((agent) => agent.id.startsWith("g")).map((agent) => input(agent.id, agent.id === guy.id ? "working" : agent.status)), random);
    expect(guy.goal?.kind).toBe("work");
    endGathering(state, random);
    expect(state.gathering).toBeUndefined();
    run(state, 10, random);
    expect(state.agents.some((agent) => agent.mode === "gather")).toBe(false);
  });
});
