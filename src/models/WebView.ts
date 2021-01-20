/*
 * Author       : OBKoro1
 * Date         : 2019-12-26 13:49:02
 * LastEditors  : OBKoro1
 * LastEditTime : 2020-12-10 17:15:43
 * FilePath     : \autoCommit\src\models\WebView.ts
 * Description  : 创建webview
 * https://github.com/OBKoro1
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { showMessage, isProduction } from '../util/vscodeUtil';
import { WebviewMsg } from '../util/dataStatement';

// webview 设置
interface WebviewPanelOption {
  type: string; // webview type
  title: string; // webview title
  fileName: string; // webview 加载的资源
}

/**
   * 获取html模板内容
   * @param templatePath 模板文件路径
   * @param content 模板内容
   */
const getWebViewContent = (templatePath: string, content?: string): string => {
  const dirPath = path.dirname(templatePath);

  let res:string = content || fs.readFileSync(templatePath, 'utf-8');

  res = res.replace(
    /(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g,
    (m, $1, $2) => `${$1}${vscode.Uri.file(path.resolve(dirPath, $2))
      .with({ scheme: 'vscode-resource' })
      .toString()}"`,
  );

  return res;
};

class WebView {
  private currentPanel!: vscode.WebviewPanel;

  public readonly context: vscode.ExtensionContext;

  public MessageCallBack: Function; // webview消息回调

  public constructor(context: vscode.ExtensionContext, callBack: Function) {
    this.context = context;
    this.MessageCallBack = callBack;
  }

  public create(
    WebviewPanelOption: WebviewPanelOption,
    column: vscode.ViewColumn = vscode.ViewColumn.One,
  ) {
    // 获取资源地址
    const srcPath = isProduction() ? 'out' : 'src';
    this.currentPanel = vscode.window.createWebviewPanel(
      WebviewPanelOption.type,
      WebviewPanelOption.title,
      column,
      {
        // 只允许webview加载我们插件的`src/assets`目录下的资源
        localResourceRoots: [
          vscode.Uri.file(
            path.join(this.context.extensionPath, `${srcPath}/assets`),
          ),
        ],
        // 启用javascript
        enableScripts: true,
        retainContextWhenHidden: true, // 隐藏保存状态
      },
    );
    const htmlPath = path.join(
      this.context.extensionPath,
      `${srcPath}/views/${WebviewPanelOption.fileName}.html`,
    );
    this.currentPanel.webview.html = getWebViewContent(htmlPath);
    // 接收webview的消息回调
    this.currentPanel.webview.onDidReceiveMessage(
      this.handleMessage.bind(this),
      undefined,
      this.context.subscriptions,
    );
  }

  /**
   * 关闭webview
   */
  public close() {
    if (!this.currentPanel) return;
    this.currentPanel.dispose();
  }

  // webview消息回调
  public handleMessage(message: WebviewMsg) {
    const { command, data } = message;
    if (command !== 'msg') {
      this.MessageCallBack(message);
      return;
    }
    showMessage(data, command);
  }

  /**
   * 发送数据到webview
   * @param command
   * @param message
   */
  public postMessage(command: string, data: any) {
    if (!this.currentPanel) return;
    this.currentPanel.webview.postMessage({ command, data });
  }
}

export default WebView;
