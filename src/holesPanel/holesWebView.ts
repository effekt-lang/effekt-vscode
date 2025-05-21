import { EffektHoleInfo } from './holesProvider';
export function generateWebView(holes: EffektHoleInfo[]): string {
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
      <style>
        :root {
          --background: var(--vscode-editor-background, #1e1e1e);
          --foreground: var(--vscode-editor-foreground, #d4d4d4);
          --accent: #569CD6;
          --border: #333;
          --section-bg: #252526;
          --section-border: #37373d;
          --code-bg: #232323;
          --term: #dcdcaa;
          --type: #b5cea8;
          --highlight: #2c313a;
        }
        html, body {
          background: var(--background);
          color: var(--foreground);
          font-family: var(--vscode-editor-font-family, 'Segoe UI', 'Fira Mono', 'monospace');
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 900px;
          margin: 2rem auto;
          padding: 1rem;
        }
        .hole-card {
          background: var(--section-bg);
          border: 1.5px solid var(--section-border);
          border-radius: 7px;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 6px 0 #0002;
          padding: 1.5rem 1.25rem 1rem 1.25rem;
        }
        .hole-header {
          display: flex;
          align-items: center;
          padding-bottom: 0.5rem;
          border-bottom: 1.5px solid var(--border);
          margin-bottom: 1rem;
        }
        .hole-id {
          font-family: var(--vscode-editor-font-family, monospace);
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--accent);
        }
        .hole-range {
          margin-left: auto;
          font-size: 0.95rem;
          color: #888;
          background: var(--highlight);
          border-radius: 4px;
          padding: 0.15em 0.6em;
        }
        .hole-field {
          margin: 0.3em 0;
        }
        .field-label {
          color: var(--accent);
          font-weight: 500;
          margin-right: 0.2em;
        }
        .field-value {
          font-family: var(--vscode-editor-font-family, monospace);
        }
        .bindings-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5em 1.5em;
          margin: 0.2em 0 0.6em 0;
        }
        .binding {
          background: var(--code-bg);
          border-radius: 4px;
          padding: 0.15em 0.7em 0.15em 0.5em;
        }
        .binding-term { color: var(--term); }
        .binding-type { color: var(--type); }
        .empty { color: #888; font-style: italic; }
        code {
          background: var(--code-bg);
          border-radius: 4px;
          padding: 0.1em 0.3em;
        }
      </style>
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
              <span class="field-label">Imported Terms:</span>
              <span class="bindings-list">
                ${
                  uniqueByName(hole.importedTerms)
                    .map(
                      (t) =>
                        `<span class="binding binding-term" title="${escapeHtml(t.type)}">${escapeHtml(t.name)}</span>`,
                    )
                    .join('') || '<span class="empty">None</span>'
                }
              </span>
            </div>
            <div class="hole-field">
              <span class="field-label">Imported Types:</span>
              <span class="bindings-list">
                ${
                  uniqueByName(hole.importedTypes)
                    .map(
                      (t) =>
                        `<span class="binding binding-type" title="${escapeHtml(t.kind)}">${escapeHtml(t.name)}</span>`,
                    )
                    .join('') || '<span class="empty">None</span>'
                }
              </span>
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
