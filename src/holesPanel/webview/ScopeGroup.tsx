import React, { useMemo } from 'react';
import {
  ScopeInfo,
  BindingInfo,
  BINDING_ORIGIN_DEFINED,
  BINDING_ORIGIN_IMPORTED,
  SCOPE_KIND_GLOBAL,
  SCOPE_KIND_NAMESPACE,
} from '../effektHoleInfo';
import { BindingItem } from './BindingItem';
import { Location as LSPLocation } from 'vscode-languageserver-protocol';

interface ScopeGroupProps {
  scope: ScopeInfo;
  filteredSet: Set<BindingInfo>;
  groupIndex: number;
  selectedBindingIndex?: number | null;
  bindingStartIndex?: number;
  onJumpToDefinition: (definitionLocation: LSPLocation) => void;
}

export const ScopeGroup: React.FC<ScopeGroupProps> = React.memo(
  ({
    scope,
    filteredSet,
    groupIndex,
    selectedBindingIndex,
    bindingStartIndex = 0,
    onJumpToDefinition,
  }) => {
    const defined = useMemo(
      () => scope.bindings.filter((b) => b.origin === BINDING_ORIGIN_DEFINED),
      [scope.bindings],
    );
    const imported = useMemo(
      () => scope.bindings.filter((b) => b.origin === BINDING_ORIGIN_IMPORTED),
      [scope.bindings],
    );

    const definedFiltered = useMemo(
      () => defined.filter((b) => filteredSet.has(b)),
      [defined, filteredSet],
    );
    const importedFiltered = useMemo(
      () => imported.filter((b) => filteredSet.has(b)),
      [imported, filteredSet],
    );

    const renderList = (list: BindingInfo[], offset: number) =>
      list.map((b, bi) => {
        const absoluteIndex = offset + bi;
        const isSelected = selectedBindingIndex === absoluteIndex;

        return (
          <BindingItem
            binding={b}
            key={`${scope.kind}-${groupIndex}-${absoluteIndex}`}
            isSelected={isSelected}
            onJumpToDefinition={onJumpToDefinition}
          />
        );
      });

    const definedStart = bindingStartIndex;
    const importedStart = bindingStartIndex + definedFiltered.length;

    return (
      <div className="scope-group">
        {definedFiltered.length > 0 && (
          <>
            <div className="scope-label-line">
              <span className="scope-label-text">
                {scopeLabel(scope, false)}
              </span>
            </div>

            <div className="bindings-list">
              {renderList(definedFiltered, definedStart)}
            </div>
          </>
        )}
        {importedFiltered.length > 0 && (
          <>
            <div className="scope-label-line">
              <span className="scope-label-text">
                {scopeLabel(scope, true)}
              </span>
            </div>
            <div className="bindings-list">
              {renderList(importedFiltered, importedStart)}
            </div>
          </>
        )}
      </div>
    );
  },
);

function scopeLabel(scope: ScopeInfo, imported: boolean): string {
  let label: string;
  switch (scope.kind) {
    case SCOPE_KIND_GLOBAL:
      label = imported ? 'imports' : 'module';
      break;
    case SCOPE_KIND_NAMESPACE:
      label = 'namespace';
      break;
    default:
      label = 'local';
      break;
  }
  if (scope.name) {
    label += ` (${scope.name})`;
  }
  return label;
}
