import * as vscode from "vscode";
import { createOfficeApi } from "./api";
import { OfficeDirector } from "./officeDirector";
import { isEventKind } from "./officeEvents";
import { OFFICE_PANEL_VIEW_ID, OfficePanelProvider, registerOfficeCommands } from "./officePanel";
import type { OfficeSimulationApi } from "./officeSimulationApi";
import { SCENE_EVENT_KINDS } from "./sceneEventSchedule";
import { YourGuy } from "./yourGuy";

const EVENT_LABELS = { error: "ERROR", hack: "HACK", defense: "DEFENSE" } as const;

export function activate(context: vscode.ExtensionContext): OfficeSimulationApi {
  const office = new OfficePanelProvider({ extensionUri: context.extensionUri });
  const director = new OfficeDirector(office);
  const yourGuy = new YourGuy(office, context.globalState);
  context.subscriptions.push(
    office,
    director,
    yourGuy,
    vscode.commands.registerCommand("officeSim.customizeYou", () => yourGuy.customize()),
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
  return createOfficeApi(office, director, yourGuy);
}

export function deactivate(): void {}
