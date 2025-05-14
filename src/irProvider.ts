import * as vscode from 'vscode';

export class EffektIRContentProvider
  implements vscode.TextDocumentContentProvider
{
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  onDidChange?: vscode.Event<vscode.Uri> = this._onDidChange.event;

  private contents: Map<string, string> = new Map();

  update(uri: vscode.Uri, content: string) {
    this.contents.set(uri.toString(), content);
    this._onDidChange.fire(uri);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contents.get(uri.toString()) || '';
  }
}
