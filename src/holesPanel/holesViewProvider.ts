import * as vscode from 'vscode';
import { generateWebView } from './holesWebView';
import { EffektHoleInfo } from './effektHoleInfo';

interface HoleState {
  expanded: boolean;
  pinned: boolean;
}

export class HolesViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'effekt.holesView';
  private webviewView?: vscode.WebviewView;
  private holes: EffektHoleInfo[] = [];
  private holeStates = new Map<string, HoleState>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  private getCssUri(): vscode.Uri | undefined {
    if (!this.webviewView) {
      return undefined;
    }
    return this.webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'dist/holesPanel/holes.css',
      ),
    );
  }

  private getJsUri(): vscode.Uri | undefined {
    if (!this.webviewView) {
      return undefined;
    }
    return this.webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'dist/holesPanel/holes.js',
      ),
    );
  }

  private getCodiconUri(): vscode.Uri | undefined {
    if (!this.webviewView) {
      return undefined;
    }
    return this.webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'dist/holesPanel/codicon.css',
      ),
    );
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'holesPanel'),
      ],
    };

    webviewView.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case 'saveHoleState':
            this.holeStates.set(message.holeId, message.state);
            break;
        }
      },
      undefined,
      this.context.subscriptions,
    );

    const cssUri = this.getCssUri();
    const jsUri = this.getJsUri();
    const codiconUri = this.getCodiconUri();

    if (cssUri && jsUri && codiconUri) {
      webviewView.webview.html = generateWebView([], cssUri, jsUri, codiconUri); // initially empty
    }

    this.webviewView = webviewView;

    // Restore hole states if any exist
    if (this.holeStates.size > 0) {
      this.webviewView.webview.postMessage({
        command: 'restoreHoleStates',
        states: Object.fromEntries(this.holeStates),
      });
    }
  }

  public updateHoles(holes: EffektHoleInfo[]) {
    this.holes = holes;
    if (!this.webviewView) {
      return;
    }
    const cssUri = this.getCssUri();
    const jsUri = this.getJsUri();
    const codiconUri = this.getCodiconUri();

    if (cssUri && jsUri && codiconUri) {
      this.webviewView.webview.html = generateWebView(
        holes,
        cssUri,
        jsUri,
        codiconUri,
      );

      // Restore hole states after updating
      if (this.holeStates.size > 0) {
        setTimeout(() => {
          this.webviewView?.webview.postMessage({
            command: 'restoreHoleStates',
            states: Object.fromEntries(this.holeStates),
          });
        }, 100);
      }
    }
  }

  public focusHoles(pos: vscode.Position) {
    // Find the innermost hole that contains the cursor position.
    let found: EffektHoleInfo | null = null;
    for (const hole of this.holes) {
      const holeStart = new vscode.Position(
        hole.range.start.line,
        hole.range.start.character,
      );
      const holeEnd = new vscode.Position(
        hole.range.end.line,
        hole.range.end.character,
      );
      const containing =
        pos.isAfterOrEqual(holeStart) && pos.isBeforeOrEqual(holeEnd);
      if (!containing) {
        continue;
      }
      if (!found) {
        found = hole;
        continue;
      }
      const foundStart = new vscode.Position(
        found.range.start.line,
        found.range.start.character,
      );
      if (holeStart.isAfter(foundStart)) {
        found = hole;
      }
    }

    if (found && this.webviewView) {
      this.webviewView.webview.postMessage({
        command: 'highlightHole',
        holeId: found.id,
      });
    }
  }
}
