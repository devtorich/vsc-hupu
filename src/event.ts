import * as vscode from "vscode";
import * as request from "request";
import * as xml2js from "xml2js";
import * as iconv from "iconv-lite";
import { App } from "./app";
import Article from "./article";

export default class Event {
  private static newsUrl: string =
    "https://voice.hupu.com/generated/voice/news_nba.xml";

  public static requestList() {
    return new Promise((resolve) => {
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

  public static opneLink(article: Article) {
    if (article.link) {
      vscode.env.openExternal(vscode.Uri.parse(article.link));
    }
  }

  public static async changeAccountList(property: string, result: any[]) {
    const accounts = { ...App.config.get<any>("accounts") };
    const currentAccount = accounts[Object.keys(accounts)[0]];

    currentAccount[property] = [];
    currentAccount[property] = result;
    await App.config.update("accounts", accounts, true);
  }
}
