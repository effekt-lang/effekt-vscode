'use strict';

import { ExtensionContext, workspace, window, Range, DecorationOptions, Location, ProgressLocation } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, ExecuteCommandRequest, StreamInfo } from 'vscode-languageclient';
import { Monto } from './monto';
import { platform } from 'os';
import * as net from 'net';
import * as cp from 'child_process';
import * as https from 'https';
import * as semver from 'semver';

let client: LanguageClient;

async function execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        cp.exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

async function getLatestNpmVersion(packageName: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(`https://registry.npmjs.org/${packageName}/latest`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.version);
                } catch (error) {
                    reject(new Error('Failed to parse npm registry response'));
                }
            });
        }).on('error', reject);
    });
}

async function checkAndInstallEffekt(): Promise<string> {
    const checkCommand = process.platform === 'win32' ? 'where' : 'which';
    
    try {
        // Check if Effekt is installed
        await execCommand(`${checkCommand} effekt`);
        const currentVersion = await execCommand('effekt --version');
        
        // Check for updates
        const latestVersion = await getLatestNpmVersion('effekt');
        const newVersionAvailable = semver.gt(latestVersion, currentVersion);

        if (newVersionAvailable) {
            const update = await window.showInformationMessage(
                `A new version of Effekt is available (${latestVersion}). Would you like to update?`,
                'Yes', 'No'
            );
            
            if (update === 'Yes') {
                await window.withProgress({
                    location: ProgressLocation.Notification,
                    title: "Updating Effekt",
                    cancellable: false
                }, async (progress) => {
                    try {
                        await execCommand('npm install -g effekt@latest');
                        window.showInformationMessage(`Effekt has been updated to version ${latestVersion}.`);
                        return latestVersion;
                    } catch (error) {
                        window.showErrorMessage('Failed to update Effekt. Please try updating manually.');
                        return currentVersion;
                    }
                });
            }
        }
        
        return currentVersion;
    } catch (error) {
        // Effekt not found, check for Node and npm
        try {
            await execCommand(`${checkCommand} node`);
            await execCommand(`${checkCommand} npm`);
        } catch (error) {
            window.showErrorMessage('Node.js and npm are required to install Effekt. Please install them first.');
            return '';
        }

        // Offer to install Effekt
        const latestVersion = await getLatestNpmVersion('effekt');
        const install = await window.showInformationMessage(
            `Effekt ${latestVersion} is available. Would you like to install it via npm?`,
            'Yes', 'No'
        );

        if (install === 'Yes') {
            return await window.withProgress({
                location: ProgressLocation.Notification,
                title: "Installing Effekt via npm",
                cancellable: false
            }, async (progress) => {
                try {
                    await execCommand('npm install -g effekt');
                    window.showInformationMessage(`Effekt ${latestVersion} has been installed successfully.`);
                    return latestVersion;
                } catch (error) {
                    window.showErrorMessage('Failed to install Effekt. Please try installing it manually.');
                    return '';
                }
            });
        }
    }
    return '';
}

export async function activate(context: ExtensionContext) {
    const effektVersion = await checkAndInstallEffekt();
    if (!effektVersion) {
        window.showWarningMessage('Effekt is not installed. LSP features may not work correctly.');
    }

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
