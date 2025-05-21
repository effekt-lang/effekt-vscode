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
  // import from lib
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
