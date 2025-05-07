import * as vscode from 'vscode';
import { Code2ProtocolConverter, LanguageClient, Protocol2CodeConverter } from 'vscode-languageclient/node';
import {
  InlayHintRequest,
  InlayHintParams,
  InlayHint as LspInlayHint
} from 'vscode-languageserver-protocol';

export class InlayHintProvider implements vscode.InlayHintsProvider {
  private client: LanguageClient;
  private protocol2code: Protocol2CodeConverter;
  private code2protocol : Code2ProtocolConverter;

  constructor(client: LanguageClient) {
    this.client = client;
    this.protocol2code = client.protocol2CodeConverter;
    this.code2protocol = client.code2ProtocolConverter;
  }

  async provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    _token: vscode.CancellationToken
  ): Promise<vscode.InlayHint[]> {
    const config = vscode.workspace.getConfiguration('effekt');
    const showCaptureHints = config.get<boolean>('inlayHints.captures', true);

    // bail out if user has disabled inlay hints
    const editorHintsEnabled = vscode.workspace
      .getConfiguration('editor.inlayHints')
      .get<string>('enabled', 'on');
    if (editorHintsEnabled === 'off') {
      return [];
    }

    // build an LSP‐style params object by converting from vscode types
    const params: InlayHintParams = {
      textDocument: this.code2protocol.asTextDocumentIdentifier(document),
      range:this.code2protocol.asRange(range)
    };

    // send a strongly‐typed LSP request
    const response = (await this.client.sendRequest(
      InlayHintRequest.type,
      params
    )) as LspInlayHint[] | null | undefined;

    if (!response) {
      return [];
    }

    // filter out unwanted hints before conversion
    const filtered = response.filter(h => {
      return !(h.data === 'capture' && !showCaptureHints);
    });

    // convert the filtered LSP hints to vscode.InlayHint
    const hints = await this.protocol2code.asInlayHints(filtered, _token);
    return hints || [];
  }
}