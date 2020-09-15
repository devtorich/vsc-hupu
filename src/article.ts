import * as vscode from "vscode";
import { App } from "./app";

export default class Article extends vscode.TreeItem {
  public title: string;
  public content: string;
  public link: string;
  public readed: boolean;
  public time: number;

  constructor(public article: Article) {
    super(article.title);

    this.contextValue = "hupu-article";

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
    this.time = article.time;
    this.readed = App.instance.ReadedList.map((n) => n.id).includes(article.id);

    if (!this.readed) {
      this.iconPath = new vscode.ThemeIcon("circle-outline");
    }
  }
}
