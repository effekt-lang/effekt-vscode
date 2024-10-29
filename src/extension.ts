'use strict';

import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, ExecuteCommandRequest, StreamInfo, ExecutableOptions } from 'vscode-languageclient';
import { EffektManager } from './effektManager';
import { Monto } from './monto';

import * as net from 'net';

let client: LanguageClient;
let effektManager: EffektManager;
let effektRunnerTerminal: vscode.Terminal | null = null;

function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('effekt.checkForUpdates', async () => {
            await effektManager?.checkForUpdatesAndInstall();
        }),
        vscode.commands.registerCommand('effekt.restartServer', async () => {
            await client?.stop();
            client?.start();
        }),
        vscode.commands.registerCommand('effekt.runFile', runEffektFile),
    );
}

async function getEffektTerminal() {
    if (effektRunnerTerminal === null || effektRunnerTerminal.exitStatus !== undefined) {
        effektRunnerTerminal = vscode.window.createTerminal({
            name: 'Effekt Runner',
            isTransient: true, // Don't persist across VSCode restarts
        });
        effektRunnerTerminal.hide();
    }
    return effektRunnerTerminal;
}

async function runEffektFile(uri: vscode.Uri) {
    // Save the document if it has unsaved changes
    const document = await vscode.workspace.openTextDocument(uri);
    if (document.isDirty) {
        await document.save();
    }

    const terminal = await getEffektTerminal();

    const effektExecutable = await effektManager.locateEffektExecutable();
    const args = [ uri.fsPath, ...effektManager.getEffektArgs() ];

    terminal.sendText("clear");
    terminal.sendText(`${effektExecutable.path} ${args.join(' ')}`);
    terminal.show();
}

class EffektRunCodeLensProvider implements vscode.CodeLensProvider {
    public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const mainFunctionRegex = /^def\s+main\s*\(\s*\)/gm;
        let match: RegExpExecArray | null;

        while ((match = mainFunctionRegex.exec(text)) !== null) {
            const line = document.lineAt(document.positionAt(match.index).line);
            const range = new vscode.Range(line.range.start, line.range.end);
            
            codeLenses.push(new vscode.CodeLens(range, {
                title: '$(play) Run',
                command: 'effekt.runFile',
                arguments: [document.uri]
            }));
        }

        return codeLenses;
    }
}

export async function activate(context: vscode.ExtensionContext) {
    effektManager = new EffektManager();

    const effektVersion = await effektManager.checkForUpdatesAndInstall();
    if (!effektVersion) {
        vscode.window.showWarningMessage('Effekt is not installed. LSP features may not work correctly.');
    }

    registerCommands(context);

    // Register the CodeLens provider
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: 'effekt', scheme: 'file' },
            new EffektRunCodeLensProvider()
        ),
        vscode.languages.registerCodeLensProvider(
            { language: 'literate effekt', scheme: 'file' },
            new EffektRunCodeLensProvider()
        )
    );

    // Clean up REPL when closed
    context.subscriptions.push(
        vscode.window.onDidCloseTerminal(terminal => {
            if (terminal === effektRunnerTerminal) {
                effektRunnerTerminal = null;
            }
        })
    );

    const config = vscode.workspace.getConfiguration("effekt");

    let serverOptions: ServerOptions;

    if (config.get<boolean>("debug")) {
        serverOptions = () => {
            // Connect to language server via socket
            let socket: any = net.connect({ port: 5007 });
            let result: StreamInfo = {
                writer: socket,
                reader: socket
            };
            return Promise.resolve(result);
        };
    } else {
        const effektExecutable = await effektManager.locateEffektExecutable();
        const args = ["--server", ...effektManager.getEffektArgs()];

        /* > Node.js will now error with EINVAL if a .bat or .cmd file is passed to child_process.spawn and child_process.spawnSync without the shell option set.
         * > If the input to spawn/spawnSync is sanitized, users can now pass { shell: true } as an option to prevent the occurrence of EINVALs errors.
         *
         * https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2
         */
        const isWindows = process.platform === 'win32';
        const execOptions: ExecutableOptions = { shell: isWindows };

        serverOptions = {
            run: { command: effektExecutable.path, args, options: execOptions },
            debug: { command: effektExecutable.path, args, options: execOptions }
        };
    }

    let clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'effekt' },
            { scheme: 'file', language: 'literate effekt' }
        ],
        diagnosticCollectionName: "effekt"
    };

    client = new LanguageClient(
        'effektLanguageServer',
        'Effekt Language Server',
        serverOptions,
        clientOptions
    );

    // Update server status
    client.onDidChangeState(event => {
        if (event.newState === 1) {
            effektManager.updateServerStatus('starting');
        } else if (event.newState === 2) {
            effektManager.updateServerStatus('running');
        } else if (event.newState === 3) {
            effektManager.updateServerStatus('stopped');
        }
    });

    Monto.setup("effekt", context, client);

    // Decorate holes
    // ---
    // It would be nice if there was a way to reuse the scopes of the tmLanguage file

    const holeDelimiterDecoration = vscode.window.createTextEditorDecorationType({
        opacity: '0.5',
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(0,0,0,0.05)" },
		dark: { backgroundColor: "rgba(255,255,255,0.05)" }
    })

    // the decorations themselves don't have styles. Only the added before-elements.
    const captureDecoration = vscode.window.createTextEditorDecorationType({})

    // based on https://github.com/microsoft/vscode-extension-samples/blob/master/decorator-sample/src/extension.ts
    let timeout: NodeJS.Timeout;
    let editor = vscode.window.activeTextEditor

    function scheduleDecorations() {
		if (timeout) { clearTimeout(timeout) }
		timeout = setTimeout(updateHoles, 50);
    }

    function updateCaptures() {

        if (!editor) { return; }

        if (!config.get<boolean>("showCaptures")) { return; }

        client.sendRequest(ExecuteCommandRequest.type, { command: "inferredCaptures", arguments: [{
            uri: editor.document.uri.toString()
        }]}).then(
            (result : [{ location: vscode.Location, captureText: string }]) => {
                if (!editor) { return; }

                let captureAnnotations: vscode.DecorationOptions[] = []

                if (result == null) return;

                result.forEach(response => {
                    if (!editor) { return; }
                    const loc = response.location
                    if (loc.uri != editor.document.uri) return;

                    captureAnnotations.push({
                        range:  loc.range,
                        renderOptions: {
                            before: {
                            contentText: response.captureText,
                            backgroundColor: "rgba(170,210,255,0.3)",
                            color: "rgba(50,50,50,0.5)",
                            fontStyle: "italic",
                            margin: "0 0.5em 0 0.5em"
                            }
                        }
                    })
                })

                if (!editor) { return; }
                return editor.setDecorations(captureDecoration, captureAnnotations)
            }
        );
    }

    const holeRegex = /<>|<{|}>/g

    /**
     * TODO clean this up -- ideally move it to the language server
     */
    function updateHoles() {
        if (!editor) { return; }

        const text = editor.document.getText()
        const positionAt = editor.document.positionAt

        let holeDelimiters: vscode.DecorationOptions[] = []
        let match;

        function addDelimiter(from: number, to: number) {
            const begin = positionAt(from)
            const end = positionAt(to)
            holeDelimiters.push({ range: new vscode.Range(begin, end) })
        }

        while (match = holeRegex.exec(text)) {
            addDelimiter(match.index, match.index + 2)
        }

        editor.setDecorations(holeDelimiterDecoration, holeDelimiters)
    }

    vscode.window.onDidChangeActiveTextEditor(ed => {
		editor = ed;
		scheduleDecorations();
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (editor && event.document === editor.document) {
			scheduleDecorations();
		}
    }, null, context.subscriptions);

    vscode.workspace.onDidSaveTextDocument(ev => {
        setTimeout(updateCaptures, 50)
    })

	scheduleDecorations();

    context.subscriptions.push(client.start());

    // Notebook
    context.subscriptions.push(
        vscode.workspace.registerNotebookSerializer('effekt-notebook', new SampleSerializer())
    );
}

// Notebook
interface RawNotebook {
  cells: RawNotebookCell[];
}

interface RawNotebookCell {
  source: string[];
  cell_type: 'code' | 'markdown';
}

class SampleSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(
    content: Uint8Array,
    _token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    const jsString = new TextDecoder().decode(content);

    let raw: RawNotebookCell[];
    try {
      raw = (<RawNotebook>JSON.parse(jsString)).cells;
    } catch {
      raw = [];
    }

    const cells = raw.map(
      item =>
        new vscode.NotebookCellData(
          item.cell_type === 'code'
            ? vscode.NotebookCellKind.Code
            : vscode.NotebookCellKind.Markup,
          item.source.join('\n'),
          item.cell_type === 'code' ? 'python' : 'markdown'
        )
    );

    return new vscode.NotebookData(cells);
  }

  async serializeNotebook(
    data: vscode.NotebookData,
    _token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    let contents: RawNotebookCell[] = [];

    for (const cell of data.cells) {
      contents.push({
        cell_type: cell.kind === vscode.NotebookCellKind.Code ? 'code' : 'markdown',
        source: cell.value.split(/\r?\n/g)
      });
    }

    return new TextEncoder().encode(JSON.stringify(contents));
  }
}

export function deactivate(): Thenable<void> | undefined {
    if (effektRunnerTerminal) effektRunnerTerminal.dispose()
    if (!client) {
        return undefined;
    }
    effektManager.updateServerStatus('stopped');
    return client.stop();
}