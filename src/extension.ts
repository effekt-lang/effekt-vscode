'use strict';
import { Uri, ExtensionContext, workspace, window, Range, DecorationOptions, languages, commands, Position, TextDocument, QuickPickItem, MarkdownString, IndentAction } from 'vscode';
import { ExecuteCommandRequest, HoverRequest, integer, LanguageClient, LanguageClientOptions, MarkedString, MarkupContent, StreamInfo, VersionedTextDocumentIdentifier } from 'vscode-languageclient';
import { Monto } from './monto';
import { platform } from 'os';
//import { symlinkSync } from 'fs';
import { execArgv } from 'process';
import * as rpc from "vscode-jsonrpc"
import { isString, print } from 'util';

const net = require('net');


let client: LanguageClient;
let listenerClient: LanguageClient;

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
            }
            // ,
            // debug: {
            //     command: effektCmd,
            //     args: args.concat(["--debug"]),
            //     options: {}
            // }
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

    const holeDelimiterDecoration = window.createTextEditorDecorationType({
        opacity: '0.5',
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(0,0,0,0.05)" },
        dark: { backgroundColor: "rgba(255,255,255,0.05)" }
    })


    // based on https://github.com/microsoft/vscode-extension-samples/blob/master/decorator-sample/src/extension.ts
    let timeout: NodeJS.Timer | undefined;
    let editor = window.activeTextEditor;

    // function scheduleDecorations() {
    //     if (timeout) { clearTimeout(timeout) }
    //     timeout = setTimeout(decorate, 50);
    // }

    const holeRegex = /<>|<{|}>/g
    const effectRegex = /\/ *[a-zA-Z]* *=|\/ *{ *[a-zA-Z]* *} =/g

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
            getCapabilitiesInfo();
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


    let capabilityScopes: { hoverRange: Range; scopeRange: Range; }[] = [];

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
                        IDs: [1],
                        scopeStart: v.scopeRange.start,
                        scopeEnd: v.scopeRange.end
                    });
                }
            }
        })
        if(removeScopeDecorations){
            editor?.setDecorations(scopeDecoration, []);
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

    console.log("Starting effekt server.");
    context.subscriptions.push(client.start());


    const clearAnnotationsCommand = 'effekt.clearAnnotations';
    const inferEffectsCommand = 'effekt.inferEffects';
    const inferPassedEffectsCommand = 'effekt.inferPassedEffects';
    const getPassedCapabilitiesCommand = 'effekt.getPassedCapabilities';
    const getUnhandledCapabilitiesCommand = 'effekt.getUnhandledCapabilities';
    const getCapabilityReceiverCommand = 'effekt.getCapabilityReceiver';

    class Name {
        parent: any;
        localName: string | undefined;
    }

    class Effect {
        name: Name | undefined;
        id: number | undefined;
        bitmap$0: boolean | undefined;
    }

    class UserFun {
        name: Name | undefined;
        tparams: {} | undefined;
        params: {} | undefined;
        ret: {} | undefined;
        decl: {} | undefined;
        id: number | undefined;
        bitmap$0: string | undefined;
    };

    class TypeAnnotation {
        column: number = 0;
        line: number = 0;
        effects: Effect[] = [];
    }

    class Annotation {
        column: number = 0;
        line: number = 0;
        content: string | undefined;
    }

    //list of all drawn Annotations of the current document
    let currentDocumentAnnotations: Annotation[] = [];

    currentDocumentAnnotations.includes = (element: Annotation, fromIndex?: number | undefined) => {
        var retval = false;
        currentDocumentAnnotations.forEach((ann, i, arr) => {
            if(ann.column === element.column && ann.line === element.line && ann.content === element.content){
                retval = true;
                return;
            }
        });
        return retval;
    };


    class EffectItem implements QuickPickItem {
        label: string = "";
        description: string | undefined;
    }

    class CapabilityType {
        eff: Effect | undefined;
    }

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
            this.capabilityName = stripCapabilityName(obj.capabilityName);
            this.sourceRange = obj.sourceRange;
            this.scopeRange = obj.scopeRange;
        }
        capabilityKind: string;
        capabilityName: string;
        sourceRange: Range;
        scopeRange: Range;
    }

    const capabilityBinderDecoration = window.createTextEditorDecorationType({
        opacity: '0.5',
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(127,127,127,0.05)", color: "rgba(0,255,0,1.0)"},
        dark: { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(0,255,0,1.0)" },
    });

    function displayCapabilityBinders(capabilityBinders: CapabilityInfo[]){

        
    }

    const capabilityReceiverDecoration = window.createTextEditorDecorationType({
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(206, 224, 220,0.05)"},
        dark: { backgroundColor: "rgba(180,130,145,0.05)"},
    });

    function displayCapabilityReceivers(capabilityReceivers: CapabilityInfo[]){
        capabilityReceivers.forEach(cr => {
            capabilityScopes.push({hoverRange: cr.sourceRange, scopeRange: cr.scopeRange})
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
        opacity: '0.5',
        borderRadius: '4pt',
        light: { backgroundColor: "rgba(127,127,127,0.05)", color: "rgba(0,255,0,1.0)"},
        dark: { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(0,255,0,1.0)" },
        after: {
            contentText: "<!>"
        }
    });

    function displayCapabilityArguments(capabilityArguments: CapabilityInfo[]){
        capabilityArguments.forEach(ca => {
            capabilityScopes.push({hoverRange: ca.sourceRange, scopeRange: ca.scopeRange})
        })

        //let decoRanges = capabilityArguments.map(ca => ca.sourceRange)
        let decorations: DecorationOptions[] = [];

        capabilityArguments.forEach(ca => {
            const decoration: DecorationOptions = { 
                range: ca.sourceRange,
                renderOptions: {
                    after: {
                        contentText: '<' + ca.capabilityName + '>',
                        backgroundColor: "rgba(211, 211, 211,0.4)",
                        color: "rgb(80,80,80)"
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
        client.sendRequest(ExecuteCommandRequest.type, { command: "getCapabilitiesInfo", arguments: [editor?.document.uri.toString()]}).then(
            response_json => {
                console.log("Response raw:\n", response_json)
                var response = JSON.parse(response_json as string) as CapabilityInfo[];
                let capabilitiesInfo = response.map(element => {
                    return(new CapabilityInfo(element))
                });
                console.log("CapabilitiesInfo:\n", capabilitiesInfo);
                displayCapabilitiesInfo(capabilitiesInfo);
            }
        )
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

                    res.forEach(element => {
                        var e = (element as CapabilityHint);
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
                    res.forEach((tpe) => itemList.push({label: "Info", description: tpe}));
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
                    res.forEach(element => {
                        var e = (element as CapabilityHint);
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
                res.forEach(element => {
                    var e = (element as CapabilityHint);
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
                            res.forEach((tpe) => itemList.push({label: "Info", description: tpe}));
                            quickPick.items = itemList;
                            quickPick.onDidHide(() => quickPick.dispose());
                            quickPick.show();
                        }
                    }
                );
        }
    };




    const scopeDecoration = window.createTextEditorDecorationType({
        light: { backgroundColor: "rgba(180, 130, 145,0.25)"},
        dark: { backgroundColor: "rgba(185, 207, 212,0.25)"},
    });

    const commandHandler = (args: {IDs: [any], scopeStart: any, scopeEnd: any}) => {
        console.log(args);
        console.log("Received parameter IDs:")
        args.IDs.forEach((element: { id: any; }) => {
            console.log(element.id);
        });
        let scopeRange = new Range(new Position(args.scopeStart.line, args.scopeStart.character),
            new Position(args.scopeEnd.line, args.scopeEnd.character)
        )
        console.log("Adding scope decoration from", {l: args.scopeStart.line, c: args.scopeStart.character}, "to", {l: args.scopeEnd.line, c: args.scopeEnd.character}  )
        editor?.setDecorations(scopeDecoration, [scopeRange]);
    };

    var currentTypeAnnotations: TypeAnnotation[] = [];

    const typeAnnotationDecorationType = window.createTextEditorDecorationType({
        cursor: 'crosshair',
        // use a themable color. See package.json for the declaration and default values.
        backgroundColor: { id: 'myextension.largeNumberBackground' },
        after: {
            border: "1px solid black",
            backgroundColor: "rgba(190, 170, 170, 0.6)",
            color: "black"
        }
    });
    

    function addTypeAnnotations(annotations: TypeAnnotation[]){
        // reset type annotations
        editor?.setDecorations(effectDecoration, []);
        // and then set the current type annotations
        const typeAnnotationDecorationOptions: DecorationOptions[] = [];
        let lc = editor?.document.lineCount;
        annotations.forEach((value) => {
            let myobj: TypeAnnotation = Object.assign(new TypeAnnotation(), value);
            myobj.effects.forEach((e, i, arr) => {
                if(lc && myobj.line-1 < lc){
                    var ann = new Annotation();
                    ann.content = e.name?.localName;
                    ann.column = myobj.column;
                    ann.line = myobj.line;

                    //if(!currentDocumentAnnotations.includes(ann)){
                    //currentDocumentAnnotations.push(ann);
                    var startPos = new Position(myobj.line-1, myobj.column-1);
                    var endPos = new Position(myobj.line-1, myobj.column-1);
                    const decoration: DecorationOptions = { range: new Range(startPos, endPos),
                                renderOptions: {after: {contentText: ann.content}}, hoverMessage: 'Effects: '+ann.content };
                    typeAnnotationDecorationOptions.push(decoration);
                }
            });
            
        });
        editor?.setDecorations(effectDecoration, typeAnnotationDecorationOptions);
    }

    context.subscriptions.push(commands.registerCommand(clearAnnotationsCommand, commandHandler));
    context.subscriptions.push(commands.registerCommand(inferEffectsCommand, inferEffectsHandler));
    context.subscriptions.push(commands.registerCommand(inferPassedEffectsCommand, inferPassedEffectsHandler));
    context.subscriptions.push(commands.registerCommand(getPassedCapabilitiesCommand, getPassedCapabilitiesHandler));
    context.subscriptions.push(commands.registerCommand(getUnhandledCapabilitiesCommand, getUnhandledCapabilitiesHandler));
    context.subscriptions.push(commands.registerCommand(getCapabilityReceiverCommand, getCapabilityReceiverHandler));
    // if (startedInDebugMode() && !remoteDebugMode) {
    //     /*Effekt server should have been started with "--debug" flag and should be listening on a port.
    //         Hence we start a second process for listening on that port. */

    //     listenerClient = new LanguageClient(
    //         'effektLanguageServerDebug',
    //         'Effekt Language Server Debug',
    //         () => {
    //             // Connect to language server via socket
    //             let socket: any = net.connect({ port: debugPort }); //defaults to 5007
    //             let result: StreamInfo = {
    //                 writer: socket,
    //                 reader: socket
    //             };
    //             return Promise.resolve(result);
    //         },
    //         clientOptions
    //     );

    //     console.log("Effekt server was started in debug mode - trying to listen on port " + debugPort + ".");
    //     context.subscriptions.push(listenerClient.start());
    // }

    console.log("Exec Args: " + execArgv);

    client.onNotification(ExecuteCommandRequest.type, () => console.log("Bla"));
    client.onRequest(ExecuteCommandRequest.type, () => console.log("Bla"));


}

export function deactivate(): Thenable<void> | undefined {
    if (listenerClient){
        listenerClient.stop();
    }
    if (!client) {
        return undefined;
    }
    return client.stop();
}

