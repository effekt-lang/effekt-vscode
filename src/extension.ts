'use strict';

import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    StreamInfo,
    State as ClientState
} from 'vscode-languageclient/node';
import { EffektManager } from './effektManager';
import { EffektIRContentProvider } from './irProvider';

import * as net from 'net';

let client: LanguageClient;
let effektManager: EffektManager;

function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('effekt.checkForUpdates', async () => {
            await effektManager?.checkForUpdatesAndInstall();
        }),
        vscode.commands.registerCommand('effekt.restartServer', async () => {
            if (client) {
                await client.stop();
                client.start();
            }
        }),
        vscode.commands.registerCommand('effekt.runFile', runEffektFile),
    );
}

async function runEffektFile(uri: vscode.Uri) {
    // Save the document if it has unsaved changes
    const document = await vscode.workspace.openTextDocument(uri);
    if (document.isDirty) {
        await document.save();
    }

    const effektExecutable = await effektManager.locateEffektExecutable();
    // We deliberately use uri.path rather than uri.fsPath
    // While the effekt binary is able to handle either, Git Bash on Windows
    // cannot handle backslashes in paths.
    // Using uri.path rather than uri.fsPath means that Effekt tasks
    // works in PowerShell, cmd.exe and Git Bash.
    const args = [uri.path, ...effektManager.getEffektArgs()];

    const taskDefinition = {
        type: 'shell',
        command: effektExecutable.path,
        args: args,
        presentation: {
            reveal: vscode.TaskRevealKind.Always,
            panel: vscode.TaskPanelKind.Dedicated,
            clear: true
        }
    };

    const execution = new vscode.ShellExecution(
        effektExecutable.path,
        args,
        { cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }
    );

    const task = new vscode.Task(
        taskDefinition,
        vscode.TaskScope.Workspace,
        'Run Effekt File',
        'Effekt',
        execution,
        []
    );

    await vscode.tasks.executeTask(task);
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

    // Start the LSP immediately, even before checking for updates
    await startEffektLanguageServer(context);

    // Register commands, CodeLens providers, and IR provider first
    registerCommands(context);
    registerCodeLensProviders(context);
    registerIRProvider(context);

    // Initialize hole decorations
    initializeHoleDecorations(context);

    // Check for updates and handle accordingly
    const effektVersion = await effektManager.checkForUpdatesAndInstall();
    if (!effektVersion) {
        vscode.window.showWarningMessage('Effekt is not installed. LSP features may not work correctly.');
    } else if (effektVersion !== await effektManager.getEffektVersion()) {
        // If the version was updated, restart the server
        await restartEffektLanguageServer(context);
    } else {
        vscode.window.showInformationMessage('Using the existing version of Effekt.');
    }
   
}

// Start the Effekt Language Server
async function startEffektLanguageServer(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration("effekt");
    let serverOptions: ServerOptions;

    if (config.get<boolean>("debug")) {
        serverOptions = () => {
            // Connect to language server via socket
            const socket = net.connect({ port: 5007 });
            const result: StreamInfo = {
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
        const execOptions = { shell: isWindows };

        serverOptions = {
            run: { command: effektExecutable.path, args, options: execOptions },
            debug: { command: effektExecutable.path, args, options: execOptions }
        };
    }

    const clientOptions: LanguageClientOptions = {
        initializationOptions: vscode.workspace.getConfiguration('effekt'),
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

    client.onDidChangeState(event => {
        if (event.newState === ClientState.Starting) {
            effektManager.updateServerStatus('starting');
        } else if (event.newState === ClientState.Running) {
            effektManager.updateServerStatus('running');
        } else if (event.newState === ClientState.Stopped) {
            effektManager.updateServerStatus('stopped');
        }
    });

    await client.start();
    context.subscriptions.push(client);
}

// Restart the Effekt Language Server
async function restartEffektLanguageServer(context: vscode.ExtensionContext) {
    if (client) {
        await client.stop();
    }
    await startEffektLanguageServer(context);
}

function registerCodeLensProviders(context: vscode.ExtensionContext) {
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
}

function registerIRProvider(context: vscode.ExtensionContext) {
    const effektIRContentProvider = new EffektIRContentProvider();
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider('effekt-ir', effektIRContentProvider)
    );

    client.onNotification('$/effekt/publishIR', (params: { filename: string, content: string }) => {
        const { filename, content } = params;
        const uri = vscode.Uri.parse(`effekt-ir:${filename}`);
        effektIRContentProvider.update(uri, content);
        vscode.workspace.openTextDocument(uri).then(doc => {
            vscode.window.showTextDocument(doc, {
                viewColumn: vscode.ViewColumn.Beside,
                preview: false,
                preserveFocus: true
            });
        });
    });
}

    // Decorate holes
    // ---
    // It would be nice if there was a way to reuse the scopes of the tmLanguage file
    function initializeHoleDecorations(context: vscode.ExtensionContext) {
    const holeDelimiterDecoration = vscode.window.createTextEditorDecorationType({
        opacity: '0.5',
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(0,0,0,0.05)" },
        dark: { backgroundColor: "rgba(255,255,255,0.05)" }
    });

    // based on https://github.com/microsoft/vscode-extension-samples/blob/master/decorator-sample/src/extension.ts
    let timeout: NodeJS.Timeout;
    let editor = vscode.window.activeTextEditor;

    function scheduleDecorations() {
        if (timeout) { clearTimeout(timeout); }
        timeout = setTimeout(updateHoles, 50);
    }

    const holeRegex = /<>|<{|}>/g;
    
    /**
     * TODO clean this up -- ideally move it to the language server
     */
    function updateHoles() {
        if (!editor) { return; }

        const text = editor.document.getText();
        const positionAt = editor.document.positionAt;

        let holeDelimiters: vscode.DecorationOptions[] = [];
        let match;

        function addDelimiter(from: number, to: number) {
            const begin = positionAt(from);
            const end = positionAt(to);
            holeDelimiters.push({ range: new vscode.Range(begin, end) });
        }

        while (match = holeRegex.exec(text)) {
            addDelimiter(match.index, match.index + 2);
        }

        editor.setDecorations(holeDelimiterDecoration, holeDelimiters);
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

    scheduleDecorations();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    effektManager.updateServerStatus('stopped');
    return client.stop();
}