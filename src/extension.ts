'use strict';

import { ExtensionContext, workspace, window, Range, DecorationOptions, commands, languages } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo, TransportKind, VersionedTextDocumentIdentifier } from 'vscode-languageclient';
import { Monto } from './monto';
import { platform } from 'os';
import { symlinkSync } from 'fs';
import { execArgv } from 'process';

const net = require('net');


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

    // add each workspace folder as an include
    folders.forEach(f => {
        args.push("--includes");
        args.push(f.uri.fsPath);
    });

    args.push("--server");

    let remoteDebugMode = config.get<boolean>("remoteDebug");
    let debugPort: any = config.get<number>("remoteDebugPort");

    let serverOptions: any;

    if(remoteDebugMode) {
        console.log("Trying to connect to remote effect server on port " + debugPort);
        serverOptions = () => {
            // Connect to language server via socket
            let socket: any = net.connect({ port: debugPort }); //defaults to 5007
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
                //module: "",
                args: args.concat(["--debug"]),
                options: {
                    // execPath: effektCmd
                }
                /*
                transport: {
                    kind: TransportKind.socket,
                    port: debugPort
                }
                */
            }
        };
    }

    // from vscode language-client
    // https://github.com/microsoft/vscode-languageserver-node/blob/bf274d873fb915be6bed64e5093cbe512aa8db5e/client/src/node/main.ts#L242
    function startedInDebugMode() {
        let args = process.execArgv;
        if (args) {
            return args.some((arg) => /^--debug=?/.test(arg) || /^--debug-brk=?/.test(arg) || /^--inspect=?/.test(arg) || /^--inspect-brk=?/.test(arg));
        }
        ;
        return false;
    }




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

    //decorate effect annotations
    const effectDecoration = window.createTextEditorDecorationType({
        opacity: '0.5',
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(127,127,127,0.05)", color: "rgba(0,255,0,1.0)"},
        dark: { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(0,255,0,1.0)" },
        before: {contentText: 'Effekt:', backgroundColor: "rgba(100,100,100,1)"}
    })


    // Decorate holes
    // ---
    // It would be nice if there was a way to reuse the scopes of the tmLanguage file

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

    const holeRegex = /<>|<{|}>/g
    const effectRegex = /\/ *[a-zA-Z]* *=|\/ *{ *[a-zA-Z]* *} =/g

    /**
     * TODO clean this up -- ideally move it to the language server
     */
    function decorate() {
        if (!editor) { return; }

        const text = editor.document.getText()
        const positionAt = editor.document.positionAt

        let holeDelimiters: DecorationOptions[] = []
        let effectDelimiters: DecorationOptions[] = []
        let match;

        function addDelimiter(from: number, to: number, delimiters: DecorationOptions[]) {
            const begin = positionAt(from);
            const end = positionAt(to)
            delimiters.push({ range: new Range(begin, end) })
        }

        while (match = holeRegex.exec(text)) {
            addDelimiter(match.index, match.index + 2, holeDelimiters)
        }

        while (match = effectRegex.exec(text)) {
            
            addDelimiter(match.index, match.index +match[0].length, effectDelimiters)
        }

        editor.setDecorations(holeDelimiterDecoration, holeDelimiters)

        editor.setDecorations(effectDecoration, effectDelimiters)

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
    


    //testing document selector - wil this work for .effekt files?
    let docSelector = {
        language: "effekt",
        scheme: "file"
    };



    console.log("Starting effekt server.");
    context.subscriptions.push(client.start());


    if (startedInDebugMode()) {
        /*Effekt server should have been started with "--debug" flag and should be listening on a port.
            Hence we start a second process for listening on that port. */

        let listenerClient: LanguageClient = new LanguageClient(
            'effektLanguageServerDebug',
            'Effekt Language Server Debug',
            () => {
                // Connect to language server via socket
                let socket: any = net.connect({ port: debugPort }); //defaults to 5007
                let result: StreamInfo = {
                    writer: socket,
                    reader: socket
                };
                return Promise.resolve(result);
            },
            clientOptions
        );

        console.log("Effekt server was started in debug mode - trying to listen on port " + debugPort + ".");
        context.subscriptions.push(listenerClient.start());
    }

    console.log("Exec Args: " + execArgv);
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
