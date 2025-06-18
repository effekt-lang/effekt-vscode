import * as vscode from 'vscode';
import { EffektHoleInfo, ScopeInfo, BindingInfo } from './effektHoleInfo';
import { escapeHtml } from './htmlUtil';

export function generateWebView(
  holes: EffektHoleInfo[],
  cssUri: vscode.Uri,
): string {
  // Helper for dropdown section
  function renderExpDropdown({
    title,
    totalCount,
    filteredCount,
    idx,
    kind,
    placeholder,
    itemsHtml,
    expanded = false,
  }: {
    title: string;
    totalCount: number;
    filteredCount: number;
    idx: number;
    kind: string;
    placeholder: string;
    itemsHtml: string;
    expanded?: boolean;
  }) {
    // Set expanded by default for focused holes
    const collapsedClass = expanded ? '' : 'collapsed';
    const hiddenClass = expanded ? '' : 'hidden';
    return /*html*/ `
      <div class="exp-dropdown-section">
        <div class="exp-dropdown-header ${collapsedClass}" onclick="toggleDropdown(this)">
          <span class="exp-dropdown-toggle">&#9660;</span>
          <span class="exp-dropdown-title">${escapeHtml(title)} (${filteredCount} / ${totalCount})</span>
          <button class="filter-toggle-btn" title="Search" onclick="event.stopPropagation(); extendDropdownIfCollapsed(this); toggleFilterBox(this)"><i class="codicon codicon-search"></i>
          </button>
          <button class="filter-toggle-btn" title="Filter" onclick="event.stopPropagation(); extendDropdownIfCollapsed(this); toggleFilterMenu(this)"><i class="codicon codicon-filter"></i></button>
        </div>
        <div class="exp-dropdown-body ${hiddenClass}" id="${kind}-dropdown-body-${idx}">
          <div class="filter-menu" style="display:none; margin-bottom: 0.5em;">
            <label><input type="checkbox" class="filter-origin" value="Defined" checked> Defined</label>
            <label><input type="checkbox" class="filter-origin" value="Imported"> Imported</label>
          </div>
          <input class="filter-box" style="display:none" placeholder="${escapeHtml(placeholder)}" oninput="filterDropdownList(event, '${kind}-dropdown-list-${idx}', '${kind}-dropdown-header-${idx}')" />
          <div class="bindings-list exp-dropdown-list" id="${kind}-dropdown-list-${idx}">
            ${itemsHtml}
          </div>
        </div>
      </div>
    `;
  }

  // Collect scopes from innermost to outermost
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
    if (scope.kind === 'Local') {
      label = 'local';
    } else if (scope.kind === 'Global' && !imported) {
      label = 'module';
    } else if (scope.kind === 'Global' && imported) {
      label = 'imports';
    } else {
      label = escapeHtml(scope.kind);
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
    const html = scopes
      .map((scope, _scopeIdx) => {
        const bindings = scope.bindings;
        if (bindings.length === 0) {
          return '';
        }
        // Group imports last
        const defined = bindings.filter((b) => b.origin === 'Defined');
        const imported = bindings.filter((b) => b.origin === 'Imported');
        allBindings = allBindings.concat(defined, imported);
        let html = '';
        const renderBinding = (b: BindingInfo) =>
          `<div class="binding" data-origin="${escapeHtml(b.origin)}">
            <span class="binding-term">${escapeHtml(b.name)}</span>
            <span class="binding-type">${
              b.type
                ? `: ${escapeHtml(b.type)}`
                : b.definition
                  ? ` = ${escapeHtml(b.definition)}`
                  : ''
            }</span>
          </div>`;
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

  const showHoles = vscode.workspace
    .getConfiguration('effekt')
    .get<boolean>('showHoles');

  const holesPanelDesc = `
    <div class="desc">
      This panel shows information about the types and terms in scope for each typed hole.
      Holes are placeholders for missing code used for type-driven development.
      You can create a hole using the <code>&lt;&gt;</code> syntax.
      For example, you can write a definition without a right-hand side as follows:
      <pre>def foo() = &lt;&gt;</pre><br/>
      Use <code>&lt;{ x }&gt;</code> in order to fill in a hole with a statement or expression <code>x</code>, for example:
      <pre>def foo() = &lt;{ println("foo"); 42 }&gt;</pre>
    </div>
  `;

  // Helper to generate a unique header id for each dropdown for updating counts
  function headerId(kind: string, idx: number): string {
    return `${kind}-dropdown-header-${idx}`;
  }

  return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Effekt Holes</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://microsoft.github.io/vscode-codicons/dist/codicon.css" rel="stylesheet" />
      <link href="${cssUri}" rel="stylesheet">
    </head>
    <body>
      <div class="container">
        <h1>Effekt Holes</h1>
     ${
       !showHoles
         ? /*html*/ `<div class="empty">
        <div class="warning">
          <b>Warning:</b> The Holes Panel requires the setting <b>Extension &gt; Effekt &gt; Show Holes</b> to be enabled to function.
        </div>
        ${holesPanelDesc}
      </div>`
         : holes.length === 0
           ? /*html*/ `<div class="empty">
          There are no holes in this file.
          ${holesPanelDesc}
        </div>`
           : holes
               .map((hole, idx) => {
                 const scopes = collectScopes(hole.scope);
                 const { html: bindingsHtml, allBindings } =
                   renderBindingsByScope(scopes);
                 // Default filter: only Defined (not Imported)
                 const filteredBindings = allBindings.filter(
                   (b) => b.origin === 'Defined',
                 );
                 // Allow expanded for focused holes
                 return /*html*/ `
          <section class="hole-card" id="hole-${escapeHtml(hole.id)}">
            <div class="hole-header">
              <span class="hole-id">Hole: ${escapeHtml(hole.id)}</span>
              <span class="hole-range">[${hole.range.start.line + 1}:${hole.range.start.character + 1} - ${hole.range.end.line + 1}:${hole.range.end.character + 1}]</span>
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

            <div id="${headerId('bindings', idx)}">
            ${renderExpDropdown({
              title: 'Bindings',
              totalCount: allBindings.length,
              filteredCount: filteredBindings.length,
              idx,
              kind: 'bindings',
              placeholder: 'Search bindings...',
              itemsHtml: bindingsHtml || '<span class="empty">None</span>',
              expanded: false, // Will be toggled by focus event
            })}
            </div>
          </section>
        `;
               })
               .join('')
     }
      </div>
      <script>
        // Recompute and update the displayed filtered count
        function updateFilteredCount(listId, headerId, totalCount) {
          const list = document.getElementById(listId);
          if (!list) return;
          const visible = list.querySelectorAll('.binding:not([style*="display: none"])').length;
          const header = document.getElementById(headerId);
          if (header) {
            const titleSpan = header.querySelector('.exp-dropdown-title');
            if (titleSpan) {
              // Extract X / Y from text and replace it
              const match = titleSpan.textContent.match(/\\((\\d+)\\s*\\/\\s*(\\d+)\\)/);
              if (match) {
                titleSpan.textContent = titleSpan.textContent.replace(/\\((\\d+)\\s*\\/\\s*(\\d+)\\)/, '(' + visible + ' / ' + totalCount + ')');
              } else {
                // fallback: just append
                titleSpan.textContent += ' (' + visible + ' / ' + totalCount + ')';
              }
            }
          }
        }

        function filterDropdownList(event, listId, headerId) {
          const filter = event.target.value.toLowerCase();
          const parent = event.target.closest('.exp-dropdown-body');
          const origins = Array.from(parent.querySelectorAll('.filter-origin:checked')).map(cb => cb.value);
          const items = document.querySelectorAll('#' + listId + ' .binding');
          items.forEach(item => {
            const text = item.textContent.toLowerCase();
            const origin = item.getAttribute('data-origin');
            const show = text.includes(filter) && origins.includes(origin);
            item.style.display = show ? '' : 'none';
          });

          // Hide scope-group if all its .binding children are hidden
          const scopeGroups = document.querySelectorAll('#' + listId + ' .scope-group');
          scopeGroups.forEach(group => {
            const bindings = group.querySelectorAll('.binding');
            const anyVisible = Array.from(bindings).some(b => b.style.display !== 'none');
            group.style.display = anyVisible ? '' : 'none';
          });

          // Update filtered count in the header
          // Get total count from data-total-count attr
          const totalCount = items.length;
          updateFilteredCount(listId, headerId, totalCount);
        }
        function toggleDropdown(header) {
          header.classList.toggle('collapsed');
          const body = header.nextElementSibling;
          body.classList.toggle('hidden');
        }
        // Helper to always extend the dropdown if it's collapsed
        function extendDropdownIfCollapsed(btn) {
          const header = btn.closest('.exp-dropdown-header');
          if (header && header.classList.contains('collapsed')) {
            toggleDropdown(header);
          }
        }
        function toggleFilterBox(btn) {
          const body = btn.closest('.exp-dropdown-section').querySelector('.exp-dropdown-body');
          const filterBox = body.querySelector('.filter-box');
          filterBox.style.display = filterBox.style.display === 'none' ? '' : 'none';
          if (filterBox.style.display !== 'none') {
            filterBox.focus();
          }
        }
        function toggleFilterMenu(btn) {
          const body = btn.closest('.exp-dropdown-section').querySelector('.exp-dropdown-body');
          const filterMenu = body.querySelector('.filter-menu');
          filterMenu.style.display = filterMenu.style.display === 'none' ? '' : 'none';
        }
        // Listen for filter checkbox changes to update the list and count
        document.addEventListener('change', function(e) {
          if (e.target.classList.contains('filter-origin')) {
            const body = e.target.closest('.exp-dropdown-body');
            const filterBox = body.querySelector('.filter-box');
            const listId = body.querySelector('.bindings-list').id;
            // Find header id by traversing up to .exp-dropdown-section and finding the id of the header container
            const section = body.closest('.exp-dropdown-section');
            const idx = section.querySelector('.exp-dropdown-body').id.match(/bindings-dropdown-body-(\\d+)/)[1];
            const headerId = 'bindings-dropdown-header-' + idx;

            filterDropdownList({ target: filterBox }, listId, headerId);
          }
        });
        // Patch: on open, set imports off by default and update counts
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('.filter-menu').forEach(menu => {
            const importedBox = menu.querySelector('input.filter-origin[value="Imported"]');
            if (importedBox) {
              importedBox.checked = false;
            }
          });
          // Trigger initial filter to update counts and hide imported
          document.querySelectorAll('.exp-dropdown-body').forEach(body => {
            const filterBox = body.querySelector('.filter-box');
            const listId = body.querySelector('.bindings-list').id;
            // Find header id by traversing up to .exp-dropdown-section and finding the id of the header container
            const section = body.closest('.exp-dropdown-section');
            const idx = body.id.match(/bindings-dropdown-body-(\\d+)/)[1];
            const headerId = 'bindings-dropdown-header-' + idx;
            filterDropdownList({ target: filterBox }, listId, headerId);
          });
        });

        // Focus hole support: highlight and scroll to requested hole, and expand bindings
        window.addEventListener('message', event => {
          const message = event.data;
          if (message.command === 'highlightHole') {
            const holeId = message.holeId;
            const el = document.getElementById('hole-' + holeId);
            if (el) {
              document.querySelectorAll('.hole-card').forEach(e => e.classList.remove('highlighted'));
              el.classList.add('highlighted');
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Expand bindings dropdown if collapsed
              const bindingsHeader = el.querySelector('.exp-dropdown-header');
              if (bindingsHeader && bindingsHeader.classList.contains('collapsed')) {
                toggleDropdown(bindingsHeader);
              }
            }
          }
        });
      </script>
    </body>
    </html>
  `;
}
