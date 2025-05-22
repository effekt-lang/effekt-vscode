import { Range as LSPRange } from 'vscode-languageserver-protocol';

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

export interface TermBinding {
  name: string;
  type: string;
}

export interface TypeBinding {
  name: string;
  kind: string;
}
