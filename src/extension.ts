'use strict';

import { ExtensionContext, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient';
import { Monto } from './monto';

let client: LanguageClient;

export function activate(context: ExtensionContext) {

    let config = workspace.getConfiguration("effekt");

    let folders = workspace.workspaceFolders || []

    let effektCmd = config.get<string>("executable") || "effekt"

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
        documentSelector: [
            {
                scheme: 'file',
                language: 'effekt'
            }
        ],
        diagnosticCollectionName: "effekt"
    };

    client = new LanguageClient(
        'effektLanguageServer',
        'Effekt Language Server',
        serverOptions,
        clientOptions
    );

    Monto.setup("effekt", context, client);

    context.subscriptions.push(client.start());
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
