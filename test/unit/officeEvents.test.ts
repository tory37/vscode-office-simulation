import { describe, expect, it } from "vitest";
import { eventFrequency, eventGapMs, isEventKind, pickEventKind, tintGapMs } from "../../src/officeEvents";

describe("office events", () => {
  it("reads the frequency, defaulting to normal", () => {
    expect(eventFrequency("often")).toBe("often");
    expect(eventFrequency("off")).toBe("off");
    expect(eventFrequency("loud")).toBe("normal");
    expect(eventFrequency(undefined)).toBe("normal");
  });

  it("has no gap when off", () => {
    expect(eventGapMs("off", () => 0.5)).toBeUndefined();
  });

  it("spreads gaps from 0.6x to 1.6x the average", () => {
    expect(eventGapMs("normal", () => 0)).toBe(3 * 60_000);
    expect(eventGapMs("normal", () => 0.999999)).toBeCloseTo(8 * 60_000, -2);
  });

  it("plays the first event sooner", () => {
    expect(eventGapMs("rare", () => 0.5, true)).toBe(2 * 60_000);
    expect(eventGapMs("often", () => 0.5, true)).toBe(2 * 60_000);
  });

  it("picks a kind across the whole range", () => {
    expect(pickEventKind(() => 0)).toBe("error");
    expect(pickEventKind(() => 0.999999)).toBe("defense");
    expect(isEventKind("hack")).toBe(true);
    expect(isEventKind("boom")).toBe(false);
  });

  it("moves the tint every 20 to 40 seconds", () => {
    expect(tintGapMs(() => 0)).toBe(20_000);
    expect(tintGapMs(() => 1)).toBe(40_000);
  });
});
