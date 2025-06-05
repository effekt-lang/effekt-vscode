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
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'holesPanel'),
      ],
    };

    const cssUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'dist',
        'holesPanel/holes.css',
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
        'dist',
        'holesPanel/holes.css',
      ),
    );

    this.webviewView.webview.html = generateWebView(holes, cssUri);
  }

  public focusHoles(pos: vscode.Position) {
    // Find all holes that contain the cursor position (to support nested holes)
    const containing = this.holes.filter((hole) => {
      const start = hole.range.start;
      const end = hole.range.end;

      const afterStart =
        pos.line > start.line ||
        (pos.line === start.line && pos.character >= start.character);
      const beforeEnd =
        pos.line < end.line ||
        (pos.line === end.line && pos.character <= end.character);
      return afterStart && beforeEnd;
    });

    // If multiple holes contain the cursor (nested), pick the one whose start is closest to the cursor
    let found = undefined;
    if (containing.length > 0) {
      found = containing.reduce((closest, curr) => {
        const currDist =
          Math.abs(curr.range.start.line - pos.line) * 1000 +
          Math.abs(curr.range.start.character - pos.character);
        const closestDist =
          Math.abs(closest.range.start.line - pos.line) * 1000 +
          Math.abs(closest.range.start.character - pos.character);
        return currDist < closestDist ? curr : closest;
      });
    }

    if (found && this.webviewView) {
      this.webviewView.webview.postMessage({
        command: 'highlightHole',
        holeId: found.id,
      });
    }
  }
}
