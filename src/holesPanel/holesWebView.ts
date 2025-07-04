import * as vscode from 'vscode';
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
} from './effektHoleInfo';
import { escapeHtml } from './htmlUtil';

export function generateWebView(
  holes: EffektHoleInfo[],
  cssUri: vscode.Uri,
  jsUri: vscode.Uri,
  codiconUri: vscode.Uri,
): string {
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
        <div class="exp-dropdown-header ${collapsedClass}" data-dropdown-toggle>
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
        <div class="exp-dropdown-body ${hiddenClass}" id="${kind}-dropdown-body-${idx}">
          <div class="filter-menu" style="display:none; margin-bottom: 0.5em;">
            <label><input type="checkbox" class="filter-origin" data-filter-origin value="Defined" checked> Defined</label>
            <label><input type="checkbox" class="filter-origin" data-filter-origin value="Imported"> Imported</label>
          </div>
          <input class="filter-box" style="display:none" placeholder="${escapeHtml(placeholder)}"
            data-filter-box
            data-list-id="${kind}-dropdown-list-${idx}"
            data-header-id="${kind}-dropdown-header-${idx}" />
          <div class="bindings-list exp-dropdown-list" id="${kind}-dropdown-list-${idx}">
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

  const showHoles = vscode.workspace
    .getConfiguration('effekt')
    .get<boolean>('showHoles');

  const holesPanelDesc = /* html */ `
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

  // generate a unique header id for each dropdown for updating counts
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
      <link href="${codiconUri}" rel="stylesheet" />
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
                   (b) => b.origin === BINDING_ORIGIN_DEFINED,
                 );
                 // Allow expanded for focused holes
                 return /*html*/ `
          <section class="hole-card" id="hole-${escapeHtml(hole.id)}">
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
      <script src="${jsUri}"></script>
    </body>
    </html>
  `;
}
