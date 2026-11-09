import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { agentsFromHost } from "./apiAgents";
import { applyClaudeEvent, ClaudeSession, forgetStale, inWorkspace, mainGuyFor, parseHookLine, workersFor } from "./claudeActivity";
import { HOOK_EVENTS, hasOfficeHooks, withOfficeHooks, withoutOfficeHooks } from "./claudeHooks";
import type { OfficePanelProvider } from "./officePanel";

const WORKERS_SETTING = "officeSim.claude.workers";
const CONNECTED_CONTEXT = "officeSim.claudeConnected";
const POLL_MS = 1500;
// The events file is cleared once it's read past this.
const MAX_EVENTS_BYTES = 2 * 1024 * 1024;

const claudeHome = () => path.join(os.homedir(), ".claude");
const settingsPath = () => path.join(claudeHome(), "settings.json");
const eventsPath = () => path.join(claudeHome(), "office-simulation", "events.jsonl");

// Opt-in: Connect Claude Code adds the Office's hooks to ~/.claude/settings.json, and then Claude's activity in this
// window's folders shows in the Office. Your guy works while Claude does, and with officeSim.claude.workers each
// session gets a worker of its own. A host that drives your guy or sends agents through the API takes over from it.
export class ClaudeBridge implements vscode.Disposable {
  private readonly sessions = new Map<string, ClaudeSession>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private offset = 0;
  private lastMainGuy: string | undefined;
  private lastAgents: string | undefined;
  private readonly listeners: vscode.Disposable[];

  constructor(private readonly office: OfficePanelProvider) {
    this.listeners = [
      vscode.workspace.onDidChangeConfiguration((change) => {
        if (change.affectsConfiguration(WORKERS_SETTING)) {
          this.show();
        }
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.show()),
    ];
    if (hasOfficeHooks(readSettings() ?? {})) {
      this.start();
    }
  }

  async connect(): Promise<void> {
    const settings = readSettings();
    if (settings === undefined) {
      void vscode.window.showErrorMessage(`Couldn't read ${settingsPath()}: fix its JSON, then connect again.`);
      return;
    }
    if (hasOfficeHooks(settings)) {
      this.start();
      void vscode.window.showInformationMessage("Claude Code is already connected to the Office.");
      return;
    }
    const choice = await vscode.window.showInformationMessage(
      "Connect Claude Code to the Office?",
      {
        modal: true,
        detail: `This adds ${HOOK_EVENTS.length} hooks (${HOOK_EVENTS.join(", ")}) to ${settingsPath()}. Each one appends Claude's hook input to ${eventsPath()} and prints nothing, so the agent never sees it. Disconnect Claude Code takes them out again.`,
      },
      "Connect",
    );
    if (choice !== "Connect") {
      return;
    }
    fs.mkdirSync(path.dirname(eventsPath()), { recursive: true });
    const backup = `${settingsPath()}.office-simulation.bak`;
    if (fs.existsSync(settingsPath()) && !fs.existsSync(backup)) {
      fs.copyFileSync(settingsPath(), backup);
    }
    writeSettings(withOfficeHooks(settings));
    this.start();
    void vscode.window.showInformationMessage("Claude Code is connected. Sessions you start or prompt from now on show in the Office.");
  }

  async disconnect(): Promise<void> {
    const settings = readSettings();
    if (settings === undefined) {
      void vscode.window.showErrorMessage(`Couldn't read ${settingsPath()}: fix its JSON, then disconnect again.`);
      return;
    }
    if (hasOfficeHooks(settings) || JSON.stringify(withoutOfficeHooks(settings)) !== JSON.stringify(settings)) {
      writeSettings(withoutOfficeHooks(settings));
    }
    this.stop();
    void vscode.window.showInformationMessage("Claude Code is disconnected from the Office, and its hooks are out of your settings.");
  }

  dispose(): void {
    clearInterval(this.timer);
    this.listeners.forEach((listener) => listener.dispose());
  }

  private start(): void {
    if (this.timer !== undefined) {
      return;
    }
    // Only what happens from now on: an old line doesn't make anyone busy.
    this.offset = fileSize(eventsPath());
    this.timer = setInterval(() => this.poll(), POLL_MS);
    void vscode.commands.executeCommand("setContext", CONNECTED_CONTEXT, true);
  }

  private stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.sessions.clear();
    this.show();
    void vscode.commands.executeCommand("setContext", CONNECTED_CONTEXT, false);
  }

  private poll(): void {
    const file = eventsPath();
    const size = fileSize(file);
    if (size < this.offset) {
      this.offset = 0;
    }
    if (size > this.offset) {
      let text = "";
      try {
        const handle = fs.openSync(file, "r");
        try {
          const buffer = Buffer.alloc(size - this.offset);
          fs.readSync(handle, buffer, 0, buffer.length, this.offset);
          text = buffer.toString("utf8");
        } finally {
          fs.closeSync(handle);
        }
      } catch {
        return;
      }
      // Only whole lines; a line still being written waits for the next poll.
      const end = text.lastIndexOf("\n");
      if (end >= 0) {
        this.offset += Buffer.byteLength(text.slice(0, end + 1), "utf8");
        this.read(text.slice(0, end));
      }
      if (this.offset === size && size > MAX_EVENTS_BYTES) {
        try {
          fs.truncateSync(file, 0);
          this.offset = 0;
        } catch {
          // Next time.
        }
      }
    }
    forgetStale(this.sessions, Date.now());
    this.show();
  }

  private read(text: string): void {
    const folders = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
    const workers = vscode.workspace.getConfiguration().get<boolean>(WORKERS_SETTING, true);
    for (const line of text.split("\n")) {
      const event = parseHookLine(line);
      if (event === undefined || !inWorkspace(event.cwd, folders)) {
        continue;
      }
      const said = applyClaudeEvent(this.sessions, event, Date.now());
      if (said !== undefined) {
        // Shown after this read's state, so a new worker is in the room to say it.
        const id = workers && !this.office.hostOwnsAgents ? `claude-${event.sessionId}` : "you";
        setTimeout(() => this.office.broadcast({ type: "say", id, text: said, seconds: 3 }), 300);
      }
    }
  }

  // Sends what changed: your guy's status, and the workers.
  private show(): void {
    const sessions = [...this.sessions.values()];
    if (!this.office.hostOwnsMainGuy) {
      const status = mainGuyFor(sessions);
      if (status !== this.lastMainGuy) {
        this.lastMainGuy = status;
        this.office.setYouStatus(status);
      }
    }
    if (!this.office.hostOwnsAgents) {
      const workers = vscode.workspace.getConfiguration().get<boolean>(WORKERS_SETTING, true) ? workersFor(sessions) : [];
      const key = JSON.stringify(workers);
      if (key !== this.lastAgents) {
        this.lastAgents = key;
        this.office.setAgents(agentsFromHost(workers, true).agents);
      }
    }
  }
}

function readSettings(): Record<string, unknown> | undefined {
  try {
    const text = fs.readFileSync(settingsPath(), "utf8");
    const value = text.trim() === "" ? {} : (JSON.parse(text) as unknown);
    return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? {} : undefined;
  }
}

function writeSettings(settings: Record<string, unknown>): void {
  fs.mkdirSync(claudeHome(), { recursive: true });
  fs.writeFileSync(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`);
}

function fileSize(file: string): number {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}
