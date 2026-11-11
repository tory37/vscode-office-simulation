import { afterEach, describe, expect, it, vi } from "vitest";
import type * as vscode from "vscode";
import { isNight, NIGHT_SKY, DAYTIME_SKY, skyToggle } from "../../src/officeDaylight";
import { OfficeDirector } from "../../src/officeDirector";
import { OfficePanelProvider, SKY_OVERRIDE_MS } from "../../src/officePanel";
import { buildOfficeLayout } from "../../src/officeLayout";
import { createOffice, sendVisitorsHome, stepOffice, syncOffice, visitorAgents, visitorArrives } from "../../src/officeSim";
import { seededRandom } from "../../src/pixelGuy";
import { fake, FakeWebviewView, Uri } from "../fakes/vscode";

function openOffice(): { office: OfficePanelProvider; view: FakeWebviewView } {
  const office = new OfficePanelProvider({ extensionUri: Uri.file("/ext") as unknown as vscode.Uri });
  const view = new FakeWebviewView();
  office.resolveWebviewView(view as unknown as vscode.WebviewView);
  view.send({ type: "ready" });
  return { office, view };
}

afterEach(() => {
  vi.useRealTimers();
  fake.settings.delete("officeSim.quiet");
});

describe("the Office's buttons", () => {
  it("skips to night by day and to day by night, then back to the clock", () => {
    expect(isNight(NIGHT_SKY)).toBe(true);
    expect(isNight(DAYTIME_SKY)).toBe(false);
    expect(skyToggle(DAYTIME_SKY)).toBe("night");
    expect(skyToggle(NIGHT_SKY)).toBe("day");
  });

  it("holds the Night button's sky for ten minutes, or until it's pressed again", () => {
    vi.useFakeTimers();
    const { office, view } = openOffice();
    const noon = new Date(2026, 5, 21, 12, 0);
    expect(office.toggleSky(noon)).toBe("night");
    expect(view.last("office")).toMatchObject({ sky: "night" });
    vi.advanceTimersByTime(SKY_OVERRIDE_MS);
    expect(view.last("office")).toMatchObject({ sky: null });
    office.toggleSky(noon);
    expect(office.toggleSky(noon)).toBeUndefined();
    expect(view.last("office")).toMatchObject({ sky: null });
    office.dispose();
  });

  it("sends Stop and the quiet setting to the view", () => {
    const { office, view } = openOffice();
    office.stopEverything();
    expect(view.last("stop")).toEqual({ type: "stop" });
    expect(view.last("office")).toMatchObject({ quiet: false });
    office.dispose();
  });

  it("keeps a host's own events out while quiet, but plays the answer to a request", () => {
    const { office, view } = openOffice();
    const director = new OfficeDirector(office);
    director.hostTakesRequests = true;
    director.takeOver();
    fake.settings.set("officeSim.quiet", true);
    const events = () => view.posted.filter((message) => message.type === "sceneEvent").length;
    const before = events();
    director.playEvent("hack", undefined, true);
    expect(events()).toBe(before);
    director.onDidRequestEvent((kind) => director.playEvent(kind, undefined, true));
    director.requestEvent("error");
    expect(events()).toBe(before + 1);
    director.dispose();
    office.dispose();
  });

  it("sends every visitor home", () => {
    const random = seededRandom(1);
    const state = createOffice(buildOfficeLayout(12, 8, "office"));
    syncOffice(state, [{ id: "a", seed: "a", status: "idle", title: "A" }], random, "seated");
    visitorArrives(state, { id: "v", seed: "v", title: "CEO", lines: ["hi"], stay: 600 }, random);
    for (let elapsed = 0; elapsed < 20; elapsed += 0.05) stepOffice(state, 0.05, random);
    sendVisitorsHome(state);
    expect(visitorAgents(state).every((agent) => agent.leaving)).toBe(true);
  });
});
