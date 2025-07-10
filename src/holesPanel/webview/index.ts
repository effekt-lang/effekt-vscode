import { EffektHoleInfo } from '../effektHoleInfo';
import { renderHolesPanel, toggleFilterBox, toggleFilterMenu } from './view';
import {
  expandHole,
  expandHoleForButton,
  filterHole,
  filterHoleByDefined,
  filterHoleByImported,
  highlightHole,
  toggleHole,
  updateHoleStates,
} from './state';

declare function acquireVsCodeApi<T>(): {
  postMessage(msg: T): void;
};

const vscode = acquireVsCodeApi<OutgoingMessage>()!;

/**
 * Messages from the webview to the extension.
 */
interface OutgoingMessage {
  command: 'jumpToHole';
  holeId?: string;
}

/**
 * Messages from the extension to the webview.
 */
type IncomingMessage =
  | { command: 'highlightHole'; holeId: string }
  | { command: 'updateHoles'; holes: EffektHoleInfo[] };

window.addEventListener(
  'message',
  function (event: MessageEvent<IncomingMessage>): void {
    const message = event.data;
    if (message.command === 'highlightHole') {
      const holeId: string = message.holeId!;
      highlightHole(holeId);
      expandHole(holeId);
    } else if (message.command === 'updateHoles') {
      const holes: EffektHoleInfo[] = message.holes;
      renderHolesPanel(holes);
      updateHoleStates(holes);
      registerEventListeners();
    }
  },
);

function registerEventListeners() {
  document.querySelectorAll('[data-dropdown-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const holeId = (btn as HTMLElement).getAttribute('data-hole-id');
      toggleHole(holeId!);
    });
  });

  document.querySelectorAll('[data-search]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      expandHoleForButton(btn as HTMLElement);
      toggleFilterBox(btn as HTMLElement);
      event.stopPropagation();
    });
  });

  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      expandHoleForButton(btn as HTMLElement);
      toggleFilterMenu(btn as HTMLElement);
      event.stopPropagation();
    });
  });

  document
    .querySelectorAll<HTMLInputElement>('[data-filter-box]')
    .forEach((input) => {
      const holeId = input.dataset.holeId!;
      input.addEventListener('input', () => {
        filterHole(holeId, input.value);
      });
    });

  document
    .querySelectorAll<HTMLInputElement>('[data-filter-origin][value="Defined"]')
    .forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const holeId = checkbox.dataset.holeId!;
        filterHoleByDefined(holeId, checkbox.checked);
      });
    });

  document
    .querySelectorAll<HTMLInputElement>(
      '[data-filter-origin][value="Imported"]',
    )
    .forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const holeId = checkbox.dataset.holeId!;
        filterHoleByImported(holeId, checkbox.checked);
      });
    });

  document.querySelectorAll('[data-jump-hole-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const holeId = (btn as HTMLElement).getAttribute('data-jump-hole-id')!;
      vscode.postMessage({
        command: 'jumpToHole',
        holeId,
      });
    });
  });
}
