import * as vscode from "vscode";
import { eventFrequency, eventGapMs, pickEventKind, tintGapMs } from "./officeEvents";
import type { OfficePanelProvider } from "./officePanel";
import { SceneEventKind, sceneEventMessage } from "./sceneEventSchedule";

export const EVENTS_SETTING = "officeSim.events";

// Plays scene events on the officeSim.events schedule and moves your second monitor's tint, until another extension
// takes either over through the API. Overseer does both, so its views and the Office play the same event at once.
export class OfficeDirector implements vscode.Disposable {
  private eventTimer: ReturnType<typeof setTimeout> | undefined;
  private tintTimer: ReturnType<typeof setTimeout> | undefined;
  private eventsTakenOver = false;
  private tintTakenOver = false;
  private tintIndex = 0;
  private readonly listeners: vscode.Disposable[];
  // Someone asked for an event in the Office (Trigger Event, Play Scene Event) while a host plays them: the host
  // plays it everywhere it shows events, so its views and the Office play it together.
  private readonly requestEmitter = new vscode.EventEmitter<SceneEventKind>();
  readonly onDidRequestEvent = this.requestEmitter.event;
  // Set once a host listens for requests; until then a request just plays here.
  hostTakesRequests = false;

  constructor(private readonly office: OfficePanelProvider) {
    this.scheduleEvent(true);
    this.scheduleTint();
    this.listeners = [
      vscode.workspace.onDidChangeConfiguration((change) => {
        if (change.affectsConfiguration(EVENTS_SETTING)) {
          this.scheduleEvent(false);
        }
      }),
      // A new view starts on the current tint, without the sweep.
      office.onDidBecomeReady((webview) => void webview.postMessage({ type: "tint", index: this.tintIndex, burst: false })),
    ];
  }

  // Plays an event now. `fromHost` means another extension is playing them, so the schedule stops for good.
  playEvent(kind: SceneEventKind, variant?: number, fromHost = false): void {
    if (fromHost) {
      this.eventsTakenOver = true;
      clearTimeout(this.eventTimer);
    }
    const message = sceneEventMessage(kind, Math.random);
    this.office.broadcast(variant === undefined ? message : { ...message, variant });
  }

  // Someone in the Office asked for this event: a host that plays them gets the request, otherwise it plays here.
  requestEvent(kind: SceneEventKind): void {
    if (this.eventsTakenOver && this.hostTakesRequests) {
      this.requestEmitter.fire(kind);
      return;
    }
    this.playEvent(kind);
  }

  // A host plays events and sets the tint from now on.
  takeOver(): void {
    this.eventsTakenOver = true;
    this.tintTakenOver = true;
    clearTimeout(this.eventTimer);
    clearTimeout(this.tintTimer);
  }

  setTint(index: number, burst = true, fromHost = false): void {
    if (fromHost) {
      this.tintTakenOver = true;
      clearTimeout(this.tintTimer);
    }
    this.tintIndex = index;
    this.office.broadcast({ type: "tint", index, burst });
  }

  dispose(): void {
    clearTimeout(this.eventTimer);
    clearTimeout(this.tintTimer);
    this.requestEmitter.dispose();
    this.listeners.forEach((listener) => listener.dispose());
  }

  private scheduleEvent(first: boolean): void {
    clearTimeout(this.eventTimer);
    if (this.eventsTakenOver) {
      return;
    }
    const gap = eventGapMs(eventFrequency(vscode.workspace.getConfiguration().get<unknown>(EVENTS_SETTING)), Math.random, first);
    if (gap !== undefined) {
      this.eventTimer = setTimeout(() => {
        this.playEvent(pickEventKind(Math.random));
        this.scheduleEvent(false);
      }, gap);
    }
  }

  private scheduleTint(): void {
    if (this.tintTakenOver) {
      return;
    }
    this.tintTimer = setTimeout(() => {
      this.setTint(this.tintIndex + 1);
      this.scheduleTint();
    }, tintGapMs(Math.random));
  }
}
