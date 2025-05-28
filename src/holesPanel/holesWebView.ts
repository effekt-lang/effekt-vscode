import * as vscode from 'vscode';
import { EffektHoleInfo } from './effektHoleInfo';

export function generateWebView(
  holes: EffektHoleInfo[],
  cssUri: vscode.Uri,
): string {
  function escapeHtml(str: string): string {
    return String(str).replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]!,
    );
  }

  function uniqueByName<T extends { name: string }>(arr: T[]): T[] {
    return Array.from(new Map(arr.map((x) => [x.name, x])).values());
  }

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
    return `
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
           holes.length === 0
             ? /*html*/ `<div class="empty">
    There are no holes in this file.<br/><br/>
    <div class="desc">
      This panel shows information about the types and terms in scope for each typed hole.
      Holes are placeholders for missing code used for type-driven development.
      You can create a hole using the <code>&lt;&gt;</code> syntax.
      For example, you can write a definition without a right-hand side as follows:
      <pre>def foo() = &lt;&gt;</pre><br/>
      Use <code>&lt;{ x }&gt;</code> in order to fill in a hole with a statement or expression <code>x</code>, for example:
      <pre>def foo() = &lt;{ println("foo"); 42 }&gt;</pre>
    </div>
   </div>`
             : holes
                 .map(
                   (hole, idx) => `
          <section class="hole-card">
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
              count: hole.terms.length,
              idx,
              kind: 'terms',
              placeholder: 'Search terms...',
              itemsHtml:
                hole.terms
                  .map(
                    (t) =>
                      `<div class="binding"><span class="binding-term">${escapeHtml(t.name)}</span>: <span class="binding-type">${escapeHtml(t.type)}</span></div>`,
                  )
                  .join('') || '<span class="empty">None</span>',
            })}
            ${renderExpDropdown({
              title: 'Types',
              count: hole.types.length,
              idx,
              kind: 'types',
              placeholder: 'Search types...',
              itemsHtml:
                hole.types
                  .map(
                    (t) =>
                      `<div class="binding"><span class="binding-term">${escapeHtml(t.name)}</span>: <span class="binding-type">${escapeHtml(t.kind)}</span></div>`,
                  )
                  .join('') || '<span class="empty">None</span>',
            })}
            ${renderExpDropdown({
              title: 'Imported Terms',
              count: uniqueByName(hole.importedTerms).length,
              idx,
              kind: 'imported-terms',
              placeholder: 'Search imported terms...',
              itemsHtml:
                uniqueByName(hole.importedTerms)
                  .map(
                    (t) =>
                      `<div class="binding"><span class="binding-term">${escapeHtml(t.name)}</span>: <span class="binding-type">${escapeHtml(t.type)}</span></div>`,
                  )
                  .join('') || '<span class="empty">None</span>',
            })}
            ${renderExpDropdown({
              title: 'Imported Types',
              count: uniqueByName(hole.importedTypes).length,
              idx,
              kind: 'imported-types',
              placeholder: 'Search imported types...',
              itemsHtml:
                uniqueByName(hole.importedTypes)
                  .map(
                    (t) =>
                      `<div class="binding"><span class="binding-term">${escapeHtml(t.name)}</span>: <span class="binding-type">${escapeHtml(t.kind)}</span></div>`,
                  )
                  .join('') || '<span class="empty">None</span>',
            })}
          </section>
        `,
                 )
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
