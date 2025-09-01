import React, { useState, useMemo, useRef, useEffect } from 'react';
import MiniSearch from 'minisearch';
import {
  ScopeInfo,
  BindingInfo,
  BINDING_ORIGIN_DEFINED,
  BINDING_ORIGIN_IMPORTED,
} from '../effektHoleInfo';
import { ScopeGroup } from './ScopeGroup';
import { FilterBox } from './FilterBox';
import { IncomingMessage } from './messages';

interface BindingsSectionProps {
  scope?: ScopeInfo;
  holeId: string;
  isActive: boolean;
  onJumpToDefinition: (binding: BindingInfo) => void;
}

export const BindingsSection: React.FC<BindingsSectionProps> = ({
  scope,
  holeId,
  isActive,
  onJumpToDefinition,
}) => {
  const [filter, setFilter] = useState('');
  const filterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // only focus searchbar when the panel has keyboard focus - prevents stealing editor focus
    if (isActive && document.hasFocus() && filterInputRef.current) {
      filterInputRef.current.focus();
    }
  }, [isActive]);

  useEffect(() => {
    const handler = (event: MessageEvent<IncomingMessage>) => {
      const msg = event.data;
      if (msg.command === 'focusPanel' && isActive) {
        filterInputRef.current!.focus();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isActive]);

  const allBindings = useMemo(() => {
    const scopes = flattenScopes(scope);
    return scopes.reduce<BindingInfo[]>((acc, s) => {
      return acc.concat(
        s.bindings.filter((b) => b.origin === BINDING_ORIGIN_DEFINED),
        s.bindings.filter((b) => b.origin === BINDING_ORIGIN_IMPORTED),
      );
    }, []);
  }, [scope]);

  const miniSearch = useMemo(() => {
    const search = new MiniSearch({
      fields: ['signature'],
      idField: 'id',
    });

    const searchableBindings = allBindings.map((b, index) => ({
      id: index,
      ...b,
      qualifier: b.qualifier.join('::'),
    }));

    search.addAll(searchableBindings);
    return search;
  }, [allBindings]);

  const filteredBindings = useMemo(() => {
    if (!filter.trim()) {
      return allBindings;
    }

    const searchResults = miniSearch.search(filter, {
      combineWith: 'AND',
      fuzzy: 0.2,
      prefix: true,
    });

    return searchResults.map((result) => allBindings[result.id]);
  }, [allBindings, filter, miniSearch]);

  const totalCount = allBindings.length;
  const filteredCount = filteredBindings.length;

  return (
    <div className="bindings-section" onClick={(e) => e.stopPropagation()}>
      <div
        className={`bindings-header${isActive ? '' : ' collapsed'}`}
        data-hole-id={holeId}
      >
        <span className="bindings-title">
          Bindings (<span>{filteredCount}</span>/<span>{totalCount}</span>)
        </span>
      </div>
      {isActive && (
        <div className="scopes-body">
          <FilterBox
            ref={filterInputRef}
            filter={filter}
            onFilterChange={setFilter}
          />
          <div className="scopes-list" id={`bindings-dropdown-list-${holeId}`}>
            {flattenScopes(scope).map((s, si) => (
              <ScopeGroup
                key={si}
                scope={s}
                filteredBindings={filteredBindings}
                groupIndex={si}
                onJumpToDefinition={onJumpToDefinition}
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
