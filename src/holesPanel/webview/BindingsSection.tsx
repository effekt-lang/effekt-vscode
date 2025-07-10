import React, { useState, useMemo } from 'react';
import {
  ScopeInfo,
  BindingInfo,
  TermBinding,
  SCOPE_KIND_GLOBAL,
  SCOPE_KIND_NAMESPACE,
  BINDING_ORIGIN_DEFINED,
  BINDING_ORIGIN_IMPORTED,
} from '../effektHoleInfo';

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
    const scopes = collectScopes(scope);
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
        b.kind === 'Term'
          ? [...(b as TermBinding).qualifier, (b as TermBinding).name]
              .flatMap((x, i) => (i > 0 ? ['::', x] : [x]))
              .join('') +
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
            <div className="filter-menu" style={{ marginBottom: '0.5em' }}>
              <label>
                <input
                  type="checkbox"
                  checked={showDefined}
                  onChange={(e) => setShowDefined(e.target.checked)}
                />{' '}
                Defined
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showImported}
                  onChange={(e) => setShowImported(e.target.checked)}
                />{' '}
                Imported
              </label>
            </div>
          )}
          {filterBoxOpen && (
            <input
              className="filter-box"
              placeholder="Search bindings..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          )}
          <div
            className="bindings-list"
            id={`bindings-dropdown-list-${holeId}`}
          >
            {collectScopes(scope).map((s, si) => {
              const defined = s.bindings.filter(
                (b) => b.origin === BINDING_ORIGIN_DEFINED,
              );
              const imported = s.bindings.filter(
                (b) => b.origin === BINDING_ORIGIN_IMPORTED,
              );
              const renderList = (list: BindingInfo[]) =>
                list
                  .filter((b) => filteredBindings.includes(b))
                  .map((b, bi) => (
                    <div className="binding" key={`${s.kind}-${si}-${bi}`}>
                      <span className="binding-term">
                        {b.kind === 'Term'
                          ? [
                              ...(b as TermBinding).qualifier,
                              (b as TermBinding).name,
                            ].join('::')
                          : b.definition || b.name}
                      </span>
                      {b.kind === 'Term' && (b as TermBinding).type && (
                        <span className="binding-type">
                          : {(b as TermBinding).type}
                        </span>
                      )}
                    </div>
                  ));

              if (![...renderList(defined), ...renderList(imported)].length) {
                return null;
              }

              return (
                <div className="scope-group" key={si}>
                  {defined.some((b) => filteredBindings.includes(b)) && (
                    <div className="scope-label">{scopeLabel(s, false)}</div>
                  )}
                  {renderList(defined)}
                  {imported.some((b) => filteredBindings.includes(b)) && (
                    <div className="scope-label">{scopeLabel(s, true)}</div>
                  )}
                  {renderList(imported)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

function collectScopes(scope?: ScopeInfo): ScopeInfo[] {
  const scopes: ScopeInfo[] = [];
  let current = scope;
  while (current) {
    scopes.push(current);
    current = current.outer;
  }
  return scopes;
}

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
