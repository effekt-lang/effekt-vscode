import * as vscode from 'vscode';
import { EffektHoleInfo } from './effektHoleInfo';

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
      } else if (message.command === 'openCopilotChat') {
        this.handleOpenCopilotChat(message);
      } else if (message.command === 'solveAllHoles') {
        this.handleSolveAllHoles(message);
      } else if (message.command === 'createDraft') {
        this.handleCreateDraft();
      } else if (message.command === 'explainHole') {
        this.handleExplainHole(message);
      } else if (message.command === 'suggestNextStep') {
        this.handleSuggestNextStep(message);
      } else if (message.command === 'createTests') {
        this.handleCreateTests(message);
      } else if (message.command === 'writeTestFirst') {
        this.handleWriteTestFirst(message);
      } else if (message.command === 'runTests') {
        this.handleRunTests(message);
      } else if (message.command === 'implementToPass') {
        this.handleImplementToPass(message);
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

  private async handleSolveAllHoles(request: {
    holeIds: string[];
  }): Promise<void> {
    try {
      const holeNames = request.holeIds;

      const holesList = holeNames.join(', ');

      const query = `Solve all holes in this file. The holes are: ${holesList}

        Instructions:
        1. First, analyze all holes and create a priority/order for solving them based on:
          - Dependencies between holes (solve simpler/foundational holes first)
          - Type complexity (simpler types before complex ones)
          - Logical flow and context

        2. Then, go through each hole one by one in your determined order:
          - Analyze the hole's expected type and context
          - Examine available bindings in scope
          - Generate appropriate code to fill the hole, using the same approach as single hole solving

        Use type-driven development principles and leverage the available bindings to create meaningful implementations. Process systematically through your prioritized list.`;

      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: query,
        mode: 'agent',
      });
    } catch (error) {
      console.error('Error opening copilot chat for solve all:', error);
      vscode.window.showErrorMessage(
        `Failed to open copilot chat for solve all: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleCreateDraft(): Promise<void> {
    try {
      const query = `Create a draft structure for this Effekt file. Generate only function/method signatures with descriptive holes that explain what each function should do.

      Instructions:
      1. Analyze the existing code to understand the intended program structure
      
      If the context is unclear or the file is empty/minimal, ask the user what kind of program they want to create 

      2. Create function signatures for missing functionality
      3. Use descriptive holes like <"description of what this function should return"> instead of empty holes
      4. Focus on creating a logical program structure with clear interfaces
      5. Don't implement the function bodies - only create signatures with meaningful hole descriptions
      6. Consider the types and effects that would be appropriate for each function

      Example of what to generate:
      def processInput(input: String): Result / { IO, Console } = <"process the input string and return appropriate result">
      def validateData(data: Data): Boolean / { Error } = <"validate the data and return true if valid">

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

  private async handleExplainHole(request: { holeId: string }): Promise<void> {
    try {
      const query = `Explain the selected Effekt hole (ID: "${request.holeId}"). Summarize the expected type and any effects involved, and show 1-2 minimal example snippets that would typecheck here. Use valid Effekt syntax.`;
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query,
        mode: 'ask',
      });
    } catch (error) {
      console.error('Error opening copilot chat (explain hole):', error);
      vscode.window.showErrorMessage(
        `Failed to explain hole: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleSuggestNextStep(request: {
    holeId: string;
  }): Promise<void> {
    try {
      const query = `Effekt – suggest next steps for the selected hole (ID: "${request.holeId}").

Please respond in this format:

1. Goal
- Briefly state the expected value type and any effects you infer at this position.

2. Context
- List 3–6 most relevant in-scope bindings as bullets: name: Type

3. Next steps (3 options)
- For each option provide:
  - Rationale (1 sentence)
  - A tiny code snippet that would typecheck here

Rules:
- Prefer using existing bindings and simple composition. Avoid proposing bare literals.
- If effects are likely, show the correct Effekt syntax (with handler/try-with) in the snippet.
- If the goal is a function or an ADT, consider a lambda or a match skeleton as one option.

4. Recommendation
- Pick one option as the recommended next small step (one sentence).

Use valid Effekt syntax and keep snippets minimal.`;
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query,
        mode: 'agent',
      });
    } catch (error) {
      console.error('Error opening copilot chat (next step):', error);
      vscode.window.showErrorMessage(
        `Failed to suggest next step: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleCreateTests(request: { holeId: string }): Promise<void> {
    try {
      const query = `Create Effekt tests for hole "${request.holeId}" in the src/test folder. 

Analyze the hole's expected behavior and create comprehensive tests. Follow this Effekt test pattern:

\`\`\`effekt
module [moduleName]Test

import test
import src/[moduleName]

def [moduleName]Suite() = suite("[moduleName]") {
  test("test description") {
    // Test setup
    val expected = ...
    val actual = ...
    
    // Assertions
    assertTrue(condition, "error message")
    assertEqual(actual, expected, "values should match")
  }
}
\`\`\`

Instructions:
1. Determine if tests should go in an existing test file or create a new one
2. Create meaningful test cases covering different scenarios
3. Use proper Effekt syntax with effects handling (with/try blocks)
4. Include edge cases and typical use cases
5. Generate complete, runnable test code
`;

      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query,
        mode: 'agent',
      });
    } catch (error) {
      console.error('Error opening copilot chat (create tests):', error);
      vscode.window.showErrorMessage(
        `Failed to create tests: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // TDD workflow handlers
  private async handleWriteTestFirst(request: {
    holeId: string;
  }): Promise<void> {
    try {
      const query = `Write a test FIRST for Effekt hole "${request.holeId}" using TDD approach.

Create a comprehensive test that defines expected behavior BEFORE implementing the hole. The test should:
1. Specify clear input/output expectations
2. Include edge cases and error conditions  
3. Handle any expected effects properly
4. Initially FAIL when run (since hole is not implemented)

Follow this pattern:
\`\`\`effekt
test("${request.holeId} behavior") {
  val input = ...
  val expected = ...
  val actual = // call function containing hole
  assertEqual(actual, expected, "should meet expectation")
}
\`\`\`

Write failing tests first, then we'll implement to make them pass.`;

      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query,
        mode: 'agent',
      });
    } catch (error) {
      console.error('Error opening copilot chat (write test first):', error);
      vscode.window.showErrorMessage(
        `Failed to write test first: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleRunTests(request: { holeId?: string }): Promise<void> {
    try {
      const query = request.holeId
        ? `Run tests for Effekt hole "${request.holeId}" and show current failures.

Execute the relevant test suite and display:
1. Which tests are currently failing
2. Why they are failing (expected vs actual)
3. Stack traces or error messages
4. Guidance on what needs to be implemented to make tests pass

Focus on the failing tests related to hole "${request.holeId}".`
        : `Run all Effekt tests and show current status.

Execute the test suite and display:
1. Passing vs failing test counts
2. Details of any failures
3. Overall test coverage status`;

      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query,
        mode: 'agent',
      });
    } catch (error) {
      console.error('Error opening copilot chat (run tests):', error);
      vscode.window.showErrorMessage(
        `Failed to run tests: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleImplementToPass(request: {
    holeId: string;
  }): Promise<void> {
    try {
      const query = `Implement Effekt hole "${request.holeId}" to make the existing tests pass.

Analyze current test failures and create the MINIMAL implementation that satisfies all test requirements:
1. Look at failing test assertions to understand expected behavior
2. Implement just enough code to make tests pass (no over-engineering)
3. Use proper Effekt syntax and effects handling
4. Ensure the implementation handles all test cases (normal, edge, error cases)

Focus on making tests pass rather than adding extra functionality. Follow TDD principle: implement the simplest thing that makes tests green.`;

      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query,
        mode: 'agent',
      });
    } catch (error) {
      console.error('Error opening copilot chat (implement to pass):', error);
      vscode.window.showErrorMessage(
        `Failed to implement to pass: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
