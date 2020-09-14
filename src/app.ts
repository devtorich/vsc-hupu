import * as vscode from "vscode";
import { join as pathJoin } from "path";
import { List, ReadedList, Article, Readed } from "./list";
import * as request from "request";
import * as xml2js from "xml2js";
import * as iconv from "iconv-lite";

export class App {
  private static _instance?: App;
  private newsUrl: string =
    "https://voice.hupu.com/generated/voice/news_nba.xml";

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
          this.NewsList.push(l);
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

    const panel = vscode.window.createWebviewPanel(
      "rss",
      article?.title ?? "虎扑新闻",
      vscode.ViewColumn.One,
      { retainContextWhenHidden: true, enableScripts: true }
    );

    panel.webview.html = this.renderContentPanel(article, panel);
    panel.webview.onDidReceiveMessage((e, src = "") => {
      if (e === "web") {
        vscode.env.openExternal(vscode.Uri.parse(article.link));
      }
    });
  }

  renderContentPanel(article: Article, panel: vscode.WebviewPanel) {
    const css =
      '<style type="text/css">body{font-size:1em;max-width:960px;margin:auto;}</style>';

    const web_path = vscode.Uri.file(
      pathJoin(this.context.extensionPath, "resources/browser.svg")
    );
    const web_src = panel.webview.asWebviewUri(web_path);

    let html =
      css +
      article.content.replace(/\<\img/g, '<img style="display: none;"') +
      `
    <style>
    .open-link {
        width: 2.2rem;
        height: 2.2rem;
        position: fixed;
        right: 0.5rem;
        z-index: 9999;
        filter: drop-shadow(0 0 0.2rem rgba(0,0,0,.5));
        transition-duration: 0.3s;
    }
    .open-link:hover {
        filter: drop-shadow(0 0 0.2rem rgba(0,0,0,.5))
                brightness(130%);
    }
    .open-link:active {
        filter: drop-shadow(0 0 0.2rem rgba(0,0,0,.5))
                brightness(80%);
    }
    </style>
    <script type="text/javascript">
    const vscode = acquireVsCodeApi();
    function web() {
        vscode.postMessage('web')
    }

    </script>
    <img src="${web_src}" title="Open with browser" onclick="web()" class="open-link" style="bottom:1rem;"/>
    `;
    return html;
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
                  title: l.title,
                  label: l.title,
                  link: l.link,
                  description: l.description,
                  content: l.description,
                  tooltip: l.title,
                })
              );

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
    // article.readed = true;

    if (!this.ReadedList.map((n) => n.id).includes(article.id)) {
      this.ReadedList.unshift(article);
    }

    this.ListProvider.refresh();
    this.ReadedProvider.refresh();
  }
}
