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
