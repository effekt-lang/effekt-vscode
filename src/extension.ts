'use strict';
import { ExtensionContext, workspace, window, Range, DecorationOptions, languages, commands, Position,
        TextDocument, HoverProvider,
        TextEditor, Hover, CancellationToken } from 'vscode';
import { ExecuteCommandRequest, LanguageClient, LanguageClientOptions, StreamInfo } from 'vscode-languageclient';
import { Monto } from './monto';
import { platform } from 'os';

// import own types
import { CapabilityInfo, CapabilityScope } from './effektLSPTypes'

// import own decoration types
import { scopeDecorationType } from './effektDecorationTypes'

// import necessary commands for the effekt extension
import { startClientCommand, stopClientCommand, highlightScopeCommand, showCapabilityOriginCommand } from './effektCommands';

import { effektCodeLensProvider } from './effektCodeLensProvider';

import * as effektVisualization from './effektVisualization';

const net = require('net');


let client: LanguageClient;

/**
 * Activate the extension.
 * Activation includes registering the language server and setting up the server to accept connections.
 * Furthermore the server is started and the client is connected via the monto part (see monto.ts).
 * After the initial setup, hooks for showing receiving and displaying the LSP infos are registered.
 */
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

    /**
     * Options that are used to start the server process.
     * we don't pass the "--debug" flag in the debug options args as this
     * would start the servr listening on a port instead of reading from stdio
     */
    let serverOptions: any = {
        run: {
            command: effektCmd,
            args: args,
            options: {
                shell: true,
                cwd: undefined,
                env: process.env,
                windowsVerbatimArguments: true
            }
        },
        debug: {
            command: effektCmd,
            args: args,
            options: {
                shell: true,
                cwd: undefined,
                env: process.env,
                windowsVerbatimArguments: true
            }
        }
    };


    let remoteDebugMode = config.get<boolean>("remoteDebug");
    let debugPort: any = config.get<number>("remoteDebugPort");

    let remoteDebugServerOptions: any = () => {
        // Connect to language server via socket
        let socket: any = net.connect({ port: debugPort }); //defaults to 5007
        let result: StreamInfo = {
            writer: socket,
            reader: socket
        };
        return Promise.resolve(result);
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

    /**
     * If we enabled remote debug mode on the settings, the extension will try
     * to connect to an LSP server on the given debugPort
     */
    client = new LanguageClient(
        'effektLanguageServer',
        'Effekt Language Server',
        remoteDebugMode ? remoteDebugServerOptions : serverOptions,
        clientOptions
    );

    client.onReady().then(() => {
        console.log("effektLanguageServer ready");
        triggerUpdateDecorations();
    })

    Monto.setup("effekt", context, client);


    // based on https://github.com/microsoft/vscode-extension-samples/blob/master/decorator-sample/src/extension.ts
    let timeout: NodeJS.Timer | undefined;
    let editor = window.activeTextEditor;

    /**
     * Manually triggers an update of all decorations.
     * This function checks if the current editors language is effekt or markdown and
     * only queries the language server for decoration information if so.
     * TODO: move to a decoration package
     */
    async function updateDecorations() {
        if (!editor) {
            return;
        }

        if(editor.document.languageId == "effekt" || editor.document.languageId == "markdown"){
            getCapabilitiesInfo().then(capabilitiesInfo => {
                displayCapabilitiesInfo(capabilitiesInfo);
            })
        }
    }

    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        timeout = setTimeout(updateDecorations, 500);
    }

    // A list of the scopes of all capabilities of the current editor.
    let capabilityScopes: CapabilityScope[] = [];

    /**
     * Whenever we change the cursor position, we want to update
     * the currently visualized scope of a capabilitie, if there is any
     * at the current cursor position.
     * TODO: this is both unstable and unelegant. Should be replaced
     * by a query to the language server that returns a list of all
     * capability scopes at the current cursor position.
     */
    window.onDidChangeTextEditorSelection(ev => {
        console.log("Cursor position changed", ev);
        console.log(capabilityScopes)
        let current = ev.selections[0].active;
        
        let removeScopeDecorations = true;
        capabilityScopes.forEach((v, i) => {

            if(current.line == v.hoverRange.end.line){
                if(current.character >= v.hoverRange.start.character && current.character <= v.hoverRange.end.character){
                    console.log("Found a capability scope matching current cursor position ", current.line, "x", current.character);
                    removeScopeDecorations = false;
                    highlightScope({
                        capabilityName: v.capabilityName,
                        scopeStart: v.scopeRange.start,
                        scopeEnd: v.scopeRange.end
                    });
                }
            }
        })
        if(removeScopeDecorations){
            editor?.setDecorations(scopeDecorationType, []);
        }

    });

    /**
     * Safely update decorations
     */
    function updateDecorationsSafely(editor: TextEditor |undefined) {
        if (editor && (editor.document.languageId == "effekt" || editor.document.languageId == "markdown")) {
            triggerUpdateDecorations();
        }
    }

    /**
     * Whenever the active editor changes, update the editor
     * state and trigger an update of the decorations if an effekt file is shown.
     */
    window.onDidChangeActiveTextEditor(ed => {
        editor = ed;
        updateDecorationsSafely(editor);
    }, null, context.subscriptions);

    /**
     * Whenever the currently active text document changes,
     * update the decorations.
     */
    workspace.onDidChangeTextDocument(event => {
        if (editor && event.document === editor.document) {
            updateDecorationsSafely(editor);
        }
    }, null, context.subscriptions);

    workspace.onDidSaveTextDocument(document => {
        if(editor && document === editor.document){
            updateDecorationsSafely(editor);
        }
    }, null, context.subscriptions);



    /**
     * Register the CodeLens provider for effekt files if
     * this option is enabled in the extensions settings.
     */
    if(config.get<boolean>('enableCodeLenses')){
        let codeLensProviderDisposable = languages.registerCodeLensProvider(
            [{
                scheme: 'file',
                language: 'effekt'
            }, {
                scheme: 'file',
                language: 'markdown'
            }],
            new effektCodeLensProvider(getCapabilitiesInfo)
        );
        context.subscriptions.push(codeLensProviderDisposable);
    }

    /**
     * A hoverprovider to provide hover information on capability scopes.
     * This should be replaced by a query to the language server that
     * returns a list of all capability scopes at the current cursor position.
     */
    class effektHoverProvider implements HoverProvider {
        async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | null | undefined> 
        {
            let capabilitiesInfo = await getCapabilitiesInfo();
            // return a hover with the capability name of the first capability that matches the position
            let hover = capabilitiesInfo.filter(ca => {
                return ca.sourceRange.start.line <= position.line && ca.sourceRange.end.line >= position.line;
            })[1];
            if(hover){
                return new Hover('Scope of ' + hover.capabilityName, hover.sourceRange);
            }
            return undefined;
        }
    }

    let hoverProviderDisposable = languages.registerHoverProvider(
        [{
            scheme: 'file',
            language: 'effekt'
        }, {
            scheme: 'file',
            language: 'markdown'
        }],
        new effektHoverProvider()
    );
    context.subscriptions.push(hoverProviderDisposable);

   

    /**
     * Visualize capability infos depending on their capabilityKind
     * @param response an array of capability infos
     */
    function displayCapabilitiesInfo(response: CapabilityInfo[]) {
        capabilityScopes = []; //first reset the list of known capability scopes
        effektVisualization.displayCapabilityBinders(editor, capabilityScopes, response.filter(r => r.capabilityKind == "CapabilityBinder"));
        effektVisualization.displayCapabilityReceivers(editor, capabilityScopes, response.filter(r => r.capabilityKind == "CapabilityReceiver"));
        effektVisualization.displayCapabilityArguments(editor, capabilityScopes, response.filter(r => r.capabilityKind == "CapabilityArgument"));
    }
    

    /**
     * asynchronously request the LSP server for info on capabilities (introductions, binding sites, scopes etc.) and store that info for visualisation
     */
    async function getCapabilitiesInfo(): Promise<CapabilityInfo[]> {
        let infos = client.sendRequest(ExecuteCommandRequest.type, { command: "getCapabilitiesInfo", arguments: [editor?.document.uri.toString()]}).then(
                response_json => {
                    var response = JSON.parse(response_json as string) as CapabilityInfo[];
                    let capabilitiesInfo = response.map(element => {
                        return(new CapabilityInfo(element))
                    });
                    return capabilitiesInfo;
                }
            );
        return infos
    }


    /**
     * Visually highlight the origin of a given capability
     */
    const showCapabilityOrigin = (capability: CapabilityInfo, capabilitiesInfo: CapabilityInfo[]) => {
        console.log("showCapabilityOrigin: ", capability);
        /** 
         * search for capabilities in globalCapabilitiesInfo that meet the following requirements:
         * 1. the capabilities name must match capability.CapabilityName
         * 2. the capabilities sourceRange must be in capability.scopeRange
         */

        let matches: Range[] = capabilitiesInfo.map(ca => {
            if(ca != capability && ca.capabilityName == capability.capabilityName && ca.capabilityKind != capability.capabilityKind){
                try {    
                    if(capability.scopeRange.contains(ca.sourceRange)){
                        return ca.sourceRange;
                    }   
                } catch (error) {
                    console.log(error)
                }
            }
            return new Range(0,0,0,0)
        });

        editor?.setDecorations(scopeDecorationType, matches);
    }

    /**
     * Visually hightlight a given range as the scope of a capability
     */
    const highlightScope = (args: {capabilityName: string, scopeStart: any, scopeEnd: any}) => {
        let scopeRange = new Range(new Position(args.scopeStart.line, args.scopeStart.character),
            new Position(args.scopeEnd.line, args.scopeEnd.character)
        )
        const scopeDecoration: DecorationOptions = {
            range: scopeRange
        };
        
        editor?.setDecorations(scopeDecorationType, [scopeDecoration]);
    };

   
    /**
     * Register a start up command to manually start the language client
     */
    context.subscriptions.push(commands.registerCommand(startClientCommand, () => {
        console.log("Starting client");
        console.log("Starting language server client with options:\n", serverOptions);
        context.subscriptions.push(client.start());
    }));


    /**
     * Register a stop command to manually stop the language client
     */
    context.subscriptions.push(commands.registerCommand(stopClientCommand, () => {
        console.log("Stopping client");
        client.stop().then(() => {
            console.log("Client stopped");
        });
    }));
    
    /**
     * Some commands.
     * TODO: update!
     */
    context.subscriptions.push(commands.registerCommand(highlightScopeCommand, highlightScope));
    context.subscriptions.push(commands.registerCommand(showCapabilityOriginCommand, showCapabilityOrigin))


    context.subscriptions.push(client.start());
}

/**
 * Deactivate the extension.
 * If the language client is still running, it will be stopped.
 */
export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

