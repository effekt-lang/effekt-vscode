import * as vscode from 'vscode';
import { EffektHoleInfo } from './effektHoleInfo';
import { OutgoingMessage } from './webview/messages';

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

    const agentSupport =
      vscode.workspace
        .getConfiguration('effekt')
        .get<boolean>('agentSupport') || false;

    const cssUri = this.getCssUri()!;
    const jsUri = this.getJsUri()!;
    const codiconUri = this.getCodiconUri()!;

    webviewView.webview.html = webviewHtml(
      showHoles,
      agentSupport,
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

    webviewView.webview.onDidReceiveMessage((message: OutgoingMessage) => {
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
          this.webviewView?.webview.postMessage({
            command: 'highlightHole',
            holeId: hole.id,
          });
        }
      } else if (message.command === 'jumpToDefinition') {
        const location = message.definitionLocation;
        const uri = vscode.Uri.parse(location!.uri);
        const range = new vscode.Range(
          location!.range.start.line,
          location!.range.start.character,
          location!.range.end.line,
          location!.range.end.character,
        );
        vscode.window.showTextDocument(uri, {
          selection: range,
          viewColumn: vscode.ViewColumn.Active,
        });
      } else if (message.command === 'openCopilotChat') {
        this.handleOpenCopilotChat(message);
      } else if (message.command === 'createDraft') {
        this.handleCreateDraft();
      }
    });
  }

  private async handleOpenCopilotChat(request: {
    holeId: string;
  }): Promise<void> {
    try {
      const query = `Fill the hole with ID "${request.holeId}".`;

      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: query,
        mode: 'agent',
      });
    } catch (error) {
      console.error('Error opening copilot chat:', error);
      vscode.window.showErrorMessage(
        `Failed to open copilot chat: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
  private async handleCreateDraft(): Promise<void> {
    try {
      const query = `Create a draft structure for this Effekt file. Generate only function/method signatures with descriptive holes that explain what each function should do.

Instructions:
- Analyze the existing code to understand the intended program structure
- If the context is unclear or the file is empty/minimal, ask the user what kind of program they want to create 
- Create function signatures for missing functionality
- Use descriptive holes like "description of what this function should return" instead of empty holes
- Focus on creating a logical program structure with clear interfaces
- Don't implement the function bodies - only create signatures with meaningful hole descriptions
- Consider the types and effects that would be appropriate for each function

Example of what to generate:
def processInput(input: String): Result / { IO, Console } = ?"process the input string and return appropriate result"
def validateData(data: Data): Boolean / { Error } = ?"validate the data and return true if valid"

Please analyze the current file and suggest a draft structure with function signatures and descriptive holes.`;

      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: query,
        mode: 'agent',
      });
    } catch (error) {
      console.error('Error creating draft:', error);
      vscode.window.showErrorMessage(
        `Failed to create draft: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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

  // Bring keyboard focus to the panel
  public focusPanel() {
    this.webviewView?.webview.postMessage({
      command: 'focusPanel',
    });
  }

  dispose() {
    this.configListener?.dispose();
  }
}

export function webviewHtml(
  showHoles: boolean,
  agentSupport: boolean,
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
  <div id="react-root" data-show-holes="${showHoles}" data-agent-support="${agentSupport}"></div>
	<script src="${jsUri}"></script>
</body>

</html>
  `;
}
