import React, { useState, useMemo } from 'react';
import fuzzysort from 'fuzzysort';
import {
  ScopeInfo,
  BindingInfo,
  BINDING_ORIGIN_DEFINED,
  BINDING_ORIGIN_IMPORTED,
  TermBinding,
  fullyQualifiedName,
  BINDING_KIND_TERM,
} from '../effektHoleInfo';
import { ScopeGroup } from './ScopeGroup';
import { FilterBox } from './FilterBox';

interface BindingsSectionProps {
  scope?: ScopeInfo;
  holeId: string;
  isActive: boolean;
}

export const BindingsSection: React.FC<BindingsSectionProps> = ({
  scope,
  holeId,
  isActive,
}) => {
  const [filter, setFilter] = useState('');

  const allBindings = useMemo(() => {
    const scopes = flattenScopes(scope);
    return scopes.reduce<BindingInfo[]>((acc, s) => {
      return acc.concat(
        s.bindings.filter((b) => b.origin === BINDING_ORIGIN_DEFINED),
        s.bindings.filter((b) => b.origin === BINDING_ORIGIN_IMPORTED),
      );
    }, []);
  }, [scope]);

  const filteredBindings = useMemo(() => {
    // If no search text, return all bindings
    if (!filter.trim()) {
      return allBindings;
    }

    // Apply fuzzy search to all bindings
    const searchableBindings = allBindings.map((b) => {
      const text =
        b.kind === BINDING_KIND_TERM
          ? fullyQualifiedName(b as TermBinding) +
            ((b as TermBinding).type ? `: ${(b as TermBinding).type}` : '')
          : b.definition || b.name;
      return { binding: b, text };
    });

    const fuzzyResults = fuzzysort.go(filter, searchableBindings, {
      key: 'text',
    });

    return fuzzyResults.map((result) => result.obj.binding);
  }, [allBindings, filter]);

  const totalCount = allBindings.length;
  const filteredCount = filteredBindings.length;

  return (
    <div className="bindings-section">
      <div
        className={`bindings-header${isActive ? '' : ' collapsed'}`}
        data-hole-id={holeId}
      >
        <span className="bindings-toggle">&#9660;</span>
        <span className="bindings-title">
          Bindings (<span>{filteredCount}</span>/<span>{totalCount}</span>)
        </span>
      </div>
      {isActive && (
        <div className="bindings-body">
          <FilterBox filter={filter} onFilterChange={setFilter} />
          <div
            className="bindings-list"
            id={`bindings-dropdown-list-${holeId}`}
          >
            {flattenScopes(scope).map((s, si) => (
              <ScopeGroup
                key={si}
                scope={s}
                filteredBindings={filteredBindings}
                groupIndex={si}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function flattenScopes(scope?: ScopeInfo): ScopeInfo[] {
  const scopes: ScopeInfo[] = [];
  let current = scope;
  while (current) {
    scopes.push(current);
    current = current.outer;
  }
  return scopes;
}
