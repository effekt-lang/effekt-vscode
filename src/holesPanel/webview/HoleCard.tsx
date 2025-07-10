import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  EffektHoleInfo,
  ScopeInfo,
  BindingInfo,
  TermBinding,
  SCOPE_KIND_GLOBAL,
  SCOPE_KIND_NAMESPACE,
  BINDING_ORIGIN_DEFINED,
  BINDING_ORIGIN_IMPORTED,
} from '../effektHoleInfo';

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

interface HoleCardProps {
  hole: EffektHoleInfo;
  highlighted: boolean;
  onJump: (id: string) => void;
}

export const HoleCard: React.FC<HoleCardProps> = ({
  hole,
  highlighted,
  onJump,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showDefined, setShowDefined] = useState(true);
  const [showImported, setShowImported] = useState(false);
  const [filter, setFilter] = useState('');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [filterBoxOpen, setFilterBoxOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted) {
      setExpanded(true);
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlighted]);

  const allBindings = useMemo(() => {
    const scopes = collectScopes(hole.scope);
    return scopes.reduce<BindingInfo[]>((acc, scope) => {
      return acc.concat(
        scope.bindings.filter((b) => b.origin === BINDING_ORIGIN_DEFINED),
        scope.bindings.filter((b) => b.origin === BINDING_ORIGIN_IMPORTED),
      );
    }, []);
  }, [hole.scope]);

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
    <section
      ref={cardRef}
      className={`hole-card${highlighted ? ' highlighted' : ''}`}
      id={`hole-${hole.id}`}
    >
      <div
        className="hole-header"
        onClick={() => onJump(hole.id)}
        style={{ cursor: 'pointer' }}
      >
        <span className="hole-id">Hole: {hole.id}</span>
      </div>
      <div className="expected-type-alert">
        <div className="expected-type-alert-title">Expected Type</div>
        <div className="expected-type-alert-desc">
          {hole.expectedType || <span className="empty">N/A</span>}
        </div>
      </div>
      <div className="hole-field indented-field">
        <span className="field-label">Inner type:</span>
        <span className="field-value">
          {hole.innerType ? (
            <code>{hole.innerType}</code>
          ) : (
            <span className="empty">N/A</span>
          )}
        </span>
      </div>
      <div className="bindings-section">
        <div
          className={`bindings-header${expanded ? '' : ' collapsed'}`}
          onClick={() => setExpanded((e) => !e)}
          data-hole-id={hole.id}
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
        <div className={`bindings-body${expanded ? '' : ' hidden'}`}>
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
            id={`bindings-dropdown-list-${hole.id}`}
          >
            {collectScopes(hole.scope).map((scope, si) => {
              const defined = scope.bindings.filter(
                (b) => b.origin === BINDING_ORIGIN_DEFINED,
              );
              const imported = scope.bindings.filter(
                (b) => b.origin === BINDING_ORIGIN_IMPORTED,
              );
              const renderList = (list) =>
                list
                  .filter((b) => filteredBindings.includes(b))
                  .map((b, bi) => (
                    <div className="binding" key={`${scope.kind}-${si}-${bi}`}>
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
                    <div className="scope-label">
                      {scopeLabel(scope, false)}
                    </div>
                  )}
                  {renderList(defined)}
                  {imported.some((b) => filteredBindings.includes(b)) && (
                    <div className="scope-label">{scopeLabel(scope, true)}</div>
                  )}
                  {renderList(imported)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
