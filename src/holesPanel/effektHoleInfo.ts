import { Range as LSPRange } from 'vscode-languageserver-protocol';

export interface EffektHoleInfo {
  id: string;
  range: LSPRange;
  innerType?: string;
  expectedType?: string;
  scope: ScopeInfo;
}

export interface BindingInfo {
  qualifier: string[];
  name: string;
  origin: string; // "Defined" | "Imported"
  type?: string;
  definition?: string;
}

export interface ScopeInfo {
  name?: string;
  kind: string; // "Namespace" | "Local" | "Global"
  bindings: BindingInfo[];
  outer?: ScopeInfo;
}
export const ORIGIN_DEFINED = 'Defined';
export const ORIGIN_IMPORTED = 'Imported';
export const KIND_NAMESPACE = 'Namespace';
export const KIND_LOCAL = 'Local';
export const KIND_GLOBAL = 'Global';
