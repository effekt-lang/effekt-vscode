import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

export class InlayHintProvider implements vscode.InlayHintsProvider {
    private client: LanguageClient;

    constructor(client: LanguageClient) {
        this.client = client;
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
        }) as { position: { line: number, character: number }, label: string, kind?: vscode.InlayHintKind, tooltip?: string, data?: string }[];

        // Filter inlay hints based on user preferences
        const hints: vscode.InlayHint[] = [];
        for (const hint of response) {
            if (hint.data === 'capture' && !showCaptureHints) continue;

            const inlayHint = new vscode.InlayHint(
                new vscode.Position(hint.position.line, hint.position.character),
                hint.label
            );
            inlayHint.kind = hint.kind;
            inlayHint.tooltip = hint.tooltip;
            hints.push(inlayHint);
        }

        return hints;
    }
}