import * as vscode from "vscode";
import { join as pathJoin } from "path";
import Article from "../article";

export const renderContentPanel = (
  context: vscode.ExtensionContext,
  article: Article,
  panel: vscode.WebviewPanel
) => {
  const css =
    '<style type="text/css">body{font-size:1em;max-width:960px;margin:auto;}</style>';

  const web_path = vscode.Uri.file(
    pathJoin(context.extensionPath, "resources/browser.svg")
  );
  const web_src = panel.webview.asWebviewUri(web_path);

  let html =
    css +
    article.content.replace(
      /<img[^>]+src=['"]([^'"]+)['"][ />]+/g,
      '<a class="preview-image" data-link="$1" title="$1">鼠标移入查看图片</a>'
    ) +
    '<img id="thumbnail"/>' +
    `
  <style>
  .open-link {
      width: 2.2rem;
      height: 2.2rem;
      position: fixed;
      right: 0.5rem;
      bottom: 1rem;
      z-index: 9999;
      filter: drop-shadow(0 0 0.2rem rgba(0,0,0,.5));
      transition-duration: 0.3s;
      cursor: pointer;
  }
  .open-link:hover {
      filter: drop-shadow(0 0 0.2rem rgba(0,0,0,.5))
              brightness(130%);
  }
  .open-link:active {
      filter: drop-shadow(0 0 0.2rem rgba(0,0,0,.5))
              brightness(80%);
  }
  #thumbnail {
      position: fixed;
      right: 0;
      bottom: 0;
      max-width: 300px;
      opacity: 1;
  }
  </style>
  <script type="text/javascript">
  const vscode = acquireVsCodeApi();
  const previews = document.getElementsByClassName("preview-image");
  const thumbnail = document.querySelector("#thumbnail");

  function web() {
      vscode.postMessage('web')
  }

  for (const i in previews) {
    previews[i].addEventListener("mouseenter",e => {
        thumbnail.src = e.target.dataset.link;
        thumbnail.style.opacity = 1;
    })
    previews[i].addEventListener("mouseleave",e => {
        thumbnail.style.opacity = 0;
    })
  }

  </script>
  <img src="${web_src}" title="Open with browser" onclick="web()" class="open-link" style="bottom:1rem;"/>
  `;

  return html;
};

export const uid = () => {
  return Math.random().toString(32).slice(2);
};
