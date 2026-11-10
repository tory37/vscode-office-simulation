import { describe, expect, it } from "vitest";
import { ACTIVITIES, ACTIVITY_KINDS, activityLevel, activityTarget, activityWidth, pickActivityKind } from "../../src/officeActivities";
import { buildOfficeLayout } from "../../src/officeLayout";
import { activityFit, addActivity, Agent, AgentInput, createOffice, crewAgents, OfficeState, relayoutOffice, stepOffice, syncOffice } from "../../src/officeSim";
import { POSE_FRAMES, seededRandom } from "../../src/pixelGuy";

const idle = (id: string): AgentInput => ({ id, seed: id, status: "idle", title: id });

function run(state: OfficeState, seconds: number, random: () => number, each?: () => void): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) {
    stepOffice(state, 0.05, random);
    each?.();
  }
}

const activityGoal = (agent: Agent) => (agent.goal?.kind === "activity" ? agent.goal : undefined);
const wantedSpots = (state: OfficeState) => new Set(state.agents.flatMap((agent) => (agent.deskIndex === undefined ? [] : [agent.deskIndex])));

describe("officeActivities", () => {
  it("holds more activities with more free desk spots, up to a cap, and none when off", () => {
    expect(activityTarget("off", 20)).toBe(0);
    expect(activityTarget("some", 1)).toBe(0);
    expect(activityTarget("some", 3)).toBe(1);
    expect(activityTarget("some", 10)).toBeGreaterThan(activityTarget("some", 5));
    expect(activityTarget("lots", 10)).toBeGreaterThan(activityTarget("few", 10));
    expect(activityTarget("some", 100)).toBe(6);
    expect(activityLevel("lots")).toBe("lots");
    expect(activityLevel("bogus")).toBe("some");
  });

  it("brings in a kind the room doesn't have yet when it can", () => {
    const random = seededRandom(3);
    const standing = ACTIVITY_KINDS.filter((kind) => kind !== "chess");
    expect(pickActivityKind(random, standing, () => true)).toBe("chess");
    expect(pickActivityKind(random, [], (kind) => activityWidth(kind) === 2 && ACTIVITIES[kind].play === "versus")).toMatch(/pingPong|foosball|airHockey|chess/);
    expect(pickActivityKind(random, [], () => false)).toBeUndefined();
  });

  it("has lines for every kind, and a frame count for every pose it uses", () => {
    for (const kind of ACTIVITY_KINDS) {
      const spec = ACTIVITIES[kind];
      expect(spec.lines.length).toBeGreaterThan(2);
      expect(POSE_FRAMES[spec.pose]).toBeGreaterThan(0);
      if (spec.play === "versus") {
        expect(activityWidth(kind)).toBe(2);
        expect(spec.win?.length).toBeGreaterThan(0);
      }
    }
  });

  it("opens with activities on free desk spots, never on a guy's", () => {
    const random = seededRandom(4);
    const state = createOffice(buildOfficeLayout(13, 8, "office"));
    state.activityLevel = "lots";
    syncOffice(state, ["a", "b", "c"].map(idle), random, "seated");
    const activities = state.activities ?? [];
    expect(activities.length).toBeGreaterThan(1);
    const wanted = wantedSpots(state);
    for (const activity of activities) {
      const fit = activityFit(state.layout, activity.kind, activity.index);
      expect(fit).toBeDefined();
      expect(fit?.indexes.some((index) => wanted.has(index))).toBe(false);
      for (const tile of fit?.blocked ?? []) {
        expect(state.layout.tiles[tile.y][tile.x]).toBe("gear");
      }
    }
  });

  it("has the crew carry one in when activities turn on, and carry them all out when they turn off", () => {
    const random = seededRandom(5);
    const state = createOffice(buildOfficeLayout(13, 8, "office"));
    syncOffice(state, ["a", "b"].map(idle), random, "seated");
    expect(state.activities ?? []).toHaveLength(0);
    state.activityLevel = "some";
    let carried = false;
    run(state, 90, random, () => {
      carried ||= crewAgents(state).some((member) => member.crew?.job?.item !== undefined && member.crew.carrying !== undefined);
    });
    expect(carried).toBe(true);
    expect((state.activities ?? []).length).toBeGreaterThan(0);
    state.activityLevel = "off";
    run(state, 120, random);
    expect(state.activities ?? []).toHaveLength(0);
    for (const row of state.layout.tiles) {
      expect(row).not.toContain("gear");
    }
  });

  it("clears an activity off a spot a new guy needs, then brings his desk", () => {
    const random = seededRandom(6);
    const state = createOffice(buildOfficeLayout(10, 8, "office"));
    state.activityLevel = "lots";
    const first = Array.from({ length: 6 }, (_, index) => idle(`g${index}`));
    syncOffice(state, first, random, "seated");
    const covered = new Set((state.activities ?? []).flatMap((activity) => activityFit(state.layout, activity.kind, activity.index)?.indexes ?? []));
    expect(covered.size).toBeGreaterThan(0);
    const everyone = [...first, ...Array.from({ length: 6 }, (_, index) => idle(`n${index}`))];
    syncOffice(state, everyone, random);
    run(state, 150, random);
    const wanted = wantedSpots(state);
    expect([...covered].some((index) => wanted.has(index))).toBe(true);
    for (const index of wanted) {
      expect(state.placed.has(index)).toBe(true);
    }
    for (const activity of state.activities ?? []) {
      expect(activityFit(state.layout, activity.kind, activity.index)?.indexes.some((index) => wanted.has(index))).toBe(false);
    }
  });

  it("has two idle guys face off at a table game", () => {
    const random = seededRandom(7);
    const state = createOffice(buildOfficeLayout(13, 8, "office"));
    syncOffice(state, ["a", "b"].map(idle), random, "seated");
    state.activityLevel = "few";
    const index = state.layout.desks.findIndex((_, spot) => addActivity(state, "pingPong", spot, random));
    expect(index).toBeGreaterThanOrEqual(0);
    let together = false;
    let said = false;
    run(state, 400, random, () => {
      const players = state.agents.filter((agent) => activityGoal(agent)?.activity === "pingPong" && agent.mode === "play" && agent.path.length === 0);
      if (players.length === 2) {
        together = true;
        expect(new Set(players.map((player) => player.facing))).toEqual(new Set(["left", "right"]));
      }
      said ||= together && state.agents.some((agent) => ["game!", "too easy", "rematch?", "best of three", "lucky", "ugh, the net"].includes(agent.bubble?.text ?? ""));
    });
    expect(together).toBe(true);
    expect(said).toBe(true);
  });

  it("has a buddy wait beside the pinball machine and take his turn", () => {
    const random = seededRandom(8);
    const state = createOffice(buildOfficeLayout(13, 8, "office"));
    syncOffice(state, ["a", "b"].map(idle), random, "seated");
    state.activityLevel = "few";
    state.layout.desks.some((_, spot) => addActivity(state, "pinball", spot, random));
    const playedBy = new Set<string>();
    let waited = false;
    run(state, 400, random, () => {
      for (const agent of state.agents) {
        const goal = activityGoal(agent);
        if (goal?.activity === "pinball" && agent.path.length === 0) {
          if (agent.mode === "play") {
            playedBy.add(agent.id);
          }
          waited ||= agent.mode === "wait" && state.agents.some((other) => other !== agent && other.mode === "play" && activityGoal(other)?.activity === "pinball");
        }
      }
    });
    expect(waited).toBe(true);
    expect(playedBy.size).toBe(2);
  });

  it("keeps activities through a relayout, off everyone's spots", () => {
    const random = seededRandom(9);
    const state = createOffice(buildOfficeLayout(13, 8, "office"));
    state.activityLevel = "lots";
    syncOffice(state, ["a", "b", "c"].map(idle), random, "seated");
    const before = (state.activities ?? []).length;
    expect(before).toBeGreaterThan(0);
    run(state, 20, random);
    relayoutOffice(state, buildOfficeLayout(16, 8, "office"), random);
    expect((state.activities ?? []).length).toBeGreaterThan(0);
    const wanted = wantedSpots(state);
    for (const activity of state.activities ?? []) {
      expect(activityFit(state.layout, activity.kind, activity.index)?.indexes.some((index) => wanted.has(index))).toBe(false);
    }
    run(state, 60, random);
    expect(state.agents.every((agent) => Number.isFinite(agent.x) && Number.isFinite(agent.y))).toBe(true);
  });
});
