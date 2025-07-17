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
import { FilterMenu } from './FilterMenu';
import { FilterBox } from './FilterBox';

interface BindingsSectionProps {
  scope?: ScopeInfo;
  holeId: string;
}

const isOriginAllowed = (
  binding: BindingInfo,
  showDefined: boolean,
  showImported: boolean,
): boolean => {
  if (binding.origin === BINDING_ORIGIN_DEFINED) {
    return showDefined;
  }
  if (binding.origin === BINDING_ORIGIN_IMPORTED) {
    return showImported;
  }
  return true;
};

export const BindingsSection: React.FC<BindingsSectionProps> = ({
  scope,
  holeId,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showDefined, setShowDefined] = useState(true);
  const [showImported, setShowImported] = useState(false);
  const [filter, setFilter] = useState('');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [filterBoxOpen, setFilterBoxOpen] = useState(false);

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
    // Apply origin filtering first
    const originFiltered = allBindings.filter((b) =>
      isOriginAllowed(b, showDefined, showImported),
    );

    // If no search text, return origin-filtered results
    if (!filter.trim()) {
      return originFiltered;
    }

    // Apply fuzzy search to origin-filtered results
    const searchableBindings = originFiltered.map((b) => {
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
  }, [allBindings, filter, showDefined, showImported]);

  const totalCount = allBindings.length;
  const filteredCount = filteredBindings.length;

  return (
    <div className="bindings-section">
      <div
        className={`bindings-header${expanded ? '' : ' collapsed'}`}
        onClick={() => setExpanded((e) => !e)}
        data-hole-id={holeId}
      >
        <span className="bindings-toggle">&#9660;</span>
        <span className="bindings-title">
          Bindings (<span>{filteredCount}</span>/<span>{totalCount}</span>)
        </span>
        <button
          className="filter-toggle-btn"
          title="Search"
          onClick={(e) => {
            e.stopPropagation();
            if (!expanded) {
              setExpanded(true);
            }
            setFilterBoxOpen((f) => !f);
          }}
        >
          <i className="codicon codicon-search" />
        </button>
        <button
          className="filter-toggle-btn"
          title="Filter"
          onClick={(e) => {
            e.stopPropagation();
            if (!expanded) {
              setExpanded(true);
            }
            setFilterMenuOpen((m) => !m);
          }}
        >
          <i className="codicon codicon-filter" />
        </button>
      </div>
      {expanded && (
        <div className="bindings-body">
          {filterMenuOpen && (
            <FilterMenu
              showDefined={showDefined}
              showImported={showImported}
              onToggleDefined={setShowDefined}
              onToggleImported={setShowImported}
            />
          )}
          {filterBoxOpen && (
            <FilterBox filter={filter} onFilterChange={setFilter} />
          )}
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
