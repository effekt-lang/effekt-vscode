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

  return /*html*/ ` 
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Effekt Holes Panel</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="${cssUri}" rel="stylesheet">
    </head>
    <body>
      <div class="container">
        <h1>Effekt Holes Panel</h1>
         ${
           holes.length === 0
             ? `<div class="empty">No holes found.</div>`
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
            <div class="hole-field">
              <details>
                <summary class="section-header">Terms (${hole.terms.length})</summary>
                <input class="filter-box" placeholder="Search terms..." oninput="filterList(event, 'terms-list-${idx}')" />
                <div class="bindings-list" id="terms-list-${idx}">
                  ${
                    hole.terms
                      .map(
                        (t) =>
                          `<div class="binding"><span class="binding-term">${escapeHtml(t.name)}</span>: <span class="binding-type">${escapeHtml(t.type)}</span></div>`,
                      )
                      .join('') || '<span class="empty">None</span>'
                  }
                </div>
              </details>
            </div>
            <div class="hole-field">
              <details>
                <summary class="section-header">Types (${hole.types.length})</summary>
                <input class="filter-box" placeholder="Search types..." oninput="filterList(event, 'types-list-${idx}')" />
                <div class="bindings-list" id="types-list-${idx}">
                  ${
                    hole.types
                      .map(
                        (t) =>
                          `<div class="binding"><span class="binding-term">${escapeHtml(t.name)}</span>: <span class="binding-type">${escapeHtml(t.kind)}</span></div>`,
                      )
                      .join('') || '<span class="empty">None</span>'
                  }
                </div>
              </details>
            </div>
            <div class="hole-field">
              <details>
                <summary class="section-header">Imported Terms (${uniqueByName(hole.importedTerms).length})</summary>
                <input class="filter-box" placeholder="Search imported terms..." oninput="filterList(event, 'imported-terms-list-${idx}')" />
                <div class="bindings-list" id="imported-terms-list-${idx}">
                  ${
                    uniqueByName(hole.importedTerms)
                      .map(
                        (t) =>
                          `<div class="binding"><span class="binding-term">${escapeHtml(t.name)}</span>: <span class="binding-type">${escapeHtml(t.type)}</span></div>`,
                      )
                      .join('') || '<span class="empty">None</span>'
                  }
                </div>
              </details>
            </div>
            <div class="hole-field">
              <details>
                <summary class="section-header">Imported Types (${uniqueByName(hole.importedTypes).length})</summary>
                <input class="filter-box" placeholder="Search imported types..." oninput="filterList(event, 'imported-types-list-${idx}')" />
                <div class="bindings-list" id="imported-types-list-${idx}">
                  ${
                    uniqueByName(hole.importedTypes)
                      .map(
                        (t) =>
                          `<div class="binding"><span class="binding-term">${escapeHtml(t.name)}</span>: <span class="binding-type">${escapeHtml(t.kind)}</span></div>`,
                      )
                      .join('') || '<span class="empty">None</span>'
                  }
                </div>
              </details>
            </div>
          </section>
        `,
                 )
                 .join('')
         }
      </div>
      <script>
        function filterList(event, listId) {
          const filter = event.target.value.toLowerCase();
          const items = document.querySelectorAll('#' + listId + ' .binding');
          items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(filter) ? '' : 'none';
          });
        }
        function selectSuggestion(el) {
          document.querySelectorAll('.suggestion').forEach(s => s.classList.remove('selected'));
          el.classList.add('selected');
        }
      </script>
    </body>
    </html>
  `;
}
