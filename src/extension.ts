'use strict';

import { ExtensionContext, workspace, window, Range, DecorationOptions, Location, Uri, TextEditor } from 'vscode';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, ExecuteCommandRequest, StreamInfo } from 'vscode-languageclient';
import { Monto } from './monto';
import { platform } from 'os';
import * as net from 'net';
import { IDEAssistant } from './assistant';

let client: LanguageClient;

export function activate(context: ExtensionContext) {


    let config = workspace.getConfiguration("effekt");

    let folders = workspace.workspaceFolders || []

    let defaultEffekt = "effekt";
    let os = platform();

    if (os == 'win32') { defaultEffekt = "effekt.cmd" }
    else if (os == 'linux' || os == 'freebsd' || os == 'openbsd') { defaultEffekt = "effekt.sh" }

    let effektCmd = config.get<string>("executable") || defaultEffekt

    // OpenAI configs
    const assistant = IDEAssistant(config.get<string>("api"), config.get<string>("model") || "")

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

    function icon(color: string) {

        // SVG content with dynamic fill color
        const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="${color}"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.5 2.00098H13V3.00098H14V4.00098H15V2.50098L14.5 2.00098ZM9 2.00098H11V3.00098H9V2.00098ZM5 2.00098H7V3.00098H5V2.00098ZM14 10.001V11.001V12.001H14.5L15 11.501V10.001H14ZM12 12.001V11.001H10V12.001H12ZM8 11.001H7.5L7.146 11.147L5 13.294V11.501L4.5 11.001H4V12.001V14.501L4.854 14.855L7.707 12.001H8V11.001ZM15 8.00098V6.00098H14V8.00098H15ZM2 11.001V10.001H1V11.501L1.5 12.001H2V11.001ZM2 8.00098V6.00098H1V8.00098H2ZM2 3.00098V4.00098H1V2.50098L1.5 2.00098H3V3.00098H2Z"/></svg>`

        // Encode the SVG content to a data URI
        const encodedSvg = encodeURIComponent(svg);
        return Uri.parse(`data:image/svg+xml;charset=utf-8,${encodedSvg}`)
    }

    // TODO
    // - [ ] indicate that a proposal is ready
    // - [ ] move proposals to the right
    // - [ ] syntax highlight proposals
    // - [ ] add additional information about program to proposals
    // - [ ] use logo
    // - [ ] show info notification if completion is ready



    // Decorate holes
    // ---
    // It would be nice if there was a way to reuse the scopes of the tmLanguage file

    const holeDelimiterDecoration = window.createTextEditorDecorationType({
        opacity: '0.5',
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(0,0,0,0.05)" },
		dark: { backgroundColor: "rgba(255,255,255,0.05)" }
        //gutterIconPath: icon("rgba(0,0,0,0.4)")
        // after: {
        //     contentText: "  proposal ready",
        //     color: "rgba(0,0,0,0.2)",
        //     fontStyle: ""
        // }
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


    let proposal: string = ""


    // Hole Diagnostics
    // ----------------
    const assistantDiagnostics = vscode.languages.createDiagnosticCollection('assistant');

    class CompletionAvailable extends vscode.Diagnostic {
        constructor(range: vscode.Range) {
            super(range, "Completion available", vscode.DiagnosticSeverity.Hint);
        }
    }

    function showHoleCompletionAvailable(document: vscode.TextDocument, range: Range): void {
        assistantDiagnostics.set(document.uri, [new CompletionAvailable(range)]);
    }

    function clearAssistantDiagnostics() {
        if (!editor) return;
        assistantDiagnostics.set(editor.document.uri, [])
    }

    class ShowCompletionProposal implements vscode.CodeActionProvider {
        public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeAction[]> {
            return context.diagnostics
                .filter(diagnostic => diagnostic instanceof CompletionAvailable)
                .map(diagnostic => this.acceptProposal(document, diagnostic.range));
        }

        private acceptProposal(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
            const fix = new vscode.CodeAction(`Accept proposal`, vscode.CodeActionKind.QuickFix);
            fix.edit = new vscode.WorkspaceEdit();
            fix.edit.replace(document.uri, range, proposal);
            return fix;
        }
    }

    vscode.languages.registerCodeActionsProvider({ scheme: 'file', language: 'effekt' }, new ShowCompletionProposal());

    // Virtual Documents
    // -----------------
    let subscriptions = context.subscriptions

    class HoleViewProvider implements vscode.WebviewViewProvider {
        private _view?: vscode.WebviewView;

        constructor(private readonly _extensionUri: vscode.Uri) {}

        resolveWebviewView(webviewView: vscode.WebviewView) {
            this._view = webviewView;

            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [this._extensionUri]
            };
            this.updateProposals()
        }

        public updateProposals() {
            const content =
                (proposal == "") ?
                `<h3>No proposal for holes available</h3>`
                :
                `<h3>Proposed solution</h3>
                <pre>${proposal}</pre>`;

            if (this._view) {
                this._view.webview.html = this.layout(content)
            }
        }

        private layout(content: string): string {
            return `<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body>
                        ${content}
                    </body>
                    </html>`;
        }
    }

    const provider = new HoleViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("helloView", provider)
    );


    function findHoles(editor: TextEditor) {
        let holes = [];
        let match;
        while (match = holeRegex.exec(editor.document.getText())) {
            let begin = editor.document.positionAt(match.index)
            let end = editor.document.positionAt(match.index + 2)
            holes.push({ range: new Range(begin, end) })
        }
        return holes;
    }

    function findCompletions() {

        if (!editor) { return; }
        let holes = findHoles(editor);
        let document = editor.document
        // no holes
        if (holes.length <= 0) { console.log("no holes"); return; }

        const fileContents = editor.document.getText();

        // don't use it on large examples, yet.
        if (fileContents.length > 10000) { console.log("too long"); return; }

        console.log("completions started");
        assistant.complete(fileContents).then(res => {
            proposal = res || "";
            provider.updateProposals()
            showHoleCompletionAvailable(document, holes[0].range)
        })
    }

    // register a command to fill the hole
	subscriptions.push(vscode.commands.registerCommand('effekt.fillHole', async () => {
        if (!editor) { return; }

		if (!vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage("No active editor");
			return;
		}
        if (proposal == "") {
            vscode.window.showInformationMessage("No proposal available to fill the hole.");
            return;
        }

        const document = editor.document;
        const holes = findHoles(editor);
        const content = proposal;

        if (holes.length == 0) {
            vscode.window.showInformationMessage("No hole found in document.");
            return;
        }
        const hole = holes[0].range
        // reset proposal view
        proposal = ""
        provider.updateProposals()

        editor.edit(editBuilder => {
            editBuilder.replace(hole, content);
        }).then(success => {
            if (!editor) { return; }
            const afterInsert = document.positionAt(document.offsetAt(hole.start) + content.length);
            editor.selection = new vscode.Selection(afterInsert, afterInsert);
            // Optionally, you can also reveal the cursor position to ensure it's in the viewport
            editor.revealRange(new vscode.Range(afterInsert, afterInsert));
        });
	}));


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
        provider.updateProposals()
        clearAssistantDiagnostics()

        setTimeout(updateCaptures, 50)
        setTimeout(findCompletions, 0)
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
