// Pure: turns what a host sends through the API into what the webview takes, dropping anything that doesn't check out,
// since hosts are other extensions.

import type { AgentInput, YouStatus } from "./officeSim";
import { PixelGuyLook, pixelGuyLook, readLook } from "./pixelGuy";

export type HostAgentInput = AgentInput & { look?: PixelGuyLook };

const STATUSES = { busy: "working", idle: "idle", asleep: "asleep" } as const;

// The agents, deduplicated by id, and whose guy wears the crown (the first one highlighted).
export function agentsFromHost(value: unknown, races: boolean): { agents: HostAgentInput[]; focusedId: string | undefined } {
  const agents: HostAgentInput[] = [];
  const seen = new Set<string>();
  let focusedId: string | undefined;
  for (const entry of Array.isArray(value) ? value : []) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const { id, status, title, seed, look, highlighted } = entry as Record<string, unknown>;
    if (typeof id !== "string" || id === "" || id === "you" || seen.has(id) || !(typeof status === "string" && status in STATUSES)) {
      continue;
    }
    seen.add(id);
    const agentSeed = typeof seed === "string" && seed !== "" ? seed : id;
    agents.push({
      id,
      seed: agentSeed,
      status: STATUSES[status as keyof typeof STATUSES],
      title: typeof title === "string" ? title : "",
      ...(look !== undefined && look !== null ? { look: readLook(look, pixelGuyLook(agentSeed, races)) } : {}),
    });
    if (highlighted === true && focusedId === undefined) {
      focusedId = id;
    }
  }
  return { agents, focusedId };
}

export function youStatusFromHost(value: unknown): YouStatus {
  return value === "busy" || value === "idle" ? value : "auto";
}

// A line for say: trimmed and cut to fit a bubble, or undefined when there's nothing to say.
export function lineFromHost(text: unknown, seconds: unknown): { text: string; seconds: number } | undefined {
  if (typeof text !== "string" || text.trim() === "") {
    return undefined;
  }
  const time = typeof seconds === "number" && Number.isFinite(seconds) ? Math.min(20, Math.max(1, seconds)) : 3;
  return { text: text.trim().slice(0, 80), seconds: time };
}
