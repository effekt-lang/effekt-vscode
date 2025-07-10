import React, { useState, useMemo } from 'react';
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
    return allBindings.filter((b) => {
      const text =
        b.kind === BINDING_KIND_TERM
          ? fullyQualifiedName(b as TermBinding) +
            ((b as TermBinding).type ? `: ${(b as TermBinding).type}` : '')
          : b.definition || b.name;
      const originOk =
        b.origin === BINDING_ORIGIN_DEFINED
          ? showDefined
          : b.origin === BINDING_ORIGIN_IMPORTED
            ? showImported
            : true;
      return text.toLowerCase().includes(filter.toLowerCase()) && originOk;
    });
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
