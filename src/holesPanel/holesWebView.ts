import * as vscode from 'vscode';
import {
  EffektHoleInfo,
  ScopeInfo,
  TermBinding,
  TypeBinding,
  BindingInfo,
} from './effektHoleInfo';
import { escapeHtml } from './htmlUtil';

export function generateWebView(
  holes: EffektHoleInfo[],
  cssUri: vscode.Uri,
): string {
  // Helper for dropdown section
  function renderExpDropdown({
    title,
    count,
    idx,
    kind,
    placeholder,
    itemsHtml,
  }: {
    title: string;
    count: number;
    idx: number;
    kind: string;
    placeholder: string;
    itemsHtml: string;
  }) {
    return /*html*/ `
      <div class="exp-dropdown-section">
        <div class="exp-dropdown-header collapsed" onclick="toggleDropdown(this)">
          <span class="exp-dropdown-toggle">&#9660;</span>
          <span class="exp-dropdown-title">${escapeHtml(title)} (${count})</span>
        </div>
        <div class="exp-dropdown-body hidden" id="${kind}-dropdown-body-${idx}">
          <input class="filter-box" placeholder="${escapeHtml(placeholder)}" oninput="filterDropdownList(event, '${kind}-dropdown-list-${idx}')" />
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

  // Render bindings grouped by scope, sorted by proximity (innermost first)
  function renderBindingsByScope<T extends BindingInfo>(
    scopes: ScopeInfo[],
    type: 'term' | 'type',
  ): string {
    return scopes
      .map((scope, _scopeIdx) => {
        // Filter bindings by type
        const bindings = scope.bindings.filter((b) =>
          type === 'term' ? 'type' in b : 'definition' in b,
        ) as T[];

        if (bindings.length === 0) {
          return '';
        }

        // Group imports last
        const defined = bindings.filter((b) => b.origin === 'Defined');
        const imported = bindings.filter((b) => b.origin === 'Imported');

        let html = '';
        if (defined.length > 0) {
          html += `<div class="scope-group"><div class="scope-label">${escapeHtml(scope.name ?? scope.kind)} (local)</div>`;
          html += defined
            .map(
              (b) =>
                `<div class="binding"><span class="binding-term">${escapeHtml(b.name)}</span>: <span class="binding-type">${
                  type === 'term'
                    ? escapeHtml((b as TermBinding).type ?? '')
                    : escapeHtml((b as unknown as TypeBinding).definition)
                }</span></div>`,
            )
            .join('');
          html += '</div>';
        }
        if (imported.length > 0) {
          html += `<div class="scope-group"><div class="scope-label">${escapeHtml(scope.name ?? scope.kind)} (imported)</div>`;
          html += imported
            .map(
              (b) =>
                `<div class="binding"><span class="binding-term">${escapeHtml(b.name)}</span>: <span class="binding-type">${
                  type === 'term'
                    ? escapeHtml((b as TermBinding).type ?? '')
                    : escapeHtml((b as unknown as TypeBinding).definition)
                }</span></div>`,
            )
            .join('');
          html += '</div>';
        }
        return html;
      })
      .join('');
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

  return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Effekt Holes</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

            ${renderExpDropdown({
              title: 'Terms',
              count: scopes.reduce(
                (acc, s) =>
                  acc +
                  s.bindings.filter(
                    (b) => 'type' in b && b.origin === 'Defined',
                  ).length,
                0,
              ),
              idx,
              kind: 'terms',
              placeholder: 'Search terms...',
              itemsHtml:
                renderBindingsByScope<TermBinding>(scopes, 'term') ||
                '<span class="empty">None</span>',
            })}
            ${renderExpDropdown({
              title: 'Types',
              count: scopes.reduce(
                (acc, s) =>
                  acc +
                  s.bindings.filter(
                    (b) => 'definition' in b && b.origin === 'Defined',
                  ).length,
                0,
              ),
              idx,
              kind: 'types',
              placeholder: 'Search types...',
              itemsHtml:
                renderBindingsByScope<TypeBinding>(scopes, 'type') ||
                '<span class="empty">None</span>',
            })}
          </section>
        `;
               })
               .join('')
     }
      </div>
      <script>
        function filterDropdownList(event, listId) {
          const filter = event.target.value.toLowerCase();
          const items = document.querySelectorAll('#' + listId + ' .binding');
          items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(filter) ? '' : 'none';
          });
        }
        function toggleDropdown(header) {
          header.classList.toggle('collapsed');
          const body = header.nextElementSibling;
          body.classList.toggle('hidden');
        }
      </script>
    </body>
    </html>
  `;
}
