import { describe, expect, it } from "vitest";
import { CARRY_ICONS, carryIconPixels } from "../../src/activityCarryIcons";
import { ACTIVITY_KINDS } from "../../src/officeActivities";

describe("carry icons", () => {
  it("has a picture for every activity, small enough to carry, with every pixel colored", () => {
    for (const kind of ACTIVITY_KINDS) {
      const rows = CARRY_ICONS[kind].rows;
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThanOrEqual(10);
      expect(new Set(rows.map((row) => row.length)).size).toBe(1);
      expect(rows[0].length).toBeLessThanOrEqual(14);
      expect(carryIconPixels(kind)).toHaveLength(rows.join("").replace(/\./g, "").length);
    }
  });
});
