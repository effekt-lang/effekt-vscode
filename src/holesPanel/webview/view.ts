import {
  EffektHoleInfo,
  ScopeInfo,
  BindingInfo,
  SCOPE_KIND_LOCAL,
  SCOPE_KIND_GLOBAL,
  BINDING_ORIGIN_DEFINED,
  BINDING_ORIGIN_IMPORTED,
  TermBinding,
  SCOPE_KIND_NAMESPACE,
} from '../effektHoleInfo';
import { escapeHtml } from '../htmlUtil';
import { HoleState } from './state';

export function renderHolesPanel(holes: EffektHoleInfo[]) {
  const holesList = document.querySelector('[data-holes-list]') as HTMLElement;
  const holesPanelDesc = document.querySelector(
    '[data-holes-panel-desc]',
  ) as HTMLElement;

  if (holes.length === 0) {
    holesList.innerHTML = /*html*/ `
      <div class="empty">
        There are no holes in this file.
      </div>`;
    holesPanelDesc.style.display = 'block';
  } else {
    holesList.innerHTML = renderHolesList(holes);
    holesPanelDesc.style.display = 'none';
  }
}

function renderHolesList(holes: EffektHoleInfo[]): string {
  function renderExpDropdown({
    title,
    totalCount,
    filteredCount,
    placeholder,
    itemsHtml,
    holeId,
  }: {
    title: string;
    totalCount: number;
    filteredCount: number;
    placeholder: string;
    itemsHtml: string;
    holeId: string;
  }) {
    const collapsedClass = 'collapsed';
    const hiddenClass = 'hidden';
    return /*html*/ `
      <div class="exp-dropdown-section">
       <div class="exp-dropdown-header ${collapsedClass}" data-dropdown-toggle data-hole-id="${holeId}">
          <span class="exp-dropdown-toggle">&#9660;</span>
          <span class="exp-dropdown-title">
            ${escapeHtml(title)}
            (  <span data-filtered-count>${filteredCount}</span>
        /
        <span data-total-count>${totalCount}</span>)
          </span>
          <button class="filter-toggle-btn" title="Search" data-search><i class="codicon codicon-search"></i></button>
          <button class="filter-toggle-btn" title="Filter" data-filter><i class="codicon codicon-filter"></i></button>
        </div>
        <div class="exp-dropdown-body ${hiddenClass}">
          <div class="filter-menu" style="display:none; margin-bottom: 0.5em;">
            <label><input type="checkbox" class="filter-origin" data-filter-origin data-hole-id="${escapeHtml(holeId)}" value="Defined" checked> Defined</label>
            <label><input type="checkbox" class="filter-origin" data-filter-origin data-hole-id="${escapeHtml(holeId)}" value="Imported"> Imported</label>
          </div>
          <input class="filter-box" style="display:none" placeholder="${escapeHtml(placeholder)}"
            data-filter-box
            data-hole-id="${escapeHtml(holeId)}" />
          <div class="bindings-list exp-dropdown-list" id="bindings-dropdown-list-${holeId}">
            ${itemsHtml}
          </div>
        </div>
      </div>
    `;
  }

  // Flattens the nested scope structure into an array from innermost to outermost.
  function collectScopes(scope: ScopeInfo | undefined): ScopeInfo[] {
    const scopes: ScopeInfo[] = [];
    let current = scope;
    while (current) {
      scopes.push(current);
      current = current.outer;
    }
    return scopes;
  }

  // Map scope label for display, with optional name in parentheses
  function scopeLabel(scope: ScopeInfo, imported: boolean): string {
    let label: string;
    switch (scope.kind) {
      case SCOPE_KIND_GLOBAL:
        label = imported ? 'imports' : 'module';
        break;
      case SCOPE_KIND_NAMESPACE:
        label = 'namespace';
        break;
      case SCOPE_KIND_LOCAL:
        label = 'local';
        break;
    }

    if (scope.name) {
      label += ` (${escapeHtml(scope.name)})`;
    }
    return label;
  }

  // Render all bindings (terms and types) in one long list by scope, sorted by proximity (innermost first)
  function renderBindingsByScope(scopes: ScopeInfo[]): {
    html: string;
    allBindings: BindingInfo[];
  } {
    let allBindings: BindingInfo[] = [];
    const renderQualifiedName = (b: TermBinding): string => {
      return [...b.qualifier, b.name]
        .flatMap((x, i) => (i > 0 ? ['::', x] : [x]))
        .join('');
    };

    const html = scopes
      .map((scope, _scopeIdx) => {
        const bindings = scope.bindings;
        if (bindings.length === 0) {
          return '';
        }
        // Group imports last
        const defined = bindings.filter(
          (b) => b.origin === BINDING_ORIGIN_DEFINED,
        );
        const imported = bindings.filter(
          (b) => b.origin === BINDING_ORIGIN_IMPORTED,
        );
        allBindings = allBindings.concat(defined, imported);
        let html = '';
        const renderBinding = (b: BindingInfo) => {
          switch (b.kind) {
            case 'Term':
              return /* html */ `<div class="binding" data-origin="${escapeHtml(b.origin)}">
                <span class="binding-term">${escapeHtml(renderQualifiedName(b))}</span>
                <span class="binding-type">${b.type ? `: ${escapeHtml(b.type)}` : ''}</span>
              </div>`;
            case 'Type':
              return /* html */ `<div class="binding" data-origin="${escapeHtml(b.origin)}">
                <span class="binding-term">${b.definition ? escapeHtml(b.definition) : escapeHtml(b.name)}</span>
              </div>`;
          }
        };
        if (defined.length > 0) {
          html += `<div class="scope-group"><div class="scope-label">${scopeLabel(scope, false)}</div>`;
          html += defined.map(renderBinding).join('');
          html += '</div>';
        }
        if (imported.length > 0) {
          html += `<div class="scope-group"><div class="scope-label">${scopeLabel(scope, true)}</div>`;
          html += imported.map(renderBinding).join('');
          html += '</div>';
        }
        return html;
      })
      .join('');
    return { html, allBindings };
  }

  return holes
    .map((hole) => {
      const scopes = collectScopes(hole.scope);
      const { html: bindingsHtml, allBindings } = renderBindingsByScope(scopes);
      // Default filter: only Defined (not Imported)
      const filteredBindings = allBindings.filter(
        (b) => b.origin === BINDING_ORIGIN_DEFINED,
      );
      // Allow expanded for focused holes
      return /*html*/ `
      <section class="hole-card" id="hole-${escapeHtml(hole.id)}" data-hole-id="${escapeHtml(hole.id)}">
      <div class="hole-header" data-jump-hole-id="${escapeHtml(hole.id)}" style="cursor: pointer;">
          <span class="hole-id">Hole: ${escapeHtml(hole.id)}</span>
        </div>

  <div class="expected-type-alert">
    <div class="expected-type-alert-title">Expected Type</div>
    <div class="expected-type-alert-desc">
      ${hole.expectedType ? escapeHtml(hole.expectedType) : '<span class="empty">N/A</span>'}
    </div>
  </div>

  <div class="hole-field indented-field">
    <span class="field-label">Inner type:</span>
    <span class="field-value">${hole.innerType ? `<code>${escapeHtml(hole.innerType)}</code>` : '<span class="empty">N/A</span>'}</span>
  </div>

        <div>
        ${renderExpDropdown({
          title: 'Bindings',
          totalCount: allBindings.length,
          filteredCount: filteredBindings.length,
          placeholder: 'Search bindings...',
          itemsHtml: bindingsHtml || '<span class="empty">None</span>',
          holeId: hole.id,
        })}
        </div>
      </section>
    `;
    })
    .join('');
}

export function updateHoleView(holeId: string, state: HoleState): void {
  const header = document.querySelector(
    `[data-hole-id="${holeId}"].exp-dropdown-header`,
  )! as HTMLElement;

  if (state.expanded) {
    header.classList.remove('collapsed');
  } else {
    header.classList.add('collapsed');
  }

  const card = document.getElementById('hole-' + holeId)!;
  if (state.highlighted) {
    card.classList.add('highlighted');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    card.classList.remove('highlighted');
  }

  const filterMenu = card.querySelector('.filter-menu')! as HTMLElement;

  const checkboxDefined = filterMenu.querySelector(
    'input[value="Defined"]',
  )! as HTMLInputElement;

  checkboxDefined.checked = state.showDefined;
  const checkboxImported = filterMenu.querySelector(
    'input[value="Imported"]',
  )! as HTMLInputElement;

  checkboxImported.checked = state.showImported;

  const filterInput = card.querySelector('.filter-box')! as HTMLInputElement;

  filterInput.value = state.filter;

  filterDropdownList(holeId);
}

function updateFilteredCount(holeId: string): void {
  const list = document.getElementById(`bindings-dropdown-list-${holeId}`)!;
  const totalCount: number = list.querySelectorAll('.binding').length;

  const visible: number = list.querySelectorAll(
    '.binding:not([style*="display: none"])',
  ).length;
  const header = document.querySelector(
    `[data-dropdown-toggle][data-hole-id="${holeId}"]`,
  )!;
  const filteredSpan = header.querySelector('[data-filtered-count]')!;
  const totalSpan = header.querySelector('[data-total-count]')!;
  filteredSpan.textContent = String(visible);
  totalSpan.textContent = String(totalCount);
}

function filterDropdownList(holeId: string): void {
  const input = document.querySelector<HTMLInputElement>(
    `[data-filter-box][data-hole-id="${holeId}"]`,
  )!;
  const filter: string = input.value.toLowerCase();
  const parent = input.closest('.exp-dropdown-body') as Element;
  const origins: string[] = Array.from(
    parent.querySelectorAll('.filter-origin:checked'),
  ).map((cb) => (cb as HTMLInputElement).value);
  const list = document.getElementById(`bindings-dropdown-list-${holeId}`)!;
  const items: NodeListOf<HTMLElement> = list.querySelectorAll('.binding');
  items.forEach((item) => {
    const text: string = item.textContent!.toLowerCase();
    const origin: string = item.getAttribute('data-origin')!;
    const show: boolean = text.includes(filter) && origins.includes(origin);
    item.style.display = show ? '' : 'none';
  });

  // Hide scope-group if all its .binding children are hidden
  const scopeGroups: NodeListOf<HTMLElement> =
    list.querySelectorAll('.scope-group');
  scopeGroups.forEach((group) => {
    const bindings: NodeListOf<HTMLElement> =
      group.querySelectorAll('.binding');
    const anyVisible: boolean = Array.from(bindings).some(
      (b) => b.style.display !== 'none',
    );
    group.style.display = anyVisible ? '' : 'none';
  });

  updateFilteredCount(holeId);
}

export function toggleFilterBox(btn: HTMLElement): void {
  const body = btn
    .closest('.exp-dropdown-section')!
    .querySelector('.exp-dropdown-body') as Element;
  const filterBox = body.querySelector('.filter-box') as HTMLElement;
  filterBox.style.display = filterBox.style.display === 'none' ? '' : 'none';
  if (filterBox.style.display !== 'none') {
    filterBox.focus();
  }
}

export function toggleFilterMenu(btn: HTMLElement): void {
  const body = btn
    .closest('.exp-dropdown-section')!
    .querySelector('.exp-dropdown-body') as Element;
  const filterMenu = body.querySelector('.filter-menu') as HTMLElement;
  filterMenu.style.display = filterMenu.style.display === 'none' ? '' : 'none';
}
