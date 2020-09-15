import * as vscode from "vscode";
import { List, ReadedList } from "./list";
import Article from "./article";
import Readed from "./readed";
import * as request from "request";
import * as xml2js from "xml2js";
import * as iconv from "iconv-lite";
import { renderContentPanel } from "./utils/helper";

export class App {
  private static _instance?: App;
  private newsUrl: string =
    "https://voice.hupu.com/generated/voice/news_nba.xml";

  private panel?: vscode.WebviewPanel;

  public NewsList: Article[] = [];
  public ReadedList: Readed[] = [];
  public ListProvider = new List();
  public ReadedProvider = new ReadedList();

  private constructor(public readonly context: vscode.ExtensionContext) {}

  static get instance(): App {
    return App._instance!;
  }

  static async initInstance(context: vscode.ExtensionContext) {
    App._instance = new App(context);
    await App.instance.init(context);
  }

  init(context: vscode.ExtensionContext) {
    this.refreshNewsList();
    this.initCommands(context);

    this.renderListProvider();
  }

  renderListProvider() {
    vscode.window.registerTreeDataProvider("News", this.ListProvider);
    vscode.window.registerTreeDataProvider("Readed", this.ReadedProvider);
  }

  initCommands(context: vscode.ExtensionContext) {
    const commands: [string, (...args: any[]) => any][] = [
      ["hupu.refresh", this.refreshNewsList.bind(this)],
      ["hupu.read", this.readContent.bind(this)],
      ["hupu.open-link", this.opneLink.bind(this)],
    ];

    for (const [cmd, handler] of commands) {
      context.subscriptions.push(vscode.commands.registerCommand(cmd, handler));
    }
  }

  refreshNewsList() {
    this.requestList().then((list: any) => {
      list.forEach((l: Article) => {
        const id = l.link.replace(/\D/g, "");

        if (
          !this.NewsList.map((n) => n.id).includes(id) &&
          !this.ReadedList.map((n) => n.id).includes(id)
        ) {
          this.NewsList.unshift(l);
        }
      });

      this.ListProvider.refresh();
      this.ReadedProvider.refresh();
    });
  }

  readContent(article: Article, isHistory: boolean) {
    if (!article.id) return vscode.window.showErrorMessage("没找到正文！");

    if (!isHistory) {
      this.markArticleReadAndAddReaded(article);
    }

    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        "news",
        article?.title ?? "虎扑新闻",
        vscode.ViewColumn.One,
        { retainContextWhenHidden: true, enableScripts: true }
      );
    }

    this.panel.title = article?.title ?? "虎扑新闻";
    this.panel.webview.html = renderContentPanel(
      this.context,
      article,
      this.panel
    );
    this.panel.webview.onDidReceiveMessage((e, src = "") => {
      if (e === "web") {
        vscode.env.openExternal(vscode.Uri.parse(article.link));
      }
    });
  }

  opneLink(article: Article) {
    if (article.link) {
      vscode.env.openExternal(vscode.Uri.parse(article.link));
    }
  }

  requestList() {
    return new Promise((resolve, reject) => {
      request.get({ url: this.newsUrl, encoding: null }, (err, res, body) => {
        new xml2js.Parser({ explicitArray: false }).parseString(
          iconv.decode(body, "gb2312"),
          (err: any, resp: any) => {
            if (!err) {
              const list: Article[] = (resp?.rss?.channel?.item ?? []).map(
                (l: any) => ({
                  id: l.link.replace(/\D/g, ""),
                  title: l.title || "虎扑新闻",
                  label: l.title || "虎扑新闻",
                  link: l.link,
                  description: l.description,
                  content: l.description,
                  tooltip: l.title,
                  time: l.pubDate ? new Date(l.pubDate).getTime() : Date.now(),
                })
              );

              list.sort((a, b) => a.time - b.time);

              resolve(list);
            } else {
              vscode.window.showErrorMessage(err);
            }
          }
        );
      });
    });
  }

  markArticleReadAndAddReaded(article: Article) {
    if (!this.ReadedList.map((n) => n.id).includes(article.id)) {
      this.ReadedList.unshift(article);
    }

    this.ListProvider.refresh();
    this.ReadedProvider.refresh();
  }
}
