'use strict';

import { ExtensionContext, workspace, window, Range, DecorationOptions, Location } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, ExecuteCommandRequest, StreamInfo } from 'vscode-languageclient';
import { Monto } from './monto';
import { platform } from 'os';
import * as net from 'net';


let client: LanguageClient;

export function activate(context: ExtensionContext) {

    let config = workspace.getConfiguration("effekt");

    let folders = workspace.workspaceFolders || []

    let defaultEffekt = "effekt";
    let os = platform();

    if (os == 'win32') { defaultEffekt = "effekt.cmd" }
    else if (os == 'linux' || os == 'freebsd' || os == 'openbsd') { defaultEffekt = "effekt.sh" }

    let effektCmd = config.get<string>("executable") || defaultEffekt


    let args: string[] = []

    let effektBackend = config.get<string>("backend")
    if (effektBackend) {
        args.push("--backend");
        args.push(effektBackend)
    }

    let effektLib = config.get<string>("lib")
    if (effektLib) {
        args.push("--lib");
        args.push(effektLib)
    }

    // add each workspace folder as an include
    folders.forEach(f => {
        args.push("--includes");
        args.push(f.uri.fsPath);
    })

    args.push("--server")

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
        serverOptions = {
            run: {
                command: effektCmd,
                args: args,
                options: {}
            },
            debug: {
                command: effektCmd,
                args: args,
                options: {}
            }
        };
    }


    let clientOptions: LanguageClientOptions = {
        documentSelector: [{
            scheme: 'file',
            language: 'effekt'
        }, {
            scheme: 'file',
            language: 'literateeffekt'
        }],
        diagnosticCollectionName: "effekt"
    };

    client = new LanguageClient(
        'effektLanguageServer',
        'Effekt Language Server',
        serverOptions,
        clientOptions
    );

    Monto.setup("effekt", context, client);

    // Decorate holes
    // ---
    // It would be nice if there was a way to reuse the scopes of the tmLanguage file

    const holeDelimiterDecoration = window.createTextEditorDecorationType({
        opacity: '0.5',
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(0,0,0,0.05)" },
		dark: { backgroundColor: "rgba(255,255,255,0.05)" }
    })

    // the decorations themselves don't have styles. Only the added before-elements.
    const captureDecoration = window.createTextEditorDecorationType({})

    // based on https://github.com/microsoft/vscode-extension-samples/blob/master/decorator-sample/src/extension.ts
    let timeout: NodeJS.Timer;
    let editor = window.activeTextEditor

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
            (result : [{ location: Location, captureText: string }]) => {
                if (!editor) { return; }

                let captureAnnotations: DecorationOptions[] = []

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

        let holeDelimiters: DecorationOptions[] = []
        let match;

        function addDelimiter(from: number, to: number) {
            const begin = positionAt(from)
            const end = positionAt(to)
            holeDelimiters.push({ range: new Range(begin, end) })
        }

        while (match = holeRegex.exec(text)) {
            addDelimiter(match.index, match.index + 2)
        }

        editor.setDecorations(holeDelimiterDecoration, holeDelimiters)
    }

    window.onDidChangeActiveTextEditor(ed => {
		editor = ed;
		scheduleDecorations();
	}, null, context.subscriptions);

	workspace.onDidChangeTextDocument(event => {
		if (editor && event.document === editor.document) {
			scheduleDecorations();
		}
    }, null, context.subscriptions);

    workspace.onDidSaveTextDocument(ev => {
        setTimeout(updateCaptures, 50)
    })

	scheduleDecorations();

    context.subscriptions.push(client.start());
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
