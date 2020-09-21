import * as vscode from "vscode";
import Event from "./event";
import { List, ReadedList } from "./list";
import Article from "./article";
import Readed from "./readed";
import { renderContentPanel } from "./utils/helper";

export class App {
  private static _instance?: App;

  private panel?: vscode.WebviewPanel;

  public NewsList: Article[] = [];
  public ReadedList: Readed[] = [];
  public ListProvider = new List();
  public ReadedProvider = new ReadedList();

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
    this.initCommands(context);

    // this.rmLocals();

    this.getLocals().then((res: any) => {
      this.renderListProvider();

      if (!!res.fetch) {
        this.refreshNewsList();
      }
    });
  }

  initCommands(context: vscode.ExtensionContext) {
    const commands: [string, (...args: any[]) => any][] = [
      ["hupu.refresh", this.refreshNewsList.bind(this)],
      ["hupu.read", this.readContent.bind(this)],
      ["hupu.open-link", Event.opneLink.bind(this)],
    ];

    for (const [cmd, handler] of commands) {
      context.subscriptions.push(vscode.commands.registerCommand(cmd, handler));
    }
  }

  async rmLocals() {
    const locallist = { ...App.config.get<any>("locallist") };
    const localreaded = { ...App.config.get<any>("localreaded") };

    Object.keys(locallist).forEach((key) => {
      delete locallist[key];
    });

    Object.keys(localreaded).forEach((key) => {
      delete localreaded[key];
    });

    await App.config.update("locallist", locallist, true);
    await App.config.update("localreaded", localreaded, true);
  }

  getLocals() {
    return new Promise((resolve) => {
      const locallist = App.config.get<any>("locallist");
      const localreaded = App.config.get<any>("localreaded");

      if (!Object.keys(locallist).length) {
        this.createLocals("locallist");
      } else {
        this.NewsList = locallist.list;
      }

      if (!Object.keys(localreaded).length) {
        this.createLocals("localreaded");
      } else {
        this.ReadedList = localreaded.list;
      }

      resolve({ fetch: !Object.keys(locallist).length });
    });
  }

  renderListProvider() {
    vscode.window.registerTreeDataProvider("News", this.ListProvider);
    vscode.window.registerTreeDataProvider("Readed", this.ReadedProvider);
  }

  async refreshNewsList() {
    const locallist = App.config.get<any>("locallist");

    Event.requestList().then((list: any) => {
      list.forEach((l: Article) => {
        const id = l.link.replace(/\D/g, "");
        if (
          !this.NewsList.map((n) => n.id).includes(id) &&
          !this.ReadedList.map((n) => n.id).includes(id)
        ) {
          this.NewsList.unshift(l);
        }
      });

      locallist.list = [];
      locallist.list = this.NewsList;
      (async () => {
        await App.config.update("locallist", locallist, true);
      })();

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

    // when panel closed by user, set it undefined
    this.panel.onDidDispose((e) => {
      this.panel = undefined;
    });
  }

  markArticleReadAndAddReaded(article: Article) {
    const localreaded = App.config.get<any>("localreaded");

    if (!this.ReadedList.map((n) => n.id).includes(article.id)) {
      this.ReadedList.unshift(article);

      if (!localreaded.list.map((l: Article) => l.id).includes(article.id)) {
        localreaded.list.unshift(article);
      }
    }

    this.ListProvider.refresh();
    this.ReadedProvider.refresh();

    (async () => {
      await App.config.update("localreaded", localreaded, true);
    })();
  }

  async createLocals(name: string) {
    const local = App.config.get<any>(name);

    local.type = "local";
    local.list = [];

    await App.config.update(name, local, true);
  }
}
