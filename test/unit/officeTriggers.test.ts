import { describe, expect, it } from "vitest";
import { INVASION_KINDS } from "../../src/officeInvasions";
import { PERFORMANCE_KINDS } from "../../src/officePerformances";
import { parseTrigger, TRIGGER_GROUPS, TRIGGER_ITEMS } from "../../src/officeTriggers";
import { VISITOR_KINDS } from "../../src/officeVisitors";
import { seededRandom } from "../../src/pixelGuy";
import { SCENE_EVENT_KINDS } from "../../src/sceneEventSchedule";

describe("officeTriggers", () => {
  it("lists every scene event, invasion, show, and visitor once, in group order", () => {
    expect(TRIGGER_ITEMS).toHaveLength(SCENE_EVENT_KINDS.length + INVASION_KINDS.length + PERFORMANCE_KINDS.length + VISITOR_KINDS.length);
    expect(new Set(TRIGGER_ITEMS.map((item) => item.id)).size).toBe(TRIGGER_ITEMS.length);
    const groups = TRIGGER_ITEMS.map((item) => item.group).filter((group, index, all) => all.indexOf(group) === index);
    expect(groups).toEqual(TRIGGER_GROUPS);
  });

  it("reads every id back, and nothing else", () => {
    for (const item of TRIGGER_ITEMS) {
      expect(parseTrigger(item.id)).toBeDefined();
    }
    expect(parseTrigger("invasion:zombies")).toEqual({ kind: "invasion", invasion: "zombies" });
    expect(parseTrigger("scene:hack")).toEqual({ kind: "scene", event: "hack" });
    expect(parseTrigger("show:dj")).toEqual({ kind: "show", show: "dj" });
    expect(parseTrigger("visitor:ceo")).toEqual({ kind: "visitor", department: "ceo" });
    for (const bad of ["invasion:goblins", "show", "zombies", 3, undefined]) {
      expect(parseTrigger(bad)).toBeUndefined();
    }
    expect(parseTrigger("random", seededRandom(2))).toBeDefined();
  });
});
