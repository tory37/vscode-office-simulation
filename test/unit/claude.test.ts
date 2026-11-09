import { describe, expect, it } from "vitest";
import { applyClaudeEvent, ClaudeSession, forgetStale, inWorkspace, mainGuyFor, parseHookLine, workersFor } from "../../src/claudeActivity";
import { HOOK_COMMAND, HOOK_EVENTS, hasOfficeHooks, withOfficeHooks, withoutOfficeHooks } from "../../src/claudeHooks";

describe("Claude hooks in settings.json", () => {
  const yours = { hooks: { Stop: [{ hooks: [{ type: "command", command: "say done" }] }], PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "lint" }] }] }, model: "x" };

  it("adds one hook per event beside yours, once", () => {
    const added = withOfficeHooks(yours);
    expect(hasOfficeHooks(yours)).toBe(false);
    expect(hasOfficeHooks(added)).toBe(true);
    expect(added.model).toBe("x");
    const hooks = added.hooks as Record<string, { hooks: { command: string }[] }[]>;
    expect(Object.keys(hooks).sort()).toEqual([...HOOK_EVENTS, "PreToolUse"].sort());
    expect(hooks.Stop.map((entry) => entry.hooks[0].command)).toEqual(["say done", HOOK_COMMAND]);
    expect(withOfficeHooks(added)).toEqual(added);
  });

  it("takes out only its own hooks", () => {
    expect(withoutOfficeHooks(withOfficeHooks(yours))).toEqual(yours);
    expect(withoutOfficeHooks(withOfficeHooks({}))).toEqual({});
    expect(withoutOfficeHooks({ model: "y" })).toEqual({ model: "y" });
  });

  it("appends the hook input and prints nothing", () => {
    expect(HOOK_COMMAND).toMatch(/>> "\$HOME\/\.claude\/office-simulation\/events\.jsonl"$/);
    expect(HOOK_COMMAND).not.toMatch(/echo [^;]/);
  });
});

describe("Claude activity", () => {
  const line = (event: string, extra: Record<string, unknown> = {}) => JSON.stringify({ hook_event_name: event, session_id: "s1", cwd: "/work/app", ...extra });

  it("reads hook lines, and skips anything else", () => {
    expect(parseHookLine(line("Stop"))).toEqual({ event: "Stop", sessionId: "s1", cwd: "/work/app" });
    expect(parseHookLine("not json")).toBeUndefined();
    expect(parseHookLine(JSON.stringify({ hook_event_name: "Stop" }))).toBeUndefined();
  });

  it("follows a session from its first prompt to its end", () => {
    const sessions = new Map<string, ClaudeSession>();
    const apply = (text: string, at: number) => applyClaudeEvent(sessions, parseHookLine(text)!, at);
    apply(line("SessionStart"), 1);
    expect(sessions.get("s1")?.status).toBe("idle");
    apply(line("UserPromptSubmit", { prompt: "  Fix the   flaky login test, the one that times out on CI every other run" }), 2);
    expect(sessions.get("s1")).toMatchObject({ status: "busy", title: "Fix the flaky login test, the one that times ou…" });
    apply(line("UserPromptSubmit", { prompt: "and another" }), 3);
    expect(sessions.get("s1")?.title.startsWith("Fix the flaky")).toBe(true);
    expect(mainGuyFor([...sessions.values()])).toBe("busy");
    expect(apply(line("Notification", { message: "Claude needs permission" }), 4)).toBe("need you!");
    expect(workersFor([...sessions.values()])).toEqual([{ id: "claude-s1", status: "idle", title: sessions.get("s1")!.title, seed: "s1" }]);
    expect(apply(line("Stop"), 5)).toBe("done!");
    expect(mainGuyFor([...sessions.values()])).toBe("auto");
    apply(line("SessionEnd"), 6);
    expect(sessions.size).toBe(0);
  });

  it("forgets quiet sessions after a while, but never a busy one", () => {
    const sessions = new Map<string, ClaudeSession>([
      ["a", { id: "a", cwd: "", status: "idle", title: "", lastAt: 0 }],
      ["b", { id: "b", cwd: "", status: "busy", title: "", lastAt: 0 }],
    ]);
    forgetStale(sessions, 3 * 60 * 60 * 1000);
    expect([...sessions.keys()]).toEqual(["b"]);
  });

  it("keeps to this window's folders", () => {
    expect(inWorkspace("/work/app/src", ["/work/app"])).toBe(true);
    expect(inWorkspace("/work/application", ["/work/app"])).toBe(false);
    expect(inWorkspace("C:\\Work\\App", ["c:/work/app/"])).toBe(true);
    expect(inWorkspace("/anywhere", [])).toBe(true);
  });
});
