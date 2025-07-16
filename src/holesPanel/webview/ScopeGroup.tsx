import React from 'react';
import {
  ScopeInfo,
  BindingInfo,
  BINDING_ORIGIN_DEFINED,
  BINDING_ORIGIN_IMPORTED,
} from '../effektHoleInfo';
import { BindingItem } from './BindingItem';

interface ScopeGroupProps {
  scope: ScopeInfo;
  filteredBindings: BindingInfo[];
  groupIndex: number;
}

export const ScopeGroup: React.FC<ScopeGroupProps> = ({
  scope,
  filteredBindings,
  groupIndex,
}) => {
  const defined = scope.bindings.filter(
    (b) => b.origin === BINDING_ORIGIN_DEFINED,
  );
  const imported = scope.bindings.filter(
    (b) => b.origin === BINDING_ORIGIN_IMPORTED,
  );

  const renderList = (list: BindingInfo[]) =>
    list
      .filter((b) => filteredBindings.includes(b))
      .map((b, bi) => (
        <BindingItem binding={b} key={`${scope.kind}-${groupIndex}-${bi}`} />
      ));

  if (![...renderList(defined), ...renderList(imported)].length) {
    return null;
  }

  return (
    <div className="scope-group" key={groupIndex}>
      {defined.some((b) => filteredBindings.includes(b)) && (
        <>
          <div>{renderList(defined)}</div>
        </>
      )}
      {imported.some((b) => filteredBindings.includes(b)) && (
        <>
          <div>{renderList(imported)}</div>
        </>
      )}
    </div>
  );
};
