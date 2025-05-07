import * as vscode from 'vscode';
import { LanguageClient, Protocol2CodeConverter } from 'vscode-languageclient/node';
import * as lsp from 'vscode-languageserver-protocol';

export class InlayHintProvider implements vscode.InlayHintsProvider {
    private client: LanguageClient;
    private converter: Protocol2CodeConverter;

    constructor(client: LanguageClient) {
        this.client = client;
        this.converter = client.protocol2CodeConverter;
    }

    async provideInlayHints(
        document: vscode.TextDocument,
        range: vscode.Range,
        _token: vscode.CancellationToken
    ): Promise<vscode.InlayHint[]> {
        const config = vscode.workspace.getConfiguration('effekt');
        const showCaptureHints = config.get<boolean>('inlayHints.captures', true);

        // Check if inlay hints are globally disabled (VSCode settings)
        const editorHintsEnabled = vscode.workspace.getConfiguration('editor.inlayHints').get<string>('enabled', 'on');
        if (editorHintsEnabled === 'off') {
            return [];
        }

        // Fetch inlay hints from the language server
        const response = await this.client.sendRequest('textDocument/inlayHint', {
            textDocument: { uri: document.uri.toString() },
            range: {
                start: { line: range.start.line, character: range.start.character },
                end: { line: range.end.line, character: range.end.character }
            }
        }) as lsp.InlayHint[] | null | undefined;

        if (!response) {
            return [];
        }

        // Filter inlay hints based on user preferences
        const filteredResponse = response.filter(hint => {
            if (hint.data === 'capture' && !showCaptureHints) {
                return false;
            }
            return true;
        });

        // Convert filtered inlay hints using Protocol2CodeConverter
        const hints = await this.converter.asInlayHints(filteredResponse, _token);

        return hints || [];
    }
}