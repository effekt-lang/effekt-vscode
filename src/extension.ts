'use strict';
import { Uri, ExtensionContext, workspace, window, Range, DecorationOptions, languages, commands, Position, TextDocument, QuickPickItem, MarkdownString, CodeLens, Command, CodeLensProvider, HoverProvider, Hover, CancellationToken } from 'vscode';
import { ExecuteCommandRequest, LanguageClient, LanguageClientOptions, StreamInfo, ServerOptions } from 'vscode-languageclient';
import { Monto } from './monto';
import { platform } from 'os';
//import { symlinkSync } from 'fs';
import { execArgv } from 'process';
import { isString } from 'util';

const net = require('net');


let client: LanguageClient;


export function activate(context: ExtensionContext) {

    console.log("Activating Effekt extension");

    let config = workspace.getConfiguration("effekt");
    let folders = workspace.workspaceFolders || []

    let defaultEffekt = "effekt";
    let os = platform();

    if (os == 'win32') { defaultEffekt = "effekt.cmd" }
    else if (os == 'linux' || os == 'freebsd' || os == 'openbsd') { defaultEffekt = "/usr/local/bin/effekt.sh" }

    let effektCmd = defaultEffekt // config.get<string>("executable") || 

    let args: string[] = []

    // add each workspace folder as an include
    folders.forEach(f => {
        args.push("--includes");
        args.push(f.uri.fsPath);
    });

    args.push("--server");

    let serverOptions: ServerOptions = {
        run: {
            command: effektCmd,
            args: args,
            options: {
                shell: true
            }
        },
        debug: {
            command: effektCmd,
            args: args,
            options: {
                shell: true
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

    // from vscode language-client
    // https://github.com/microsoft/vscode-languageserver-node/blob/bf274d873fb915be6bed64e5093cbe512aa8db5e/client/src/node/main.ts#L242
    // function startedInDebugMode() {
    //     let args = process.execArgv;
    //     if (args) {
    //         return args.some((arg) => /^--debug=?/.test(arg) || /^--debug-brk=?/.test(arg) || /^--inspect=?/.test(arg) || /^--inspect-brk=?/.test(arg));
    //     }
    //     ;
    //     return false;
    // }


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
        remoteDebugMode ? remoteDebugServerOptions : serverOptions,
        clientOptions
    );

    client.onReady().then(() => {
        console.log("effektLanguageServer ready");
    })

    Monto.setup("effekt", context, client);

    //decorate effect annotations
    const effectDecoration = window.createTextEditorDecorationType({
        opacity: '0.5',
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(127,127,127,0.05)", color: "rgba(0,255,0,1.0)"},
        dark: { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(0,255,0,1.0)" },
        before: {contentText: '\t'},
        gutterIconPath: "C:\Users\timne\source\repos\effekt\effekt-vscode\resoures\icons\outline_login_black_24dp.png"
    });

    const unhandledEffectDecoration = window.createTextEditorDecorationType({
        opacity: '0.5',
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(127,127,127,0.05)", color: "rgba(0,255,0,1.0)"},
        dark: { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(0,255,0,1.0)" },
        before: {contentText: '\t'}
    });


    // Decorate holes
    // ---
    // It would be nice if there was a way to reuse the scopes of the tmLanguage file

    // const holeDelimiterDecoration = window.createTextEditorDecorationType({
    //     opacity: '0.5',
    //     borderRadius: '4pt',
    //     light: { backgroundColor: "rgba(0,0,0,0.05)" },
    //     dark: { backgroundColor: "rgba(255,255,255,0.05)" }
    // })


    // based on https://github.com/microsoft/vscode-extension-samples/blob/master/decorator-sample/src/extension.ts
    let timeout: NodeJS.Timer | undefined;
    let editor = window.activeTextEditor;

    // function scheduleDecorations() {
    //     if (timeout) { clearTimeout(timeout) }
    //     timeout = setTimeout(decorate, 50);
    // }

    // const holeRegex = /<>|<{|}>/g
    // const effectRegex = /\/ *[a-zA-Z]* *=|\/ *{ *[a-zA-Z]* *} =/g

    /**
     * TODO clean this up -- ideally move it to the language server
     */
    // function decorate() {
    //     if (!editor) { return; }

    //     const text = editor.document.getText();
    //     const positionAt = editor.document.positionAt;

    //     let holeDelimiters: DecorationOptions[] = []

    //     let match;

    //     function addDelimiter(from: number, to: number, delimiters: DecorationOptions[]) {
    //         const begin = positionAt(from);
    //         const end = positionAt(to)
    //         delimiters.push({ range: new Range(begin, end) })
    //     }

    //     while (match = holeRegex.exec(text)) {
    //         addDelimiter(match.index, match.index + 2, holeDelimiters)
    //     }

    //     editor.setDecorations(holeDelimiterDecoration, holeDelimiters);

    //     // only add effekt annotations for effekt files
    //     decorateTypeAnnotations(editor.document);

    // }


    


    function updateDecorations() {
        if (!editor) {
            return;
        }

        if(editor.document.languageId == "effekt" || editor.document.languageId == "markdown"){
            //getCapabilitiesInfo();
            //getPassedCapabilitiesHandler();
            //getUnhandledCapabilitiesHandler();
        }
    }


    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        timeout = setTimeout(updateDecorations, 500);
    }

    if (editor) {
        triggerUpdateDecorations();
    }


    let capabilityScopes: { capabilityName: string, hoverRange: Range; scopeRange: Range; }[] = [];

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
                    commandHandler({
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

    window.onDidChangeActiveTextEditor(ed => {
        editor = ed;
        if (editor) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    workspace.onDidChangeTextDocument(event => {
        console.log("!!!!! onDidChangeTextDocument triggered !!!!!");
        if (editor && event.document === editor.document) {
            console.log("!!!!! Triggering decorations update !!!!!");
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    workspace.onDidSaveTextDocument(document => {
        if(editor && document === editor.document){
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);


    const startClientCommand = 'effekt.startClient';
    const stopClientCommand = 'effekt.stopClient';

    const clearAnnotationsCommand = 'effekt.clearAnnotations';
    const showCapabilityOriginCommand = 'effekt.showCapabilityOrigin';
    const inferEffectsCommand = 'effekt.inferEffects';
    const inferPassedEffectsCommand = 'effekt.inferPassedEffects';
    const getPassedCapabilitiesCommand = 'effekt.getPassedCapabilities';
    const getUnhandledCapabilitiesCommand = 'effekt.getUnhandledCapabilities';
    const getCapabilityReceiverCommand = 'effekt.getCapabilityReceiver';


    // Provide codelens for effekt files
    class effektCodeLensProvider implements CodeLensProvider {

        async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {

            let capabilitiesInfo = await getCapabilitiesInfo();
            return capabilitiesInfo.map(ca => {   
                let com: Command;
                if(ca.capabilityKind == "CapabilityBinder"){
                    com = {
                        command: showCapabilityOriginCommand,
                        title: 'Origin of <'+ca.capabilityName+'>',
                        arguments: [ca, capabilitiesInfo]
                    }
                } else {
                    com = {
                        command: clearAnnotationsCommand,
                        title: 'Scope of <'+ca.capabilityName+'>',
                        arguments: [{capabilityName: ca.capabilityName, scopeStart: ca.scopeRange.start, scopeEnd: ca.scopeRange.end}]
                    }
                }
                return new CodeLens(ca.sourceRange, com)
            })
        }

        async resolveCodeLens(codeLens: CodeLens, token: CancellationToken): Promise<CodeLens> {
            console.log("Resolving codelens ", codeLens);
            return codeLens;
        }
    }

    let codeLensProviderDisposable = languages.registerCodeLensProvider(
        [{
            scheme: 'file',
            language: 'effekt'
        }, {
            scheme: 'file',
            language: 'markdown'
        }],
        new effektCodeLensProvider()
      );

    context.subscriptions.push(codeLensProviderDisposable);

    // Provide hover for effekt files
    class effektHoverProvider implements HoverProvider {
        async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | null | undefined> 
        {
            let capabilitiesInfo = await getCapabilitiesInfo();
            // return a hover with the capability name of the first capability that matches the position
            let hover = capabilitiesInfo.filter(ca => {
                return ca.sourceRange.start.line <= position.line && ca.sourceRange.end.line >= position.line;
            })[1];
            if(hover){
                return new Hover(hover.capabilityName, hover.sourceRange);
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



    class Capability {
        constructor(){
            this.name = "";
        }
        name: string;
        scopeStart: any;
        scopeEnd: any;
    }

    class CapabilityHint {
        constructor(){
            this.capabilities = [];
            this.capabilityIDs = null;
            this.line = 0;
            this.column = 0;
        }
        capabilities: Array<Capability>;
        capabilityIDs: any;
        line: number;
        column: number;
    }

    /**
     * Get the column of the last character in the given line.
     * @param line line number of which we want the last characters column
     * @returns the column number of the last character of that line or the number "8000" if undefined
     */
    function getEndOfLine(line: number) {
        let endCol = editor?.document.lineAt(line).range.end.character;
        return endCol? endCol : 8000;
    }

    function stripCapabilityName(capabilityName: string) {
        return capabilityName.replace(/\$capability/g, '');
    }

    function stripCapabilityNames(capabilityNames: Array<string>) {
        let res = "";
        if(capabilityNames.length > 0){
            res = capabilityNames.toString();
            res = stripCapabilityName(res);
        }
        return res;
    }

    // CapabilityInfo(capabilityKind: String, capabilityName: String, sourceRange: LSPRange, scopeRange: LSPRange)
    class CapabilityInfo {
        constructor(obj: {capabilityKind: string, capabilityName: string, sourceRange: Range, scopeRange: Range}){
            this.capabilityKind = obj.capabilityKind;
            this.capabilityName = obj.capabilityName;
            this.sourceRange = new Range(obj.sourceRange.start.line, obj.sourceRange.start.character, obj.sourceRange.end.line, obj.sourceRange.end.character);
            this.scopeRange = new Range(obj.scopeRange.start.line, obj.scopeRange.start.character, obj.scopeRange.end.line, obj.scopeRange.end.character);
        }
        capabilityKind: string;
        capabilityName: string;
        sourceRange: Range;
        scopeRange: Range;
    }




    const capabilityBinderDecoration = window.createTextEditorDecorationType({
        borderRadius: '4pt'
    });

    function displayCapabilityBinders(capabilityBinders: CapabilityInfo[]){

        let decorations: DecorationOptions[] = [];

        capabilityBinders.forEach(cb => {
            let binderDecorationPosition = new Range(cb.sourceRange.start, cb.sourceRange.end)

            const decoration: DecorationOptions = { 
                range: binderDecorationPosition,
                renderOptions: {
                    after: {
                        // contentText:  ' '+ cb.capabilityName +' =>',
                        fontStyle: "bold"
                    },
                    light: {
                        after: {
                            color: "rgb(194, 194, 194)"
                        }
                    },
                    dark: {
                        after: {
                            color: "rgb(102, 102, 102)"
                        }
                    }
                }
            };
            decorations.push(decoration);
        })

        editor?.setDecorations(capabilityBinderDecoration, decorations) 
    }

    const capabilityReceiverDecoration = window.createTextEditorDecorationType({
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(206, 224, 220,0.05)"},
        dark: { backgroundColor: "rgba(180,130,145,0.05)"},
    });

    function displayCapabilityReceivers(capabilityReceivers: CapabilityInfo[]){
        capabilityReceivers.forEach(cr => {
            capabilityScopes.push({capabilityName: cr.capabilityName, hoverRange: cr.sourceRange, scopeRange: cr.scopeRange})
        })

        //let decoRanges = capabilityArguments.map(ca => ca.sourceRange)
        let decorations: DecorationOptions[] = [];

        capabilityReceivers.forEach(ca => {
            const decoration: DecorationOptions = { 
                range: ca.sourceRange,
                renderOptions: {
                    after: {
                        contentText: ' Ξ',
                        fontStyle: "bold"
                    },
                    light: {
                        after: {
                            color: "rgb(165, 36, 61)"
                        }
                    },
                    dark: {
                        after: {
                            color: "rgb(180, 130, 145)"
                        }
                    }
                }
            };
            decorations.push(decoration);
        })
        
        editor?.setDecorations(capabilityReceiverDecoration, decorations)
    }



    const capabilityArgumentDecoration = window.createTextEditorDecorationType({
        borderRadius: '4pt',
    });

    function displayCapabilityArguments(capabilityArguments: CapabilityInfo[]){
        capabilityArguments.forEach(ca => {
            capabilityScopes.push({capabilityName: ca.capabilityName, hoverRange: ca.sourceRange, scopeRange: ca.scopeRange})
        })

        //let decoRanges = capabilityArguments.map(ca => ca.sourceRange)
        let decorations: DecorationOptions[] = [];

        capabilityArguments.forEach(ca => {
            const decoration: DecorationOptions = { 
                range: ca.sourceRange,
                renderOptions: {
                    after: {
                        contentText: ' Ξ',
                        fontStyle: "bold"
                    },
                    light: {
                        after: {
                            color: "rgb(36, 165, 140)"
                        }
                    },
                    dark: {
                        after: {
                            color: "rgb(130, 180, 162)"
                        }
                    }
                }
            };
            decorations.push(decoration);
        })
        
        editor?.setDecorations(capabilityArgumentDecoration, decorations)
    }

    /**
     * Visualize capability infos depending on their capabilityKind
     * @param response an array of capability infos
     */
    function displayCapabilitiesInfo(response: CapabilityInfo[]) {
        capabilityScopes = [];
        displayCapabilityBinders(response.filter(r => r.capabilityKind == "CapabilityBinder"));
        displayCapabilityReceivers(response.filter(r => r.capabilityKind == "CapabilityReceiver"));
        displayCapabilityArguments(response.filter(r => r.capabilityKind == "CapabilityArgument"));
    }
    

    /**
     * asynchronously request the LSP server for info on capabilities (introductions, binding sites, scopes etc.) and store that info for visualisation
     */
    async function getCapabilitiesInfo() {
        let infos = client.sendRequest(ExecuteCommandRequest.type, { command: "getCapabilitiesInfo", arguments: [editor?.document.uri.toString()]}).then(
                response_json => {
                    console.log("Response raw:\n", response_json)
                    var response = JSON.parse(response_json as string) as CapabilityInfo[];
                    let capabilitiesInfo = response.map(element => {
                        return(new CapabilityInfo(element))
                    });
                    console.log("CapabilitiesInfo:\n", capabilitiesInfo);
                    // globalCapabilitiesInfo = capabilitiesInfo
                    displayCapabilitiesInfo(capabilitiesInfo);
                    return capabilitiesInfo;
                }
            );
        return infos
    }




    async function getPassedCapabilitiesHandler() {
        var pos = editor?.selection.active;
        if(pos){
            client.sendRequest(ExecuteCommandRequest.type, { command: "getPassedCapabilities", arguments: [editor?.document.uri.toString()]} ).then(
                (val) => {
                    console.log("Unbekannter return type: " + typeof(val));
                    console.log(JSON.stringify(val, undefined, 2));
                    var res = JSON.parse(val as string);
                    //var res = Object.assign({ 'value': Array}, val);
                    console.log(res);
                    console.log(typeof(res));
                    let decorations: Array<DecorationOptions> = [];
                    
                    capabilityScopes = [];

                    res.forEach((e: CapabilityHint) => {
                        console.log("Decorating passed capability ", e);
                        let endCol = getEndOfLine(e.line-1);
                        console.log("EndCol: ", endCol);
                        let startPos = new Position(e.line-1, endCol);
                        let endPos = new Position(e.line-1, endCol + e.capabilities.toString().length);
                        
                        var arg = [{IDs: e.capabilities, scopeStart: e.capabilities[0].scopeStart, scopeEnd: e.capabilities[0].scopeEnd}]; //[{message: stripCapabilityNames(e.capabilities)}];

                        const commandUri = Uri.parse(`command:effekt.clearAnnotations?${encodeURIComponent(JSON.stringify(arg))}`);
                        let messageString = new MarkdownString(`[Show capability scope](${commandUri})`);
                        messageString.isTrusted = true;
                        console.log("Appending command: ", commandUri);

                        e.capabilities.forEach(capability => {
                            const decoration: DecorationOptions = { range: new Range(startPos, endPos),
                                renderOptions: {
                                    after: {
                                        contentText: '<' + stripCapabilityNames([capability.name]) + '>',
                                        backgroundColor: "rgba(211, 211, 211,0.4)",
                                        color: "rgb(80,80,80)"
                                    }
                                },
                                hoverMessage: [messageString, "Hello, Hover Message"] };
                            decorations.push(decoration);
                        });

                        console.log("Scope start:", e.capabilities[0].scopeStart, ", type:", typeof(e.capabilities[0].scopeStart))

                        let scopeStart = new Position(e.capabilities[0].scopeStart.line-1, e.capabilities[0].scopeStart.column-1)
                        let scopeEnd = new Position(e.capabilities[0].scopeEnd.line-1, e.capabilities[0].scopeEnd.column-1)

                        let scope = {
                            capabilityName: "TEEEEEEEEEEEST",
                            hoverRange: new Range(new Position(e.line-1, 0), new Position(e.line-1, endCol)),
                            scopeRange: new Range(scopeStart, scopeEnd)
                        }
                        console.log("About to push a capabilty scope: ");
                        capabilityScopes.push(scope);
                        console.log("Pushed capability scope:", capabilityScopes);

                        
                    });
                    editor?.setDecorations(effectDecoration, decorations);
                    console.log("########### TAB SIZE:", window.activeTextEditor?.options.tabSize, "Insert spaces:", window.activeTextEditor?.options.insertSpaces);
                }
            );
        }
    };

    const inferPassedEffectsHandler = () => {
        var pos = editor?.selection.active;
        if(pos){
            client.sendRequest(ExecuteCommandRequest.type, { command: "getCapabilityArguments", arguments: [pos, editor?.document.uri.toString()]} ).then(
                (val) => {
                    console.log("Unbekannter return type: " + typeof(val));
                    console.log(JSON.stringify(val, undefined, 2));
                    var res = JSON.parse(val as string);
                    //var res = Object.assign({ 'value': Array}, val);
                    console.log(res);
                    console.log(typeof(res))
                    const quickPick = window.createQuickPick();
                    // quickPick.items = [{label: "Info", description: res.eff.toString()}];
                    
                    let itemList: QuickPickItem[] = [];
                    res.forEach((tpe: string) => itemList.push({label: "Info", description: tpe}));
                    quickPick.items = itemList;
                    quickPick.onDidHide(() => quickPick.dispose());
                    quickPick.show();
                    const decoration: DecorationOptions = { range: new Range(editor?.selection.active as Position, editor?.selection.active as Position),
                        renderOptions: {after: {contentText: res[0] + '>'}}, hoverMessage: 'Effects: '+res[0] };
                    editor?.setDecorations(effectDecoration, [decoration]);
                }
            );
        }
    };


    // use Annotations.CapabilityBinder in the server to identify capability binders
    const getUnhandledCapabilitiesHandler = () => {
        var pos = editor?.selection.active;
        if(pos){
            client.sendRequest(ExecuteCommandRequest.type, { command: "getUnhandledCapabilities", arguments: [editor?.document.uri.toString()]} ).then(
                (val) => {
                    console.log("Unbekannter return type: " + typeof(val));
                    console.log(JSON.stringify(val, undefined, 2));
                    var res = JSON.parse(val as string);
                    //var res = Object.assign({ 'value': Array}, val);
                    console.log(res);
                    console.log(typeof(res));
                    let decorations: Array<DecorationOptions> = [];
                    res.forEach((e: CapabilityHint) => {
                        console.log("Decorating unhandled capability ", e);
                        let endCol = getEndOfLine(e.line-1);
                        console.log("EndCol: ", endCol);
                        

                        var i = 0;
                        e.capabilities.forEach(capability => {
                            let startPos = new Position(e.line-1, endCol + i);
                            let endPos = new Position(e.line-1, endCol + capability.name.length);
                            i = capability.name.length + 1;
                            const decoration: DecorationOptions = { range: new Range(startPos, endPos),
                                renderOptions: {
                                    after: {
                                        contentText: '<' + stripCapabilityNames([capability.name]) + '>',
                                        backgroundColor: "rgba(200, 200, 200,0.4)",
                                        color: "rgb(160,80,80)"
                                    }
                                }, hoverMessage: 'Bound capability: '+ stripCapabilityNames([capability.name]) };
                            decorations.push(decoration);
                        });

                        
                    });
                    editor?.setDecorations(unhandledEffectDecoration, decorations);
                }
            );
        }
    };


    const getCapabilityReceiverHandler = () => {
        client.sendRequest(ExecuteCommandRequest.type, { command: "getCapabilityReceiver", arguments: [editor?.document.uri.toString()]} ).then(
            (val) => {
                console.log("Unbekannter return type: " + typeof(val));
                console.log(JSON.stringify(val, undefined, 2));
                var res = JSON.parse(val as string);
                //var res = Object.assign({ 'value': Array}, val);
                console.log(res);
                console.log(typeof(res));
                let decorations: Array<DecorationOptions> = [];
                res.forEach((e: CapabilityHint) => {
                    console.log("Decorating unhandled capability ", e);
                    let endCol = getEndOfLine(e.line-1);
                    console.log("EndCol: ", endCol);
                    let startPos = new Position(e.line-1, endCol);
                    let endPos = new Position(e.line-1, endCol + e.capabilities.toString().length);

                    e.capabilities.forEach(capability => {
                        const decoration: DecorationOptions = { range: new Range(startPos, endPos),
                            renderOptions: {
                                after: {
                                    contentText: '<' + stripCapabilityNames([capability.name]) + '>',
                                    backgroundColor: "rgba(200, 200, 200,0.4)",
                                    color: "rgb(160,80,80)"
                                }
                            }, hoverMessage: 'Bound capability: '+ stripCapabilityNames([capability.name]) };
                        decorations.push(decoration);
                    });

                    
                });
                editor?.setDecorations(unhandledEffectDecoration, decorations);
            }
        );
    }

    const inferEffectsHandler = () => {
        var pos = editor?.selection.active;
        console.log("Trying to fetch effects for position", pos);
        if(pos){
            var start = new Position(pos.line, pos.character-4);
            var end = new Position(pos.line, pos.character+4);
            var elem = editor?.document.getText(new Range(start, end));
            console.log(elem);

            client.sendRequest(ExecuteCommandRequest.type, { command: "getCapabilityBinders", arguments: [pos, editor?.document.uri.toString()]} ).then(
                    (val) => {
                        if(isString(val)){
                            console.log(val);
                        }
                        else {
                            console.log("Unbekannter return type: " + typeof(val));
                            console.log(JSON.stringify(val, undefined, 2));
                            var res = JSON.parse(val as string);
                            //var res = Object.assign({ 'value': Array}, val);
                            console.log(res);
                            console.log(typeof(res))
                            const quickPick = window.createQuickPick();
                            // quickPick.items = [{label: "Info", description: res.eff.toString()}];
                            
                            let itemList: QuickPickItem[] = [];
                            res.forEach((tpe: string) => itemList.push({label: "Info", description: tpe}));
                            quickPick.items = itemList;
                            quickPick.onDidHide(() => quickPick.dispose());
                            quickPick.show();
                        }
                    }
                );
        }
    };




    const scopeDecorationType = window.createTextEditorDecorationType({
        light: { backgroundColor: "rgba(180, 130, 145,0.25)"},
        dark: { backgroundColor: "rgba(185, 207, 212,0.25)"},
        
    });

    const showCapabilityOrigin = (capability: CapabilityInfo, capabilitiesInfo: CapabilityInfo[]) => {
        console.log("showCapabilityOrigin: ", capability);
        /** 
         * search for capabilities in globalCapabilitiesInfo that meet the following requirements:
         * 1. the capabilities name must match capability.CapabilityName
         * 2. the capabilities sourceRange must be in capability.scopeRange
         */

        let matches: Range[] = capabilitiesInfo.map(ca => {
            if(ca != capability && ca.capabilityName == capability.capabilityName && ca.capabilityKind != capability.capabilityKind){
                console.log("Found match: ", ca)
                try {    
                    if(capability.scopeRange.contains(ca.sourceRange)){
                        console.log("Highlighting capability");
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

    const commandHandler = (args: {capabilityName: string, scopeStart: any, scopeEnd: any}) => {
        console.log(args);
        console.log("Received parameter IDs:")

        let scopeRange = new Range(new Position(args.scopeStart.line, args.scopeStart.character),
            new Position(args.scopeEnd.line, args.scopeEnd.character)
        )
        const scopeDecoration: DecorationOptions = {
            range: scopeRange,
            hoverMessage: 'Scope of '+args.capabilityName 
        };
        
        
        console.log("Adding scope decoration from", {l: args.scopeStart.line, c: args.scopeStart.character}, "to", {l: args.scopeEnd.line, c: args.scopeEnd.character}  )
        editor?.setDecorations(scopeDecorationType, [scopeDecoration]);
    };

   
    context.subscriptions.push(commands.registerCommand(startClientCommand, () => {
        console.log("Starting client");
        console.log("Starting language server client with options:\n", serverOptions);
        context.subscriptions.push(client.start());
        console.log("Client started:", client.diagnostics);
    }));


       
    context.subscriptions.push(commands.registerCommand(stopClientCommand, () => {
        console.log("Stopping client");
        client.stop().then(() => {
            console.log("Client stopped");
        });
    }));
    
    context.subscriptions.push(commands.registerCommand(clearAnnotationsCommand, commandHandler));
    context.subscriptions.push(commands.registerCommand(showCapabilityOriginCommand, showCapabilityOrigin))
    context.subscriptions.push(commands.registerCommand(inferEffectsCommand, inferEffectsHandler));
    context.subscriptions.push(commands.registerCommand(inferPassedEffectsCommand, inferPassedEffectsHandler));
    context.subscriptions.push(commands.registerCommand(getPassedCapabilitiesCommand, getPassedCapabilitiesHandler));
    context.subscriptions.push(commands.registerCommand(getUnhandledCapabilitiesCommand, getUnhandledCapabilitiesHandler));
    context.subscriptions.push(commands.registerCommand(getCapabilityReceiverCommand, getCapabilityReceiverHandler));
   
    console.log("Exec Args: " + execArgv);

    context.subscriptions.push(client.start());


}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

