import * as vscode from "vscode";
import { createOfficeApi } from "./api";
import { ClaudeBridge } from "./claudeBridge";
import { OfficeDirector } from "./officeDirector";
import { isEventKind } from "./officeEvents";
import { OFFICE_PANEL_VIEW_ID, OfficePanelProvider, registerOfficeCommands } from "./officePanel";
import type { OfficeSimulationApi } from "./officeSimulationApi";
import { TRIGGER_GROUPS, TRIGGER_ITEMS, parseTrigger } from "./officeTriggers";
import { SCENE_EVENT_KINDS } from "./sceneEventSchedule";
import { YourGuy } from "./yourGuy";

const EVENT_LABELS = { error: "ERROR", hack: "HACK", defense: "DEFENSE" } as const;

export function activate(context: vscode.ExtensionContext): OfficeSimulationApi {
  const office = new OfficePanelProvider({ extensionUri: context.extensionUri });
  const director = new OfficeDirector(office);
  const yourGuy = new YourGuy(office, context.globalState);
  const claude = new ClaudeBridge(office);
  context.subscriptions.push(
    office,
    director,
    yourGuy,
    claude,
    vscode.commands.registerCommand("officeSim.connectClaude", () => claude.connect()),
    vscode.commands.registerCommand("officeSim.disconnectClaude", () => claude.disconnect()),
    vscode.commands.registerCommand("officeSim.customizeYou", () => yourGuy.customize()),
    vscode.window.registerWebviewViewProvider(OFFICE_PANEL_VIEW_ID, office, { webviewOptions: { retainContextWhenHidden: true } }),
    ...registerOfficeCommands(office),
    // Takes a kind as an argument (for a keybinding), or asks.
    vscode.commands.registerCommand("officeSim.playEvent", async (kind?: unknown) => {
      const picked = isEventKind(kind)
        ? kind
        : (await vscode.window.showQuickPick(SCENE_EVENT_KINDS.map((id) => ({ label: EVENT_LABELS[id], id })), { placeHolder: "Which scene event?" }))?.id;
      if (picked !== undefined) {
        director.requestEvent(picked);
      }
    }),
    // Everything the Office can start, in one list. Takes a trigger id ("invasion:zombies", "random") for a
    // keybinding, or asks.
    vscode.commands.registerCommand("officeSim.triggerEvent", async (id?: unknown) => {
      const trigger = parseTrigger(id) ?? parseTrigger((await pickTrigger())?.id);
      if (trigger === undefined) {
        return;
      }
      switch (trigger.kind) {
        case "scene":
          director.requestEvent(trigger.event);
          return;
        case "invasion":
          office.playInvasion(trigger.invasion);
          return;
        case "show":
          office.playShow(trigger.show);
          return;
        case "visitor":
          office.broadcast({ type: "visitor", kind: trigger.department });
          return;
      }
    }),
  );
  return createOfficeApi(office, director, yourGuy);
}

// The Trigger Event list: Surprise Me, then each group under its own heading.
async function pickTrigger(): Promise<{ id: string } | undefined> {
  type Item = vscode.QuickPickItem & { id?: string };
  const items: Item[] = [{ label: "$(question) Surprise Me", description: "any of them", id: "random" }];
  for (const group of TRIGGER_GROUPS) {
    items.push({ label: group, kind: vscode.QuickPickItemKind.Separator });
    items.push(...TRIGGER_ITEMS.filter((item) => item.group === group).map((item) => ({ label: item.label, description: item.description, id: item.id })));
  }
  const picked = await vscode.window.showQuickPick(items, { placeHolder: "Trigger which event?", matchOnDescription: true });
  return picked?.id === undefined ? undefined : { id: picked.id };
}

export function deactivate(): void {}
