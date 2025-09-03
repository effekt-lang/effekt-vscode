import {
  Range as LSPRange,
  Location as LSPLocation,
} from 'vscode-languageserver-protocol';

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

export interface DefinitionLocation {
  uri: string;
  range: LSPRange;
}

export interface TermBinding {
  qualifier: string[];
  name: string;
  origin: BindingOrigin;
  signature?: string;
  signatureHtml?: string;
  uri?: string;
  kind: typeof BINDING_KIND_TERM;
  definitionLocation?: LSPLocation;
}

export interface TypeBinding {
  qualifier: string[];
  name: string;
  origin: BindingOrigin;
  signature?: string;
  signatureHtml?: string;
  uri?: string;
  kind: typeof BINDING_KIND_TYPE;
  definitionLocation?: LSPLocation;
}

export function fullyQualifiedName(binding: TermBinding | TypeBinding): string {
  return [...binding.qualifier, binding.name].join('::');
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
