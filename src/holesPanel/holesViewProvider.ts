import * as vscode from 'vscode';
import { generateWebView } from './holesWebView';
import { EffektHoleInfo } from './effektHoleInfo';

export class HolesViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'effekt.holesView';
  private webviewView?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'src/holesPanel'),
      ],
    };

    const cssUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'src/holesPanel',
        'holes.css',
      ),
    );

    webviewView.webview.html = generateWebView([], cssUri); // initially empty
    this.webviewView = webviewView;
  }

  public updateHoles(holes: EffektHoleInfo[]) {
    if (!this.webviewView) {
      return;
    }

    const cssUri = this.webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'src/holesPanel',
        'holes.css',
      ),
    );

    this.webviewView.webview.html = generateWebView(holes, cssUri);
  }
}
