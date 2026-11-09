import * as vscode from "vscode";
import type { OfficePanelProvider } from "./officePanel";
import { PixelGuyLook, yourLook } from "./pixelGuy";

export const YOUR_LOOK_SETTING = "officeSim.yourLook";
const YOU_SETTING = "officeSim.you";
// Set once your guy has been made (or the maker was dismissed), so it opens by itself only the first time.
const MADE_KEY = "officeSim.madeYourGuy";

export function currentYourLook(): PixelGuyLook {
  return yourLook(vscode.workspace.getConfiguration().get<unknown>(YOUR_LOOK_SETTING));
}

// Your guy: Customize Your Guy (also a click on him), the maker on first run, and onDidChangeYourLook.
export class YourGuy implements vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<PixelGuyLook>();
  readonly onDidChangeYourLook = this.changeEmitter.event;
  private readonly listeners: vscode.Disposable[];
  private editing = false;

  constructor(private readonly office: OfficePanelProvider, private readonly state: vscode.Memento) {
    this.listeners = [
      vscode.workspace.onDidChangeConfiguration((change) => {
        if (change.affectsConfiguration(YOUR_LOOK_SETTING)) {
          this.changeEmitter.fire(currentYourLook());
        }
      }),
      office.onDidClickAgent((id) => {
        if (id === "you") {
          void this.customize();
        }
      }),
      office.onDidBecomeReady(() => void this.firstRun()),
    ];
  }

  // Opens the maker on your look and saves what you make.
  async customize(title = "Customize your guy"): Promise<void> {
    if (this.editing) {
      return;
    }
    this.editing = true;
    try {
      const look = await this.office.editLook(currentYourLook(), title);
      await this.state.update(MADE_KEY, true);
      if (look !== undefined) {
        await vscode.workspace.getConfiguration().update(YOUR_LOOK_SETTING, look, vscode.ConfigurationTarget.Global);
      }
    } finally {
      this.editing = false;
    }
  }

  dispose(): void {
    this.listeners.forEach((listener) => listener.dispose());
    this.changeEmitter.dispose();
  }

  // The first time the Office opens with you in it and no look of your own yet.
  private async firstRun(): Promise<void> {
    const configuration = vscode.workspace.getConfiguration();
    const setByYou = configuration.inspect?.(YOUR_LOOK_SETTING)?.globalValue !== undefined;
    if (this.state.get<boolean>(MADE_KEY, false) || setByYou || !configuration.get<boolean>(YOU_SETTING, true)) {
      return;
    }
    await this.customize("Make your guy");
  }
}
