import * as vscode from "vscode";
import { App } from "./app";

export function activate(context: vscode.ExtensionContext) {
  App.initInstance(context);
}

export function deactivate() {}
