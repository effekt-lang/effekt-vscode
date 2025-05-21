import * as vscode from 'vscode';

export class EffektHolesContentProvider
  implements vscode.TextDocumentContentProvider
{
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  onDidChange?: vscode.Event<vscode.Uri> = this._onDidChange.event;

  private contents = new Map<string, string>();

  update(uri: vscode.Uri, content: string) {
    this.contents.set(uri.toString(), content);
    this._onDidChange.fire(uri);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contents.get(uri.toString()) || '';
  }
}

export function generateHolesContent(holes: EffektHoleInfo[]): string {
  console.log('generating content');

  if (!Array.isArray(holes)) {
    console.error('Invalid input: holes is not an array', holes);
    return 'Invalid holes data';
  }

  return holes
    .map((hole) => {
      // Make imported terms and types unique by name
      const uniqueImportedTerms = Array.from(
        new Map(hole.importedTerms.map((t) => [t.name, t])).values(),
      );
      const uniqueImportedTypes = Array.from(
        new Map(hole.importedTypes.map((t) => [t.name, t])).values(),
      );

      return (
        `ID: ${hole.id}\nRange: ${JSON.stringify(hole.range)}\n` +
        `Inner Type: ${hole.innerType || 'N/A'}\n` +
        `Expected Type: ${hole.expectedType || 'N/A'}\n` +
        `Imported Terms: ${uniqueImportedTerms.map((t) => t.name).join(', ')}\n` +
        `Imported Types: ${uniqueImportedTypes.map((t) => t.name).join(', ')}\n` +
        `Terms: ${hole.terms.map((t) => t.name).join(', ')}\n` +
        `Types: ${hole.types.map((t) => t.name).join(', ')}\n`
      );
    })
    .join('\n---\n');
}
export interface EffektHoleInfo {
  id: string;
  range: LSPRange;
  innerType?: string;
  expectedType?: string;
  importedTerms: TermBinding[];
  importedTypes: TypeBinding[];
  terms: TermBinding[];
  types: TypeBinding[];
}

export interface LSPRange {
  start: LSPPosition;
  end: LSPPosition;
}

export interface LSPPosition {
  line: number;
  character: number;
}

export interface TermBinding {
  name: string;
  type: string;
}

export interface TypeBinding {
  name: string;
  kind: string;
}
