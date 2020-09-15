import * as vscode from "vscode";

export default class Readed extends vscode.TreeItem {
  public title: string;
  public content: string;
  public link: string;
  public readed: boolean;
  public time: number;

  constructor(public article: Readed) {
    super(article.title);

    this.contextValue = "hupu-article";
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
    this.time = article.time;
    this.readed = true;
  }
}
