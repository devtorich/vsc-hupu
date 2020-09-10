import * as vscode from "vscode";

export class List implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(ele: vscode.TreeItem): vscode.TreeItem {
    return ele;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    return [{label: '111'}];
  }
}
