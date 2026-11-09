import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as vscode from "vscode";
import { ClaudeBridge } from "../../src/claudeBridge";
import { OfficePanelProvider } from "../../src/officePanel";
import { fake, FakeWebviewView, Uri } from "../fakes/vscode";

describe("ClaudeBridge", () => {
  let home: string;
  let previousHome: string | undefined;
  let office: OfficePanelProvider;
  let view: FakeWebviewView;
  let bridge: ClaudeBridge | undefined;
  const settingsFile = () => path.join(home, ".claude", "settings.json");
  const eventsFile = () => path.join(home, ".claude", "office-simulation", "events.jsonl");
  const hook = (event: string, extra: Record<string, unknown> = {}) =>
    fs.appendFileSync(eventsFile(), `${JSON.stringify({ hook_event_name: event, session_id: "s1", cwd: "/work/app", ...extra })}\n`);

  beforeEach(() => {
    fake.reset();
    home = fs.mkdtempSync(path.join(os.tmpdir(), "office-claude-"));
    previousHome = process.env.HOME;
    process.env.HOME = home;
    fs.mkdirSync(path.join(home, ".claude"));
    fs.writeFileSync(settingsFile(), JSON.stringify({ model: "opus", hooks: { Stop: [{ hooks: [{ type: "command", command: "say hi" }] }] } }));
    office = new OfficePanelProvider({ extensionUri: Uri.file("/ext") as unknown as vscode.Uri });
    view = new FakeWebviewView();
    office.resolveWebviewView(view as unknown as vscode.WebviewView);
    view.send({ type: "ready" });
    vi.useFakeTimers();
  });

  afterEach(() => {
    bridge?.dispose();
    vi.useRealTimers();
    process.env.HOME = previousHome;
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("does nothing unless you say Connect", async () => {
    bridge = new ClaudeBridge(office);
    await bridge.connect();
    expect(JSON.parse(fs.readFileSync(settingsFile(), "utf8")).hooks.UserPromptSubmit).toBeUndefined();
  });

  it("connects, follows Claude, and disconnects leaving your hooks", async () => {
    bridge = new ClaudeBridge(office);
    fake.answer = "Connect";
    await bridge.connect();
    const settings = JSON.parse(fs.readFileSync(settingsFile(), "utf8"));
    expect(settings.model).toBe("opus");
    expect(settings.hooks.Stop).toHaveLength(2);
    expect(fs.existsSync(`${settingsFile()}.office-simulation.bak`)).toBe(true);

    hook("UserPromptSubmit", { prompt: "Fix the build" });
    vi.advanceTimersByTime(1600);
    expect(view.last("office")?.youStatus).toBe("busy");
    expect(view.last("office")?.agents).toEqual([{ id: "claude-s1", seed: "s1", status: "working", title: "Fix the build" }]);

    hook("Stop");
    vi.advanceTimersByTime(2000);
    expect(view.last("office")?.youStatus).toBe("auto");
    expect(view.last("say")).toEqual({ type: "say", id: "claude-s1", text: "done!", seconds: 3 });

    await bridge.disconnect();
    expect(JSON.parse(fs.readFileSync(settingsFile(), "utf8"))).toEqual({ model: "opus", hooks: { Stop: [{ hooks: [{ type: "command", command: "say hi" }] }] } });
    expect(view.last("office")?.agents).toEqual([]);
  });

  it("leaves your guy and the workers to a host that drives them", async () => {
    bridge = new ClaudeBridge(office);
    fake.answer = "Connect";
    await bridge.connect();
    office.hostOwnsAgents = true;
    office.hostOwnsMainGuy = true;
    office.setAgents([{ id: "host", seed: "host", status: "idle", title: "" }]);
    hook("UserPromptSubmit");
    vi.advanceTimersByTime(1600);
    expect(view.last("office")?.agents).toEqual([{ id: "host", seed: "host", status: "idle", title: "" }]);
    expect(view.last("office")?.youStatus).toBe("auto");
  });

  it("refuses to touch settings it can't read", async () => {
    fs.writeFileSync(settingsFile(), "{ not json");
    bridge = new ClaudeBridge(office);
    fake.answer = "Connect";
    await bridge.connect();
    expect(fs.readFileSync(settingsFile(), "utf8")).toBe("{ not json");
    expect(fake.messages.at(-1)).toContain("Couldn't read");
  });
});
