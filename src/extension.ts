'use strict';

import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, ExecuteCommandRequest, StreamInfo } from 'vscode-languageclient';
import { EffektManager } from './effektManager';
import { Monto } from './monto';

import * as net from 'net';

let client: LanguageClient;
let effektManager: EffektManager;

function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('effekt.checkForUpdates', async () => {
            await effektManager.checkAndInstallEffekt();
        }),
        vscode.commands.registerCommand('effekt.restartServer', async () => {
            await client.stop();
            client.start();
        })
    );
}

export async function activate(context: vscode.ExtensionContext) {
    effektManager = new EffektManager();

    const effektVersion = await effektManager.checkAndInstallEffekt();
    if (!effektVersion) {
        vscode.window.showWarningMessage('Effekt is not installed. LSP features may not work correctly.');
    }

    registerCommands(context);

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
        const effektExecutable = await effektManager.getEffektExecutable();
        const args = effektManager.getEffektArgs();
        serverOptions = {
            run: { command: effektExecutable, args },
            debug: { command: effektExecutable, args }
        };
    }

    let clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'effekt' },
            { scheme: 'file', language: 'literateeffekt' }
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
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    effektManager.updateServerStatus('stopped');
    return client.stop();
}