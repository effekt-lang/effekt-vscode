import { Range as LSPRange } from 'vscode-languageserver-protocol';

export interface EffektHoleInfo {
  id: string;
  range: LSPRange;
  innerType?: string;
  expectedType?: string;
  scope: ScopeInfo;
}

export type BindingOrigin =
  | typeof BINDING_ORIGIN_DEFINED
  | typeof BINDING_ORIGIN_IMPORTED;

export type BindingInfo = TermBinding | TypeBinding;

export interface TermBinding {
  qualifier: string[];
  name: string;
  origin: BindingOrigin;
  type?: string;
  kind: typeof BINDING_KIND_TERM;
}

export interface TypeBinding {
  qualifier: string[];
  name: string;
  origin: BindingOrigin;
  definition: string;
  kind: typeof BINDING_KIND_TYPE;
}

export type ScopeKind =
  | typeof SCOPE_KIND_NAMESPACE
  | typeof SCOPE_KIND_LOCAL
  | typeof SCOPE_KIND_GLOBAL;

export interface ScopeInfo {
  name?: string;
  kind: ScopeKind;
  bindings: BindingInfo[];
  outer?: ScopeInfo;
}

export const BINDING_ORIGIN_DEFINED = 'Defined';
export const BINDING_ORIGIN_IMPORTED = 'Imported';
export const SCOPE_KIND_NAMESPACE = 'Namespace';
export const SCOPE_KIND_LOCAL = 'Local';
export const SCOPE_KIND_GLOBAL = 'Global';
export const BINDING_KIND_TERM = 'Term';
export const BINDING_KIND_TYPE = 'Type';
