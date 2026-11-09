import * as vscode from "vscode";
import { OFFICE_PANEL_VIEW_ID, OfficePanelProvider, registerOfficeCommands } from "./officePanel";

export function activate(context: vscode.ExtensionContext): void {
  const office = new OfficePanelProvider({ extensionUri: context.extensionUri });
  context.subscriptions.push(
    office,
    vscode.window.registerWebviewViewProvider(OFFICE_PANEL_VIEW_ID, office, { webviewOptions: { retainContextWhenHidden: true } }),
    ...registerOfficeCommands(office),
  );
}

export function deactivate(): void {}
