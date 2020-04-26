'use strict';

import { ExtensionContext, workspace, window, Range, DecorationOptions } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient';
import { Monto } from './monto';
import { platform } from 'os';

let client: LanguageClient;

export function activate(context: ExtensionContext) {

    let config = workspace.getConfiguration("effekt");

    let folders = workspace.workspaceFolders || []

    let defaultEffekt = platform() == 'win32' ? "effekt.cmd" : "effekt";

    let effektCmd = config.get<string>("executable") || defaultEffekt

    let args: string[] = []

    // add each workspace folder as an include
    folders.forEach(f => {
        args.push("--includes");
        args.push(f.uri.fsPath);
    })

    args.push("--server")

    let serverOptions: ServerOptions = {
        run: {
            command: effektCmd,
            args: args,
            options: {}
        },
        debug: {
            command: effektCmd,
            args: args.concat(["--debug"]),
            options: {}
        }
    };

    let clientOptions: LanguageClientOptions = {
        documentSelector: [{
            scheme: 'file',
            language: 'effekt'
        }, {
            scheme: 'file',
            language: 'markdown'
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

    const holeDecoration = window.createTextEditorDecorationType({
        opacity: '0.75',
    })

    const holeDelimiterDecoration = window.createTextEditorDecorationType({
        opacity: '0.5',
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(0,0,0,0.05)" },
		dark: { backgroundColor: "rgba(255,255,255,0.05)" }
    })


    // based on https://github.com/microsoft/vscode-extension-samples/blob/master/decorator-sample/src/extension.ts
    let timeout: NodeJS.Timer;
    let editor = window.activeTextEditor

    function scheduleDecorations() {
		if (timeout) { clearTimeout(timeout) }
		timeout = setTimeout(decorate, 50);
	}

    const holeOpen = /<{/
    const holeClose = /}>/
    const holeRegex = /<>/g

    /**
     * TODO clean this up -- this is really just hacked together...
     */
    function decorate() {
        if (!editor) { return; }

        const text = editor.document.getText()
        const positionAt = editor.document.positionAt

        let offset = 0;
        let holes: DecorationOptions[] = []
        let holeDelimiters: DecorationOptions[] = []
        let match;

        function input() { return text.substring(offset) }

        function addDelimiter(from: number, to: number) {
            const begin = positionAt(from)
            const end = positionAt(to)
            holeDelimiters.push({ range: new Range(begin, end) })
        }

        function addHole(from: number, to: number) {
            const begin = positionAt(from)
            const end = positionAt(to)
            holes.push({ range: new Range(begin, end) })
        }

        while (match = holeRegex.exec(text)) {
            addDelimiter(match.index, match.index + 2)
        }

        while ((match = input().match(holeOpen)) && match != null && match.index != undefined) {
            offset = offset + match.index
            const begin = offset
            addDelimiter(offset, offset + 2)
            match = input().match(holeClose)
            if (match != null && match.index != undefined) {
                offset = offset + match.index
                const end = offset
                addHole(begin + 2, end)
                addDelimiter(offset, offset + 2)
            }
        }

        editor.setDecorations(holeDecoration, holes)
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

	scheduleDecorations();

    context.subscriptions.push(client.start());
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
