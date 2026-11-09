import * as crypto from "crypto";
import * as fs from "fs";
import * as vscode from "vscode";
import { BUBBLE_LOOKS, BubbleLook, bubbleLook, CHATTER_LABELS, CHATTER_STYLES, chatterStyle, TALK_FREQUENCIES, TalkFrequency, talkFrequency } from "./officeChatter";
import { OFFICE_SCENES, officeSceneId } from "./officeLayout";
import type { AgentInput } from "./officeSim";
import { isPerformanceKind, PERFORMANCE_KINDS, PERFORMANCES, performanceFrequency, PerformanceKindId } from "./officePerformances";
import { visitorFrequency } from "./officeVisitors";
import { PixelGuyLook, yourLook } from "./pixelGuy";

export const OFFICE_PANEL_VIEW_ID = "officeSim.office";
const SCENE_SETTING = "officeSim.scene";
const YOU_SETTING = "officeSim.you";
const YOUR_LOOK_SETTING = "officeSim.yourLook";
const CRITTERS_SETTING = "officeSim.critters";
const FLIERS_SETTING = "officeSim.fliers";
const RACES_SETTING = "officeSim.races";
const DAY_NIGHT_SETTING = "officeSim.dayNight";
const VISITORS_SETTING = "officeSim.visitors";
const PERFORMANCES_SETTING = "officeSim.performances";
const CHATTER_SETTING = "officeSim.chatter";
const TALK_SETTING = "officeSim.talk";
const BUBBLE_LOOK_SETTING = "officeSim.bubbleLook";

export interface OfficePanelDeps {
  extensionUri: vscode.Uri;
}

// The Office view: your guy at his station, plus a worker for each agent another extension sends in through the API.
// The simulation runs in the webview (src/officeView); this side sends it the settings and agents whenever they
// change, and passes on what happens there (a guy clicked).
export class OfficePanelProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private readonly webviews = new Set<vscode.Webview>();
  private readonly views = new Set<vscode.WebviewView>();
  // A show asked for before the view was open, played once it says it's ready.
  private pendingShow: { kind: PerformanceKindId | "random" } | undefined;
  private readonly listeners: vscode.Disposable[];
  private agents: AgentInput[] = [];
  private focusedId: string | undefined;
  private readonly clickEmitter = new vscode.EventEmitter<string>();
  // A guy was clicked: his agent id.
  readonly onDidClickAgent = this.clickEmitter.event;

  constructor(private readonly deps: OfficePanelDeps) {
    this.listeners = [
      vscode.workspace.onDidChangeConfiguration((change) => {
        if ([SCENE_SETTING, YOU_SETTING, YOUR_LOOK_SETTING, CRITTERS_SETTING, FLIERS_SETTING, DAY_NIGHT_SETTING, VISITORS_SETTING, PERFORMANCES_SETTING, CHATTER_SETTING, TALK_SETTING, BUBBLE_LOOK_SETTING, RACES_SETTING].some((setting) => change.affectsConfiguration(setting))) {
          this.postAll();
        }
      }),
    ];
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    const webview = webviewView.webview;
    const distUri = vscode.Uri.joinPath(this.deps.extensionUri, "dist");
    webview.options = { enableScripts: true, localResourceRoots: [distUri] };
    const scriptUri = vscode.Uri.joinPath(distUri, "officeView.js");
    // Reinstalling the same version keeps the same URL, so the build time busts the webview's cached copy.
    webview.html = officeHtml(webview, webview.asWebviewUri(scriptUri).with({ query: `v=${scriptStamp(scriptUri)}` }));
    this.webviews.add(webview);
    this.views.add(webviewView);
    const messageListener = webview.onDidReceiveMessage((message: unknown) => this.handleMessage(webview, message));
    webviewView.onDidDispose(() => {
      this.webviews.delete(webview);
      this.views.delete(webviewView);
      messageListener.dispose();
    });
  }

  // Puts on a show in the Office now, opening the view first if it isn't showing.
  playShow(kind: PerformanceKindId | "random"): void {
    const message = { type: "performance", kind };
    if (![...this.views].some((view) => view.visible)) {
      this.pendingShow = this.webviews.size === 0 ? { kind } : undefined;
      void vscode.commands.executeCommand(`${OFFICE_PANEL_VIEW_ID}.focus`);
    }
    this.webviews.forEach((webview) => void webview.postMessage(message));
  }

  // The workers in the room besides you, and whose guy wears the crown.
  setAgents(agents: readonly AgentInput[], focusedId?: string): void {
    this.agents = [...agents];
    this.focusedId = focusedId;
    this.postAll();
  }

  dispose(): void {
    this.listeners.forEach((listener) => listener.dispose());
    this.clickEmitter.dispose();
  }

  private handleMessage(webview: vscode.Webview, message: unknown): void {
    if (typeof message !== "object" || message === null) {
      return;
    }
    const { type, sessionId } = message as { type?: unknown; sessionId?: unknown };
    if (type === "ready") {
      void webview.postMessage(this.message());
      if (this.pendingShow !== undefined) {
        void webview.postMessage({ type: "performance", kind: this.pendingShow.kind });
        this.pendingShow = undefined;
      }
    } else if (type === "open" && typeof sessionId === "string") {
      this.clickEmitter.fire(sessionId);
    }
  }

  private postAll(): void {
    if (this.webviews.size === 0) {
      return;
    }
    const message = this.message();
    this.webviews.forEach((webview) => void webview.postMessage(message));
  }

  private message(): {
    type: "office";
    scene: string;
    agents: AgentInput[];
    you: PixelGuyLook | null;
    critters: boolean;
    fliers: boolean;
    dayNight: boolean;
    visitors: string;
    performances: string;
    chatter: string;
    talk: string;
    bubbleLook: string;
    races: boolean;
    focusedId: string | null;
  } {
    const configuration = vscode.workspace.getConfiguration();
    const you = configuration.get<boolean>(YOU_SETTING, true) ? yourLook(configuration.get<unknown>(YOUR_LOOK_SETTING)) : null;
    return {
      type: "office",
      scene: currentScene(),
      agents: this.agents,
      you,
      critters: configuration.get<boolean>(CRITTERS_SETTING, true),
      fliers: configuration.get<boolean>(FLIERS_SETTING, true),
      dayNight: configuration.get<boolean>(DAY_NIGHT_SETTING, true),
      visitors: visitorFrequency(configuration.get<unknown>(VISITORS_SETTING)),
      performances: performanceFrequency(configuration.get<unknown>(PERFORMANCES_SETTING)),
      chatter: chatterStyle(configuration.get<unknown>(CHATTER_SETTING)),
      talk: talkFrequency(configuration.get<unknown>(TALK_SETTING)),
      bubbleLook: bubbleLook(configuration.get<unknown>(BUBBLE_LOOK_SETTING)),
      races: configuration.get<boolean>(RACES_SETTING, true),
      focusedId: this.focusedId ?? null,
    };
  }
}

function scriptStamp(scriptUri: vscode.Uri): string {
  try {
    return String(Math.floor(fs.statSync(scriptUri.fsPath).mtimeMs));
  } catch {
    return String(Date.now());
  }
}

function currentScene(): string {
  return officeSceneId(vscode.workspace.getConfiguration().get<string>(SCENE_SETTING));
}

export function registerOfficeCommands(office: OfficePanelProvider): vscode.Disposable[] {
  return [
    // Takes a show kind as an argument (for a keybinding), or asks.
    vscode.commands.registerCommand("officeSim.playShow", async (kind?: unknown) => {
      if (isPerformanceKind(kind) || kind === "random") {
        office.playShow(kind);
        return;
      }
      const picked = await vscode.window.showQuickPick(
        [
          { label: "$(question) Surprise Me", id: "random" as const },
          ...PERFORMANCE_KINDS.map((id) => ({ label: PERFORMANCES[id].label, description: SHOW_DESCRIPTIONS[id], id })),
        ],
        { placeHolder: "Which show?" },
      );
      if (picked !== undefined) {
        office.playShow(picked.id);
      }
    }),
    // Takes a style as an argument (for a keybinding), or asks for a style, a bubble look, or how often they talk.
    vscode.commands.registerCommand("officeSim.chatterStyle", async (style?: unknown) => {
      const configuration = vscode.workspace.getConfiguration();
      const given = CHATTER_STYLES.find((id) => id === style);
      if (given !== undefined) {
        await configuration.update(CHATTER_SETTING, given, vscode.ConfigurationTarget.Global);
        return;
      }
      const current = chatterStyle(configuration.get<unknown>(CHATTER_SETTING));
      const talk = talkFrequency(configuration.get<unknown>(TALK_SETTING));
      const look = bubbleLook(configuration.get<unknown>(BUBBLE_LOOK_SETTING));
      type Item = vscode.QuickPickItem & { style?: (typeof CHATTER_STYLES)[number]; talk?: TalkFrequency; look?: BubbleLook };
      const items: Item[] = [
        { label: "Style", kind: vscode.QuickPickItemKind.Separator },
        ...CHATTER_STYLES.map((id) => ({
          label: id === current ? `$(check) ${CHATTER_LABELS[id].label}` : CHATTER_LABELS[id].label,
          description: CHATTER_LABELS[id].description,
          style: id,
        })),
        { label: "Bubbles", kind: vscode.QuickPickItemKind.Separator },
        ...BUBBLE_LOOKS.map((id) => ({
          label: id === look ? `$(check) ${BUBBLE_LOOK_LABELS[id].label}` : BUBBLE_LOOK_LABELS[id].label,
          description: BUBBLE_LOOK_LABELS[id].description,
          look: id,
        })),
        { label: "How often they talk", kind: vscode.QuickPickItemKind.Separator },
        ...TALK_FREQUENCIES.map((id) => ({
          label: id === talk ? `$(check) ${TALK_LABELS[id].label}` : TALK_LABELS[id].label,
          description: TALK_LABELS[id].description,
          talk: id,
        })),
      ];
      const picked = await vscode.window.showQuickPick(items, { placeHolder: "How the Office shows what the guys say, and how often they talk" });
      if (picked?.style !== undefined) {
        await configuration.update(CHATTER_SETTING, picked.style, vscode.ConfigurationTarget.Global);
      } else if (picked?.talk !== undefined) {
        await configuration.update(TALK_SETTING, picked.talk, vscode.ConfigurationTarget.Global);
      } else if (picked?.look !== undefined) {
        await configuration.update(BUBBLE_LOOK_SETTING, picked.look, vscode.ConfigurationTarget.Global);
      }
    }),
    vscode.commands.registerCommand("officeSim.switchScene", async () => {
      const current = currentScene();
      const picked = await vscode.window.showQuickPick(
        OFFICE_SCENES.map((scene) => ({ label: scene.id === current ? `$(check) ${scene.label}` : scene.label, id: scene.id })),
        { placeHolder: "Office scene" },
      );
      if (picked !== undefined) {
        await vscode.workspace.getConfiguration().update(SCENE_SETTING, picked.id, vscode.ConfigurationTarget.Global);
      }
    }),
  ];
}

const SHOW_DESCRIPTIONS: Record<PerformanceKindId, string> = {
  guitarist: "a busker with an acoustic guitar",
  band: "singer, guitar, bass, and drums",
  lunch: "a trolley of hot lunch for everyone",
  snacks: "donuts, cookies, ice cream, popcorn",
  comedian: "stand-up under a spotlight",
  magician: "card tricks and a rabbit in a hat",
  dj: "a DJ, a mirror ball, and dancing",
};

const BUBBLE_LOOK_LABELS: Record<BubbleLook, { label: string; description: string }> = {
  solid: { label: "Bubbles: Solid", description: "opaque bubbles" },
  soft: { label: "Bubbles: Soft", description: "the room shows through a little, solid when you hover" },
  faint: { label: "Bubbles: Faint", description: "smaller text, the room shows through more, solid when you hover" },
};

const TALK_LABELS: Record<TalkFrequency, { label: string; description: string }> = {
  off: { label: "Talk: Off", description: "no chats or mutters on their own" },
  rare: { label: "Talk: Rare", description: "now and then" },
  normal: { label: "Talk: Normal", description: "the usual" },
  often: { label: "Talk: Often", description: "a chatty room" },
};

function officeHtml(webview: vscode.Webview, scriptUri: vscode.Uri): string {
  const nonce = crypto.randomBytes(16).toString("base64");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}' ${webview.cspSource};">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Office</title>
<style nonce="${nonce}">
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: var(--vscode-sideBar-background); }
  canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
  .readout {
    position: absolute;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 10px;
    line-height: 14px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    pointer-events: none;
    white-space: pre;
    text-shadow: 0 0 3px var(--vscode-sideBar-background);
  }
  .top { top: 4px; } .bottom { bottom: 4px; } .left { left: 8px; } .right { right: 8px; text-align: right; }
  .live { color: var(--vscode-textLink-foreground); }
  #tooltip { text-transform: none; letter-spacing: 0; max-width: calc(100% - 16px); overflow: hidden; text-overflow: ellipsis; }
</style>
</head>
<body>
<canvas id="office"></canvas>
<div class="readout top right"><span class="live" id="scene">office</span> // <span id="status">quiet</span></div>
<div class="readout bottom left" id="tooltip" hidden></div>
<script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
}
