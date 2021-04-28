'use strict';

import { ExtensionContext, workspace, window, Range, DecorationOptions, languages, commands, Position, TextDocument, QuickPickItem } from 'vscode';
import { ExecuteCommandRequest, HoverRequest, integer, LanguageClient, LanguageClientOptions, StreamInfo, VersionedTextDocumentIdentifier } from 'vscode-languageclient';
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

    function decorateTypeAnnotations(document: TextDocument) {
        if (editor?.document.languageId === "effekt") {
            client.sendRequest(ExecuteCommandRequest.type, { command: "getTypeAnnotations", arguments: [document.uri.toString()] }).then(
                (val) => {
                    console.log("getTypeAnnotations return type: " + typeof (val));
                    //console.log(JSON.stringify(val, undefined, 2));
                    var objArray = val as Array<TypeAnnotation>;
                    addTypeAnnotations(objArray);
                }
            );
        }
    }

    // workspace.onDidSaveTextDocument(document => {
    //     decorateTypeAnnotations(document);
    // });


    // window.onDidChangeActiveTextEditor(ed => {
    //     editor = ed;
    //     scheduleDecorations();
    // }, null, context.subscriptions);

    // workspace.onDidChangeTextDocument(event => {
    //     if (editor && event.document === editor.document) {
    //         //reset all decorations first
    //         currentDocumentAnnotations = [];
    //         scheduleDecorations();
    //     }
    // }, null, context.subscriptions);

    //scheduleDecorations();

    function updateDecorations() {
        if (!editor) {
            return;
        }

        decorateTypeAnnotations(editor.document);
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

    window.onDidChangeActiveTextEditor(ed => {
        editor = ed;
        if (editor) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    workspace.onDidChangeTextDocument(event => {
        if (editor && event.document === editor.document) {
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

    const inferPassedEffectsHandler = () => {
        var pos = editor?.selection.active;
        if(pos){
            client.sendRequest(ExecuteCommandRequest.type, { command: "getCapabilityArguments", arguments: [pos, editor?.document.uri.toString()]} ).then(
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
    }

    const inferEffectsHandler = () => {
        var pos = editor?.selection.active;
        console.log("Trying to fetch effects for position", pos);
        if(pos){
            var start = new Position(pos.line, pos.character-4);
            var end = new Position(pos.line, pos.character+4);
            var elem = editor?.document.getText(new Range(start, end));
            console.log(elem);

            client.sendRequest(ExecuteCommandRequest.type, { command: "println", arguments: [elem]}).then(
                (val) => {
                    if(isString(val)){
                        console.log(val);
                    }
                    else {
                        console.log("Unbekannter return type: " + typeof(val));
                        console.log(val);
                    }
                }
            );

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

    const commandHandler = (message: string = 'Hello') => {
        console.log(`Sending ${message} to server!!!`);
        editor?.setDecorations(effectDecoration, []);
        // client.sendRequest(ExecuteCommandRequest.type, { command: "getTypeAnnotations", arguments: [window.activeTextEditor?.document.uri.toString()]}).then(
        //     (val) => {
        //         if(isString(val)){
        //             console.log(val);
        //         }
        //         else {
        //             console.log("Unbekannter return type: " + typeof(val));
        //             //console.log(JSON.stringify(val, undefined, 2));
        //             var objArray = val as Array<TypeAnnotation>;
        //             addTypeAnnotations(objArray);
        //         }
        //     }
        // );  //.then(() => console.log(message));
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
