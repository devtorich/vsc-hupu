import * as vscode from "vscode";
import Event from "./event";
import { List, ReadedList, AccountsList } from "./list";
import Article from "./article";
import Readed from "./readed";
import Account from "./account";
import { renderContentPanel, uid } from "./utils/helper";

export class App {
  private static _instance?: App;

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
    this.getLocalList();
    this.initCommands(context);

    this.renderListProvider();
  }

  getLocalList() {
    const accounts = App.config.get<any>("accounts");
    const currentAccount = accounts[Object.keys(accounts)[0]];

    if (currentAccount) {
      this.NewsList = currentAccount.articles;
      this.ReadedList = currentAccount.readeds;
    }
  }

  initCommands(context: vscode.ExtensionContext) {
    const commands: [string, (...args: any[]) => any][] = [
      ["hupu.refresh", this.refreshNewsList.bind(this)],
      ["hupu.read", this.readContent.bind(this)],
      ["hupu.open-link", Event.opneLink.bind(this)],
      ["hupu.add-account", this.createNewAccount.bind(this)],
      ["hupu.delete-account", this.deleteAccount.bind(this)],
    ];

    for (const [cmd, handler] of commands) {
      context.subscriptions.push(vscode.commands.registerCommand(cmd, handler));
    }
  }

  renderListProvider() {
    vscode.window.registerTreeDataProvider("Accounts", this.AccountsProvider);
    vscode.window.registerTreeDataProvider("News", this.ListProvider);
    vscode.window.registerTreeDataProvider("Readed", this.ReadedProvider);
  }

  async refreshNewsList() {
    const accounts = App.config.get<any>("accounts");
    const currentAccount = accounts[Object.keys(accounts)[0]];

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

      currentAccount.articles = [];
      currentAccount.articles = this.NewsList;

      (async () => {
        await App.config.update("accounts", accounts, true);
        this.AccountsProvider.refresh();
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

  async markArticleReadAndAddReaded(article: Article) {
    // const accounts = { ...App.config.accounts };
    // const currentAccount: Account = accounts[Object.keys(accounts)[0]];

    if (!this.ReadedList.map((n) => n.id).includes(article.id)) {
      this.ReadedList.unshift(article);
      // currentAccount.readeds.unshift(article);
    }

    this.ListProvider.refresh();
    this.ReadedProvider.refresh();

    // currentAccount.readeds = [];
    // currentAccount.readeds = this.ReadedList;

    // await App.config.update("accounts.readeds", accounts.readeds, true);
    // this.AccountsProvider.refresh();
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

      await this.createLocalAccount(name || "JR");
    }
  }

  async createLocalAccount(name: string) {
    const accounts = App.config.get<any>("accounts");

    accounts[uid()] = {
      name,
      type: "local",
      articles: [],
      readeds: [],
    };

    await App.config.update("accounts", accounts, true);
    this.AccountsProvider.refresh();

    this.refreshNewsList();
  }

  async deleteAccount(account: Account) {
    const accounts = { ...App.config.get<any>("accounts") };

    delete accounts[account.key];

    await App.config.update("accounts", accounts, true);
    this.AccountsProvider.refresh();
  }
}
