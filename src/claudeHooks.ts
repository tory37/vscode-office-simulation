// Pure: the Claude Code hooks the Office adds to ~/.claude/settings.json when you connect it, and taking them out
// again. Each hook appends Claude's hook input (one JSON line) to a file the extension reads. It prints nothing, so
// nothing reaches the agent's context, and it needs nothing but a shell.

export const EVENTS_FILE = "~/.claude/office-simulation/events.jsonl";
// How the Office's own hooks are told apart from yours: their command writes to this file.
const MARKER = "office-simulation/events.jsonl";

export const HOOK_EVENTS = ["SessionStart", "UserPromptSubmit", "Stop", "Notification", "SessionEnd"] as const;

export const HOOK_COMMAND = `mkdir -p "$HOME/.claude/office-simulation"; { cat; echo; } >> "$HOME/.claude/${MARKER}"`;

type Settings = Record<string, unknown>;
type HookEntry = { matcher?: string; hooks?: { type?: string; command?: string }[] };

const isOurs = (hook: { command?: unknown }) => typeof hook.command === "string" && hook.command.includes(MARKER);

function hooksOf(settings: Settings): Record<string, HookEntry[]> {
  const hooks = settings.hooks;
  return hooks !== null && typeof hooks === "object" && !Array.isArray(hooks) ? (hooks as Record<string, HookEntry[]>) : {};
}

export function hasOfficeHooks(settings: Settings): boolean {
  const hooks = hooksOf(settings);
  return HOOK_EVENTS.every((event) => (Array.isArray(hooks[event]) ? hooks[event] : []).some((entry) => (entry.hooks ?? []).some(isOurs)));
}

// The settings with the Office's hooks added, leaving everything else as it was. Adding twice changes nothing.
export function withOfficeHooks(settings: Settings): Settings {
  const cleaned = withoutOfficeHooks(settings);
  const hooks = { ...hooksOf(cleaned) };
  for (const event of HOOK_EVENTS) {
    const entries = Array.isArray(hooks[event]) ? hooks[event] : [];
    hooks[event] = [...entries, { hooks: [{ type: "command", command: HOOK_COMMAND }] }];
  }
  return { ...cleaned, hooks };
}

// The settings with only the Office's hooks taken out: an entry left empty goes, and so does an event left empty.
export function withoutOfficeHooks(settings: Settings): Settings {
  if (!("hooks" in settings)) {
    return { ...settings };
  }
  const hooks: Record<string, HookEntry[]> = {};
  for (const [event, entries] of Object.entries(hooksOf(settings))) {
    if (!Array.isArray(entries)) {
      hooks[event] = entries;
      continue;
    }
    const kept = entries
      .map((entry) => (Array.isArray(entry?.hooks) ? { ...entry, hooks: entry.hooks.filter((hook) => !isOurs(hook)) } : entry))
      .filter((entry) => !Array.isArray(entry?.hooks) || entry.hooks.length > 0);
    if (kept.length > 0) {
      hooks[event] = kept;
    }
  }
  const { hooks: _old, ...rest } = settings;
  return Object.keys(hooks).length > 0 ? { ...rest, hooks } : rest;
}
