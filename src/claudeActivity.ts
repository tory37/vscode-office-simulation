// Pure: what Claude Code is up to, from the hook lines the Office's hooks append, and what the Office shows for it.
// A prompt makes a session busy; stopping makes it idle; a notification means it's waiting on you; ending removes it.

export type ClaudeStatus = "busy" | "idle" | "waiting";

export interface ClaudeSession {
  id: string;
  cwd: string;
  status: ClaudeStatus;
  // His title: the first prompt, cut short.
  title: string;
  lastAt: number;
}

export interface ClaudeEvent {
  event: string;
  sessionId: string;
  cwd: string;
  prompt?: string;
  message?: string;
}

// One hook line, or undefined for anything that isn't one.
export function parseHookLine(line: string): ClaudeEvent | undefined {
  try {
    const value = JSON.parse(line) as Record<string, unknown>;
    const event = value.hook_event_name;
    const sessionId = value.session_id;
    if (typeof event !== "string" || typeof sessionId !== "string" || sessionId === "") {
      return undefined;
    }
    return {
      event,
      sessionId,
      cwd: typeof value.cwd === "string" ? value.cwd : "",
      ...(typeof value.prompt === "string" ? { prompt: value.prompt } : {}),
      ...(typeof value.message === "string" ? { message: value.message } : {}),
    };
  } catch {
    return undefined;
  }
}

const TITLE_LENGTH = 48;

function titleFrom(prompt: string | undefined): string | undefined {
  const text = prompt?.replace(/\s+/g, " ").trim();
  if (text === undefined || text === "") {
    return undefined;
  }
  return text.length > TITLE_LENGTH ? `${text.slice(0, TITLE_LENGTH - 1)}…` : text;
}

// The sessions after one event. Returns a line to say over the session's guy, if the event calls for one.
export function applyClaudeEvent(sessions: Map<string, ClaudeSession>, event: ClaudeEvent, now: number): string | undefined {
  const known = sessions.get(event.sessionId);
  if (event.event === "SessionEnd") {
    sessions.delete(event.sessionId);
    return undefined;
  }
  const session: ClaudeSession = known ?? { id: event.sessionId, cwd: event.cwd, status: "idle", title: "Claude", lastAt: now };
  session.cwd = event.cwd || session.cwd;
  session.lastAt = now;
  sessions.set(session.id, session);
  switch (event.event) {
    case "UserPromptSubmit":
      session.status = "busy";
      if (session.title === "Claude") {
        session.title = titleFrom(event.prompt) ?? session.title;
      }
      return undefined;
    case "Stop":
      session.status = "idle";
      return "done!";
    case "Notification":
      session.status = "waiting";
      return "need you!";
    default:
      return undefined;
  }
}

// Sessions that went quiet a long time ago are forgotten, in case their end was missed.
export function forgetStale(sessions: Map<string, ClaudeSession>, now: number, maxAgeMs = 2 * 60 * 60 * 1000): void {
  for (const [id, session] of sessions) {
    if (session.status !== "busy" && now - session.lastAt > maxAgeMs) {
      sessions.delete(id);
    }
  }
}

// Whether a session's folder is in this window's workspace (any folder when there's none open).
export function inWorkspace(cwd: string, folders: readonly string[]): boolean {
  if (folders.length === 0) {
    return true;
  }
  const normal = (path: string) => path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  const here = normal(cwd);
  return folders.some((folder) => here === normal(folder) || here.startsWith(`${normal(folder)}/`));
}

// Your guy works while any of this workspace's sessions does.
export function mainGuyFor(sessions: readonly ClaudeSession[]): "busy" | "auto" {
  return sessions.some((session) => session.status === "busy") ? "busy" : "auto";
}

// A worker per session, for the API's setAgents: waiting shows as idle, with his line over him.
export function workersFor(sessions: readonly ClaudeSession[]): { id: string; status: "busy" | "idle"; title: string; seed: string }[] {
  return sessions.map((session) => ({
    id: `claude-${session.id}`,
    status: session.status === "busy" ? "busy" : "idle",
    title: session.title,
    seed: session.id,
  }));
}
