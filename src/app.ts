import * as vscode from "vscode";
import * as request from "request";
import * as xml2js from "xml2js";
import * as iconv from "iconv-lite";
import { List, ReadedList, AccountsList } from "./list";
import Article from "./article";
import Readed from "./readed";
import Account from "./account";
import { renderContentPanel, uid } from "./utils/helper";

export class App {
  private static _instance?: App;
  private newsUrl: string =
    "https://voice.hupu.com/generated/voice/news_nba.xml";

  private panel?: vscode.WebviewPanel;

  public NewsList: Article[] = [];
  public ReadedList: Readed[] = [];
  public ListProvider = new List();
  public ReadedProvider = new ReadedList();
  public AccountsProvider = new AccountsList();

  private constructor(public readonly context: vscode.ExtensionContext) {}

  static get instance(): App {
    return App._instance!;
  }

  static get config() {
    return vscode.workspace.getConfiguration("hupu");
  }

  static async initInstance(context: vscode.ExtensionContext) {
    App._instance = new App(context);
    await App.instance.init(context);
  }

  init(context: vscode.ExtensionContext) {
    // this.refreshNewsList();
    this.initCommands(context);

    this.renderListProvider();
  }

  renderListProvider() {
    vscode.window.registerTreeDataProvider("Accounts", this.AccountsProvider);
    vscode.window.registerTreeDataProvider("News", this.ListProvider);
    vscode.window.registerTreeDataProvider("Readed", this.ReadedProvider);
  }

  initCommands(context: vscode.ExtensionContext) {
    const commands: [string, (...args: any[]) => any][] = [
      ["hupu.refresh", this.refreshNewsList.bind(this)],
      ["hupu.read", this.readContent.bind(this)],
      ["hupu.open-link", this.opneLink.bind(this)],
      ["hupu.add-account", this.createNewAccount.bind(this)],
      ["hupu.delete-account", this.deleteAccount.bind(this)],
    ];

    for (const [cmd, handler] of commands) {
      context.subscriptions.push(vscode.commands.registerCommand(cmd, handler));
    }
  }

  refreshNewsList() {
    const accounts = { ...App.config.get<any>("accounts") };

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

      Object.keys(accounts).forEach((key) => {
        accounts[key].articles = this.NewsList;
      });

      this.ListProvider.refresh();
      this.ReadedProvider.refresh();
      this.AccountsProvider.refresh(accounts);
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

    // when panel closed by user, set it undefined
    this.panel.onDidDispose((e) => {
      this.panel = undefined;
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

  async createNewAccount() {
    const accounts = App.config.get<any>("accounts");

    if (Object.keys(accounts).length > 0) {
      vscode.window.showInformationMessage(
        "已经有一个账户，可以先删除当前账户再新建"
      );
    } else {
      const name = await vscode.window.showInputBox({
        placeHolder: "JR",
        prompt: "填写本地账户名，只做展示",
      });

      await this.createLocalAccount(name);
    }
  }

  async createLocalAccount(name: string = "JR") {
    const accounts = App.config.get<any>("accounts");

    accounts[uid()] = {
      name,
      type: "local",
      articles: [],
    };
    this.AccountsProvider.refresh(accounts);
  }

  async deleteAccount(account: Account) {
    const accounts = { ...App.config.get<any>("accounts") };

    delete accounts[account.key];

    this.AccountsProvider.refresh(accounts);
  }
}
