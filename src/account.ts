import * as vscode from "vscode";
import Article from "./article";

export default class Account extends vscode.TreeItem {
  public name?: string;
  public key: string;
  public articles: Article[];

  constructor(key: string, public account: Account) {
    super("");

    this.contextValue = "hupu-account";

    this.id = key;
    this.key = key;
    this.articles = account.articles;
    this.label = `${account.name} (${account.articles.length})`;
    this.iconPath = new vscode.ThemeIcon("account");
  }
}
