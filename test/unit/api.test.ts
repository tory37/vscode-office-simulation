import { beforeEach, describe, expect, it } from "vitest";
import type * as vscode from "vscode";
import { createOfficeApi } from "../../src/api";
import { agentsFromHost, lineFromHost, youStatusFromHost } from "../../src/apiAgents";
import { OfficeDirector } from "../../src/officeDirector";
import { OfficePanelProvider } from "../../src/officePanel";
import { PERFORMANCE_KINDS } from "../../src/officePerformances";
import type { OfficeShowKind, OfficeSimulationApi, OfficeVisitorKind } from "../../src/officeSimulationApi";
import { VISITOR_KINDS } from "../../src/officeVisitors";
import { pixelGuyLook } from "../../src/pixelGuy";
import { RACES } from "../../src/pixelRaces";
import { fake, FakeWebviewView, Uri } from "../fakes/vscode";

describe("agentsFromHost", () => {
  it("maps statuses, defaults the seed to the id, and takes the first highlighted guy", () => {
    const { agents, focusedId } = agentsFromHost([
      { id: "a", status: "busy", title: "Fix it" },
      { id: "b", status: "idle", seed: "bee", highlighted: true },
      { id: "c", status: "asleep", highlighted: true },
    ], true);
    expect(agents).toEqual([
      { id: "a", seed: "a", status: "working", title: "Fix it" },
      { id: "b", seed: "bee", status: "idle", title: "" },
      { id: "c", seed: "c", status: "asleep", title: "" },
    ]);
    expect(focusedId).toBe("b");
  });

  it("drops bad entries, duplicates, and the id reserved for your guy", () => {
    const { agents } = agentsFromHost([null, 3, { id: "" , status: "busy" }, { id: "a", status: "working" }, { id: "you", status: "busy" },
      { id: "b", status: "busy" }, { id: "b", status: "idle" }], true);
    expect(agents.map((agent) => agent.id)).toEqual(["b"]);
    expect(agentsFromHost("nope", true).agents).toEqual([]);
  });

  it("fills a partial custom look from the seed's look", () => {
    const { agents } = agentsFromHost([{ id: "a", status: "busy", look: { shirt: "#123456", hairStyle: "nope" } }], true);
    expect(agents[0].look).toEqual({ ...pixelGuyLook("a", true), shirt: "#123456" });
  });

  it("reads your guy's status and a line to say", () => {
    expect(youStatusFromHost("busy")).toBe("busy");
    expect(youStatusFromHost("away")).toBe("auto");
    expect(lineFromHost("  hello  ", 99)).toEqual({ text: "hello", seconds: 20 });
    expect(lineFromHost("x".repeat(200), undefined)?.text).toHaveLength(80);
    expect(lineFromHost("   ", 2)).toBeUndefined();
  });
});

describe("the API's types match the code", () => {
  it("lists every show and visitor kind", () => {
    const shows: Record<OfficeShowKind, true> = { guitarist: true, band: true, lunch: true, snacks: true, comedian: true, magician: true, dj: true };
    const visitors: Record<OfficeVisitorKind, true> = {
      manager: true, vp: true, ceo: true, hr: true, it: true, sales: true, marketing: true, facilities: true, accounting: true, intern: true,
      legal: true, qa: true, security: true, design: true, product: true,
    };
    expect(Object.keys(shows).sort()).toEqual([...PERFORMANCE_KINDS].sort());
    expect(Object.keys(visitors).sort()).toEqual(VISITOR_KINDS.map((kind) => kind.id).sort());
  });
});

describe("the API", () => {
  let office: OfficePanelProvider;
  let api: OfficeSimulationApi;
  let view: FakeWebviewView;

  beforeEach(() => {
    fake.reset();
    office = new OfficePanelProvider({ extensionUri: Uri.file("/ext") as unknown as vscode.Uri });
    api = createOfficeApi(office, new OfficeDirector(office));
    view = new FakeWebviewView();
    office.resolveWebviewView(view as unknown as vscode.WebviewView);
    view.send({ type: "ready" });
  });

  it("sends agents and your guy's status with the room's state", () => {
    api.setAgents([{ id: "a", status: "busy", highlighted: true }]);
    api.setMainGuy("idle");
    const state = view.last("office");
    expect(state?.agents).toEqual([{ id: "a", seed: "a", status: "working", title: "" }]);
    expect(state?.focusedId).toBe("a");
    expect(state?.youStatus).toBe("idle");
  });

  it("plays events, tints, shows, visitors, and lines", () => {
    api.playEvent("hack", 7);
    api.playEvent("boom" as never);
    api.setTint(3);
    api.playShow("band");
    api.playShow("opera" as never);
    api.sendVisitor("ceo");
    api.say("a", "hi there", 2);
    api.say("a", "");
    const types = view.posted.map((message) => message.type);
    expect(view.posted.filter((message) => message.type === "sceneEvent")).toEqual([{ type: "sceneEvent", kind: "hack", variant: 7 }]);
    expect(view.last("tint")).toEqual({ type: "tint", index: 3, burst: true });
    expect(view.posted.filter((message) => message.type === "performance").map((message) => message.kind)).toEqual(["band", "random"]);
    expect(view.last("visitor")).toEqual({ type: "visitor", kind: "ceo" });
    expect(types.filter((type) => type === "say")).toHaveLength(1);
    expect(view.last("say")).toEqual({ type: "say", id: "a", text: "hi there", seconds: 2 });
  });

  it("passes on clicks, shows, and finished events", () => {
    const heard: string[] = [];
    api.onDidClickAgent((id) => heard.push(`click ${id}`));
    api.onDidStartShow((kind) => heard.push(`start ${kind}`));
    api.onDidEndShow((kind) => heard.push(`end ${kind}`));
    api.onDidFinishEvent((kind) => heard.push(`event ${kind}`));
    view.send({ type: "click", id: "you" });
    view.send({ type: "showStart", kind: "dj" });
    view.send({ type: "showEnd", kind: "dj" });
    view.send({ type: "eventEnd", kind: "error" });
    view.send({ type: "showStart", kind: "opera" });
    expect(heard).toEqual(["click you", "start dj", "end dj", "event error"]);
  });

  it("hides its own view while a host's view is attached", () => {
    const opened: number[] = [];
    api.onDidOpenView(() => opened.push(1));
    const hosted = new FakeWebviewView();
    const attachment = api.attachView(hosted as unknown as vscode.WebviewView);
    hosted.send({ type: "ready" });
    expect(opened).toEqual([1]);
    expect(hosted.last("office")).toBeDefined();
    expect(fake.commands).toContainEqual({ command: "setContext", args: ["officeSim.hosted", true] });
    attachment.dispose();
    expect(fake.commands.at(-1)).toEqual({ command: "setContext", args: ["officeSim.hosted", false] });
  });

  it("draws portraits and races for hosts", () => {
    expect(api.races()).toHaveLength(RACES.length);
    expect(api.raceOfSeed(api.seedWithRace("abc", "orc"))).toBe("orc");
    expect(api.seedWithRace("abc", "not-a-race")).toBe("abc");
    const svg = api.portraitSvg(api.lookFromSeed("abc"), { color: "#ff0000", pulse: true });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("#ff0000");
  });
});
