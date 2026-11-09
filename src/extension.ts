import * as vscode from "vscode";
import { OfficeDirector } from "./officeDirector";
import { isEventKind } from "./officeEvents";
import { OFFICE_PANEL_VIEW_ID, OfficePanelProvider, registerOfficeCommands } from "./officePanel";
import { SCENE_EVENT_KINDS } from "./sceneEventSchedule";

const EVENT_LABELS = { error: "ERROR", hack: "HACK", defense: "DEFENSE" } as const;

export function activate(context: vscode.ExtensionContext): void {
  const office = new OfficePanelProvider({ extensionUri: context.extensionUri });
  const director = new OfficeDirector(office);
  context.subscriptions.push(
    office,
    director,
    vscode.window.registerWebviewViewProvider(OFFICE_PANEL_VIEW_ID, office, { webviewOptions: { retainContextWhenHidden: true } }),
    ...registerOfficeCommands(office),
    // Takes a kind as an argument (for a keybinding), or asks.
    vscode.commands.registerCommand("officeSim.playEvent", async (kind?: unknown) => {
      const picked = isEventKind(kind)
        ? kind
        : (await vscode.window.showQuickPick(SCENE_EVENT_KINDS.map((id) => ({ label: EVENT_LABELS[id], id })), { placeHolder: "Which scene event?" }))?.id;
      if (picked !== undefined) {
        director.playEvent(picked);
      }
    }),
  );
}

export function deactivate(): void {}
