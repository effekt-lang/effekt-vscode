import React from 'react';
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
  filteredBindings: BindingInfo[];
  groupIndex: number;
  selectedBindingIndex?: number | null;
  bindingStartIndex?: number;
  onJumpToDefinition: (definitionLocation: LSPLocation) => void;
}

export const ScopeGroup: React.FC<ScopeGroupProps> = ({
  scope,
  filteredBindings,
  groupIndex,
  selectedBindingIndex,
  bindingStartIndex = 0,
  onJumpToDefinition,
}) => {
  const defined = scope.bindings.filter(
    (b) => b.origin === BINDING_ORIGIN_DEFINED,
  );
  const imported = scope.bindings.filter(
    (b) => b.origin === BINDING_ORIGIN_IMPORTED,
  );

  const renderList = (list: BindingInfo[], isImported: boolean) => {
    let currentIndex = bindingStartIndex;

    if (isImported) {
      const definedBindings = scope.bindings.filter(
        (b) =>
          b.origin === BINDING_ORIGIN_DEFINED && filteredBindings.includes(b),
      );
      currentIndex += definedBindings.length;
    }

    return list
      .filter((b) => filteredBindings.includes(b))
      .map((b, bi) => {
        const isSelected = selectedBindingIndex === currentIndex + bi;

        return (
          <BindingItem
            binding={b}
            key={`${scope.kind}-${groupIndex}-${bi}`}
            isSelected={isSelected}
            onJumpToDefinition={onJumpToDefinition}
          />
        );
      });
  };
  if (![...renderList(defined, false), ...renderList(imported, true)].length) {
    return null;
  }

  return (
    <div className="scope-group">
      {defined.some((b) => filteredBindings.includes(b)) && (
        <>
          <div className="scope-label-line">
            <span className="scope-label-text">{scopeLabel(scope, false)}</span>
          </div>

          <div className="bindings-list">{renderList(defined, false)}</div>
        </>
      )}
      {imported.some((b) => filteredBindings.includes(b)) && (
        <>
          <div className="scope-label-line">
            <span className="scope-label-text">{scopeLabel(scope, true)}</span>
          </div>
          <div className="bindings-list">{renderList(imported, true)}</div>
        </>
      )}
    </div>
  );
};

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
