import * as vscode from "vscode";
import { App } from "./app";

export class List implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(ele: vscode.TreeItem): vscode.TreeItem {
    return ele;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    console.log(App.instance.NewsList);

    return App.instance.NewsList.map((l) => new Article(l));
  }
}

export class Article extends vscode.TreeItem {
  public title: string;
  public content: string;
  public link: string;
  public readed: boolean;

  constructor(public article: Article) {
    super("");

    this.command = {
      command: "hupu.read",
      title: "Read",
      arguments: [article],
    };
    this.id = article.id;
    this.title = article.title;
    this.label = article.label;
    this.link = article.link;
    this.iconPath = article.iconPath;
    this.tooltip = article.tooltip;
    this.content = article.content;
    this.readed = false;
  }
}
