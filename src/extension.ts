import * as vscode from "vscode";
import { List } from "./list";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "hupu-rss" is now active!');

  const ListProvider = new List();
  vscode.window.registerTreeDataProvider("News", ListProvider);

  const commands: [string, (...args: any[]) => any][] = [
    ["hupu-rss.refresh", () => console.log("hupu-rss.refresh")],
  ];

  for (const [cmd, handler] of commands) {
    context.subscriptions.push(vscode.commands.registerCommand(cmd, handler));
  }
}

export function deactivate() {}
