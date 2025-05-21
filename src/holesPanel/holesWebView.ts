import * as vscode from 'vscode';
import { EffektHoleInfo } from './holesProvider';

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

  return `
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
                  (hole) => `
          <section class="hole-card">
            <div class="hole-header">
              <span class="hole-id">Hole: ${escapeHtml(hole.id)}</span>
              <span class="hole-range">[${hole.range.start.line + 1}:${hole.range.start.character + 1} - ${hole.range.end.line + 1}:${hole.range.end.character + 1}]</span>
            </div>
            <div class="hole-field">
              <span class="field-label">Inner type:</span>
              <span class="field-value">${hole.innerType ? `<code>${escapeHtml(hole.innerType)}</code>` : '<span class="empty">N/A</span>'}</span>
            </div>
            <div class="hole-field">
              <span class="field-label">Expected type:</span>
              <span class="field-value">${hole.expectedType ? `<code>${escapeHtml(hole.expectedType)}</code>` : '<span class="empty">N/A</span>'}</span>
            </div>
            <div class="hole-field">
              <details>					
                <summary>Imported Terms (${uniqueByName(hole.importedTerms).length})</summary>
                <div class="bindings-list">
                  ${
                    uniqueByName(hole.importedTerms)
                      .map(
                        (t) =>
                          `<span class="binding binding-term" title="${escapeHtml(t.type)}">${escapeHtml(t.name)}</span>`,
                      )
                      .join('') || '<span class="empty">None</span>'
                  }
                </div>
              </details>
            </div>
            <div class="hole-field">
              <details>
                <summary>Imported Types (${uniqueByName(hole.importedTypes).length})</summary>
                <div class="bindings-list">
                  ${
                    uniqueByName(hole.importedTypes)
                      .map(
                        (t) =>
                          `<span class="binding binding-type" title="${escapeHtml(t.kind)}">${escapeHtml(t.name)}</span>`,
                      )
                      .join('') || '<span class="empty">None</span>'
                  }
                </div>
              </details>
            </div>
            <div class="hole-field">
              <span class="field-label">Terms:</span>
              <span class="bindings-list">
                ${
                  hole.terms
                    .map(
                      (t) =>
                        `<span class="binding binding-term" title="${escapeHtml(t.type)}">${escapeHtml(t.name)}</span>`,
                    )
                    .join('') || '<span class="empty">None</span>'
                }
              </span>
            </div>
            <div class="hole-field">
              <span class="field-label">Types:</span>
              <span class="bindings-list">
                ${
                  hole.types
                    .map(
                      (t) =>
                        `<span class="binding binding-type" title="${escapeHtml(t.kind)}">${escapeHtml(t.name)}</span>`,
                    )
                    .join('') || '<span class="empty">None</span>'
                }
              </span>
            </div>
          </section>
        `,
                )
                .join('')
        }
      </div>
    </body>
    </html>
  `;
}
