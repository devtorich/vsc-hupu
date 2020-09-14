import * as vscode from "vscode";
import { App } from "./app";

export class List implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(ele: vscode.TreeItem): vscode.TreeItem {
    return ele;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    return App.instance.NewsList.map((l) => new Article(l));
  }
}

export class ReadedList implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(ele: vscode.TreeItem): vscode.TreeItem {
    return ele;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    return App.instance.ReadedList.map((l) => new Readed(l));
  }
}

export class Article extends vscode.TreeItem {
  public title: string;
  public content: string;
  public link: string;
  public readed: boolean;

  constructor(public article: Article) {
    super(article.title);

    this.command = {
      command: "hupu.read",
      title: "Read",
      arguments: [article],
    };
    this.id = article.id;
    this.title = article.title;
    this.label = article.label;
    this.link = article.link;
    this.tooltip = article.tooltip;
    this.content = article.content;
    this.readed = App.instance.ReadedList.map((n) => n.id).includes(article.id);

    if (!this.readed) {
      this.iconPath = new vscode.ThemeIcon("circle-outline");
      // } else {
      //   this.iconPath = new vscode.ThemeIcon("");
    }
  }
}

export class Readed extends vscode.TreeItem {
  public title: string;
  public content: string;
  public link: string;
  public readed: boolean;

  constructor(public article: Readed) {
    super(article.title);

    this.command = {
      command: "hupu.read",
      title: "Read",
      arguments: [article, true],
    };

    this.id = article.id;
    this.title = article.title;
    this.label = article.label;
    this.link = article.link;
    this.tooltip = article.tooltip;
    this.content = article.content;
    this.readed = true;
  }
}
