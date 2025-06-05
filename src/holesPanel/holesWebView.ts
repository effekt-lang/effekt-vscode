import * as vscode from 'vscode';
import { EffektHoleInfo } from './effektHoleInfo';
import { escapeHtml } from './htmlUtil';

/**
 * Generates the full HTML content for the Effekt Holes webview panel.
 */
export function generateWebView(
  holes: EffektHoleInfo[],
  cssUri: vscode.Uri,
): string {
  const showHoles = vscode.workspace
    .getConfiguration('effekt')
    .get<boolean>('showHoles');

  const content = !showHoles
    ? renderHolesDisabledSection()
    : holes.length === 0
      ? renderNoHolesSection()
      : renderHolesList(holes);

  return renderFullHtmlDocument(cssUri, content);
}

/**
 * Renders the full HTML document with head and body sections.
 */
function renderFullHtmlDocument(
  cssUri: vscode.Uri,
  bodyContent: string,
): string {
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
        ${bodyContent}
      </div>
      ${getClientScript()}
    </body>
    </html>
  `;
}

/**
 * Renders the message shown when holes are disabled in the settings.
 */
function renderHolesDisabledSection(): string {
  return /*html*/ `
    <div class="empty">
      <div class="warning">
        <b>Warning:</b> The Holes Panel requires the setting <b>Extension &gt; Effekt &gt; Show Holes</b> to be enabled to function.
      </div>
      ${renderPanelDescription()}
    </div>
  `;
}

/**
 * Renders the message shown when there are no holes in the file.
 */
function renderNoHolesSection(): string {
  return /*html*/ `
    <div class="empty">
      There are no holes in this file.
      ${renderPanelDescription()}
    </div>
  `;
}

/**
 * Renders the descriptive text shown in both empty and warning states.
 */
function renderPanelDescription(): string {
  return /*html*/ `
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
}

/**
 * Renders the list of hole cards.
 */
function renderHolesList(holes: EffektHoleInfo[]): string {
  return holes.map((hole, idx) => renderHoleCard(hole, idx)).join('');
}

/**
 * Renders a single hole card with expected type, inner type, and scope dropdowns.
 */
function renderHoleCard(hole: EffektHoleInfo, idx: number): string {
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

      ${renderDropdownSection('Terms', hole.terms.length, idx, 'terms', 'Search terms...', renderBindingList(hole.terms, 'type'))}
      ${renderDropdownSection('Types', hole.types.length, idx, 'types', 'Search types...', renderBindingList(hole.types, 'kind'))}
      ${renderDropdownSection('Imported Terms', hole.importedTerms.length, idx, 'imported-terms', 'Search imported terms...', renderBindingList(hole.importedTerms, 'type'))}
      ${renderDropdownSection('Imported Types', hole.importedTypes.length, idx, 'imported-types', 'Search imported types...', renderBindingList(hole.importedTypes, 'kind'))}
    </section>
  `;
}

/**
 * Renders a dropdown section (terms/types/etc.) for a given hole.
 */
function renderDropdownSection(
  title: string,
  count: number,
  idx: number,
  kind: string,
  placeholder: string,
  itemsHtml: string,
): string {
  return /*html*/ `
    <div class="exp-dropdown-section">
      <div class="exp-dropdown-header collapsed" onclick="toggleDropdown(this)">
        <span class="exp-dropdown-toggle">&#9660;</span>
        <span class="exp-dropdown-title">${escapeHtml(title)} (${count})</span>
      </div>
      <div class="exp-dropdown-body hidden" id="${kind}-dropdown-body-${idx}">
        <input class="filter-box" placeholder="${escapeHtml(placeholder)}" oninput="filterDropdownList(event, '${kind}-dropdown-list-${idx}')" />
        <div class="bindings-list exp-dropdown-list" id="${kind}-dropdown-list-${idx}">
          ${itemsHtml || '<span class="empty">None</span>'}
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the list of term/type bindings in a dropdown.
 */
function renderBindingList(
  items: { name: string; type?: string; kind?: string }[],
  key: 'type' | 'kind',
): string {
  return items
    .map(
      (item) => /*html*/ `
      <div class="binding">
        <span class="binding-term">${escapeHtml(item.name)}</span>: 
        <span class="binding-type">${escapeHtml(item[key] ?? '')}</span>
      </div>
    `,
    )
    .join('');
}

/**
 * Client-side JS for dropdown behavior and filtering.
 */
function getClientScript(): string {
  return /*html*/ `
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
  `;
}
