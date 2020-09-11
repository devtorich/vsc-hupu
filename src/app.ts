import * as vscode from "vscode";
import { join as pathJoin } from "path";
import { List, Article } from "./list";
import * as request from "request";
import * as xml2js from "xml2js";
import * as iconv from "iconv-lite";

export class App {
  private static _instance?: App;
  private newsUrl: string =
    "https://voice.hupu.com/generated/voice/news_nba.xml";

  public NewsList: Article[] = [];

  private constructor(public readonly context: vscode.ExtensionContext) {}

  static get instance(): App {
    return App._instance!;
  }

  static async initInstance(context: vscode.ExtensionContext) {
    App._instance = new App(context);
    await App.instance.init(context);
  }

  async init(context: vscode.ExtensionContext) {
    await this.refreshNewsList();
    this.initCommands(context);
    // this.receiveMessages();
  }

  renderListProvider() {
    const ListProvider = new List();
    vscode.window.registerTreeDataProvider("News", ListProvider);
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

  async refreshNewsList() {
    request.get({ url: this.newsUrl, encoding: null }, (err, res, body) => {
      new xml2js.Parser({ explicitArray: false }).parseString(
        iconv.decode(body, "gb2312"),
        (err: any, resp: any) => {
          if (!err) {
            const list: Article[] = (resp?.rss?.channel?.item ?? []).map(
              (l: any, id: number) => ({
                id: l.link.replace(/\D/g, ""),
                title: l.title,
                label: l.title,
                link: l.link,
                iconPath: new vscode.ThemeIcon("circle-outline"),
                description: l.description,
                content: l.description,
                tooltip: l.title,
              })
            );

            this.NewsList = list;
            this.renderListProvider();
          } else {
            vscode.window.showErrorMessage(err);
          }
        }
      );
    });
  }

  readContent(content: Article) {
    if (!content.id) return vscode.window.showErrorMessage("没找到正文！");

    console.log(content);

    const panel = vscode.window.createWebviewPanel(
      "rss",
      content?.title ?? "虎扑新闻",
      vscode.ViewColumn.One,
      { retainContextWhenHidden: true, enableScripts: true }
    );

    content.readed = true;

    panel.webview.html = this.renderContent(content, panel);
    panel.webview.onDidReceiveMessage((e,src='') => {
        console.log(e);
        
      if (e === "web") {
        vscode.env.openExternal(vscode.Uri.parse(content.link));
      }else if (e === 'img'){
        vscode.window
      }


    });
  }

  renderContent(content: Article, panel: vscode.WebviewPanel) {
    const css =
      '<style type="text/css">body{font-size:1em;max-width:960px;margin:auto;}</style>';

    const web_path = vscode.Uri.file(
      pathJoin(this.context.extensionPath, "resources/browser.svg")
    );
    const web_src = panel.webview.asWebviewUri(web_path);

    let html =
      css +
      content.content.replace(
        /\<\img/g,
        '<a class="show"  onmouseenter="showImage(this)">显示图片</a><img style="display: none;"'
      ) +
      `
    <style>
    .float-btn {
        width: 2.2rem;
        height: 2.2rem;
        position: fixed;
        right: 0.5rem;
        z-index: 9999;
        filter: drop-shadow(0 0 0.2rem rgba(0,0,0,.5));
        transition-duration: 0.3s;
    }
    .float-btn:hover {
        filter: drop-shadow(0 0 0.2rem rgba(0,0,0,.5))
                brightness(130%);
    }
    .float-btn:active {
        filter: drop-shadow(0 0 0.2rem rgba(0,0,0,.5))
                brightness(80%);
    }
    </style>
    <script type="text/javascript">
    const vscode = acquireVsCodeApi();
    function web() {
        vscode.postMessage('web')
    }
    function showImage(a) {
        vscode.postMessage('img',a.nextElementSibling.src)
    }

    </script>
    <img src="${web_src}" title="Open link" onclick="web()" class="float-btn" style="bottom:1rem;"/>
    `;
    return html;
  }
}
