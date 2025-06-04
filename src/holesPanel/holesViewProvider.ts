import * as vscode from 'vscode';
import { generateWebView } from './holesWebView';
import { EffektHoleInfo } from './effektHoleInfo';

export class HolesViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'effekt.holesView';
  private webviewView?: vscode.WebviewView;
  private holes: EffektHoleInfo[] = [];

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
    this.holes = holes;
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

  public focusHoles(pos: vscode.Position): string | undefined {
    const found = this.holes.find((hole) => {
      const start = hole.range.start;
      const end = hole.range.end;
      // Compare line and character
      const afterStart =
        pos.line > start.line ||
        (pos.line === start.line && pos.character >= start.character);
      const beforeEnd =
        pos.line < end.line ||
        (pos.line === end.line && pos.character <= end.character);
      return afterStart && beforeEnd;
    });

    if (found && this.webviewView) {
      this.webviewView.webview.postMessage({
        command: 'highlightHole',
        holeId: found.id,
      });
      return found.id;
    }
    return undefined;
  }
}
