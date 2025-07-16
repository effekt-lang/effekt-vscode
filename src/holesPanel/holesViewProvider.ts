import * as vscode from 'vscode';
import { EffektHoleInfo } from './effektHoleInfo';

export interface MCPCompletionRequest {
  holeId: string;
  expectedType?: string;
  innerType?: string;
  scope: any;
  context: {
    file?: string;
    line?: number;
    column?: number;
  };
}

export interface MCPCompletionResponse {
  success: boolean;
  completion?: string;
  error?: string;
}

export class HolesViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'effekt.holesView';
  private webviewView?: vscode.WebviewView;
  private holes: EffektHoleInfo[] = [];
  private configListener?: vscode.Disposable;

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
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'holesPanel'),
      ],
    };

    const showHoles =
      vscode.workspace.getConfiguration('effekt').get<boolean>('showHoles') ||
      false;
    const cssUri = this.getCssUri()!;
    const jsUri = this.getJsUri()!;
    const codiconUri = this.getCodiconUri()!;

    webviewView.webview.html = webviewHtml(
      showHoles,
      cssUri,
      jsUri,
      codiconUri,
    );

    this.configListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('effekt.showHoles')) {
        const updated =
          vscode.workspace
            .getConfiguration('effekt')
            .get<boolean>('showHoles') || false;
        this.webviewView?.webview.postMessage({
          command: 'setShowHoles',
          show: updated,
        });
      }
    });

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === 'jumpToHole') {
        const hole = this.holes.find((h) => h.id === message.holeId);
        if (hole) {
          const start = new vscode.Position(
            hole.range.start.line,
            hole.range.start.character,
          );
          const end = new vscode.Position(
            hole.range.end.line,
            hole.range.end.character,
          );
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            editor.selection = new vscode.Selection(start, end);
            editor.revealRange(
              new vscode.Range(start, end),
              vscode.TextEditorRevealType.InCenter,
            );
          }
        }
      } else if (message.type === 'mcp-completion-request') {
        // Handle MCP completion request
        this.handleMCPCompletionRequest(message.payload);
      }
    });
  }

  private async handleMCPCompletionRequest(
    request: MCPCompletionRequest,
  ): Promise<void> {
    // TODO: When MCP server is ready, implement actual communication here
    // For now, just log the request for debugging
    console.log('MCP completion request received:', request);

    try {
      // TODO: Replace this with actual MCP server communication
      // const response = await mcpServerClient.getCompletion(request);

      // Simulate response for now
      const response: MCPCompletionResponse = {
        success: true,
        completion: `// MCP completion for hole ${request.holeId}\n// Expected type: ${request.expectedType || 'unknown'}`,
      };

      // Send response back to webview
      this.webviewView?.webview.postMessage({
        type: 'mcp-completion-response',
        payload: response,
      });
    } catch (error) {
      console.error('Error handling MCP completion request:', error);

      // Send error response back to webview
      this.webviewView?.webview.postMessage({
        type: 'mcp-completion-response',
        payload: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  public updateHoles(holes: EffektHoleInfo[]) {
    this.holes = holes;
    this.webviewView?.webview.postMessage({
      command: 'updateHoles',
      holes: holes,
    });
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

    if (found) {
      this.webviewView?.webview.postMessage({
        command: 'highlightHole',
        holeId: found.id,
      });
    }
  }

  dispose() {
    this.configListener?.dispose();
  }
}

export function webviewHtml(
  showHoles: boolean,
  cssUri: vscode.Uri,
  jsUri: vscode.Uri,
  codiconUri: vscode.Uri,
): string {
  return /*html*/ `
<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset="UTF-8" />
	<title>Effekt Holes</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link href="${codiconUri}" rel="stylesheet" />
	<link href="${cssUri}" rel="stylesheet">
</head>

<body>
  <div id="react-root" data-show-holes="${showHoles}"></div>
	<script src="${jsUri}"></script>
</body>

</html>
  `;
}
