export {};

interface HoleState {
  expanded: boolean;
  pinned: boolean;
}

declare global {
  interface Window {
    holeStates: Map<string, HoleState>;
    vscode: any;
  }
}

window.holeStates = window.holeStates || new Map<string, HoleState>();

function getHoleState(holeId: string): HoleState {
  if (!window.holeStates.has(holeId)) {
    window.holeStates.set(holeId, { expanded: false, pinned: false });
  }
  return window.holeStates.get(holeId)!;
}

function saveHoleState(holeId: string, state: HoleState): void {
  window.holeStates.set(holeId, state);
  if (window.vscode) {
    window.vscode.postMessage({
      command: 'saveHoleState',
      holeId: holeId,
      state: state,
    });
  }
}

function closeNonPinnedHoles(exceptHoleId: string): void {
  window.holeStates.forEach((state, holeId) => {
    if (holeId !== exceptHoleId && !state.pinned && state.expanded) {
      const header = document.querySelector(
        `[data-hole-id="${holeId}"].exp-dropdown-header`,
      ) as HTMLElement;
      if (header && !header.classList.contains('collapsed')) {
        header.classList.add('collapsed');
        const body = header.nextElementSibling as HTMLElement;
        body.classList.add('hidden');
        state.expanded = false;
        saveHoleState(holeId, state);

        const holeCard = document.getElementById(`hole-${holeId}`);
        if (holeCard) {
          holeCard.classList.remove('pinned');
        }
      }
    }
  });
}

function toggleDropdown(header: HTMLElement): void {
  const holeId = header.dataset.holeId!;
  const state = getHoleState(holeId);
  const wasCollapsed = header.classList.contains('collapsed');

  if (wasCollapsed && !state.pinned) {
    closeNonPinnedHoles(holeId);
  }

  header.classList.toggle('collapsed');
  const body = header.nextElementSibling as HTMLElement;
  body.classList.toggle('hidden');

  state.expanded = !wasCollapsed;
  saveHoleState(holeId, state);
}

function togglePinState(btn: HTMLElement): void {
  const holeId = btn.dataset.holeId!;
  const state = getHoleState(holeId);

  state.pinned = !state.pinned;
  saveHoleState(holeId, state);

  const pinIcon = btn.querySelector('[data-pin-icon]') as HTMLElement;
  const holeCard = document.getElementById(`hole-${holeId}`);

  if (state.pinned) {
    btn.classList.add('pinned');
    pinIcon.classList.remove('codicon-pin');
    pinIcon.classList.add('codicon-pinned');
    btn.title = 'Unpin - Allow auto-close';
    if (holeCard) {
      holeCard.classList.add('pinned');
    }
  } else {
    btn.classList.remove('pinned');
    pinIcon.classList.remove('codicon-pinned');
    pinIcon.classList.add('codicon-pin');
    btn.title = 'Pin - Keep expanded';
    if (holeCard) {
      holeCard.classList.remove('pinned');
    }

    const hasOtherExpandedNonPinned = Array.from(
      window.holeStates.entries(),
    ).some(
      ([otherId, otherState]) =>
        otherId !== holeId && otherState.expanded && !otherState.pinned,
    );

    if (hasOtherExpandedNonPinned && state.expanded) {
      const header = document.querySelector(
        `[data-hole-id="${holeId}"].exp-dropdown-header`,
      ) as HTMLElement;
      if (header) {
        header.classList.add('collapsed');
        const body = header.nextElementSibling as HTMLElement;
        body.classList.add('hidden');
        state.expanded = false;
        saveHoleState(holeId, state);
      }
    }
  }
}

function expandHole(holeId: string): void {
  const state = getHoleState(holeId);
  const header = document.querySelector(
    `[data-hole-id="${holeId}"].exp-dropdown-header`,
  ) as HTMLElement;

  if (!header) {
    return;
  }

  closeNonPinnedHoles(holeId);

  if (header.classList.contains('collapsed')) {
    header.classList.remove('collapsed');
    const body = header.nextElementSibling as HTMLElement;
    body.classList.remove('hidden');
    state.expanded = true;
    saveHoleState(holeId, state);
  }
}

declare function acquireVsCodeApi<T>(): {
  postMessage(msg: T): void;
};

interface NotifyMessage {
  command: 'jumpToHole';
  holeId: string;
}
const vscode = acquireVsCodeApi<NotifyMessage>();

function updateFilteredCount(
  listId: string,
  headerId: string,
  totalCount: number,
): void {
  const list = document.getElementById(listId)!;
  const visible: number = list.querySelectorAll(
    '.binding:not([style*="display: none"])',
  ).length;
  const header = document.getElementById(headerId)!;
  const filteredSpan = header.querySelector('[data-filtered-count]')!;
  const totalSpan = header.querySelector('[data-total-count]')!;
  filteredSpan.textContent = String(visible);
  totalSpan.textContent = String(totalCount);
}

function filterDropdownList(
  input: HTMLInputElement,
  listId: string,
  headerId: string,
): void {
  const filter: string = input.value.toLowerCase();
  const parent = input.closest('.exp-dropdown-body') as Element;
  const origins: string[] = Array.from(
    parent.querySelectorAll('.filter-origin:checked'),
  ).map((cb) => (cb as HTMLInputElement).value);
  const items: NodeListOf<HTMLElement> = document.querySelectorAll(
    '#' + listId + ' .binding',
  );
  items.forEach((item) => {
    const text: string = item.textContent!.toLowerCase();
    const origin: string = item.getAttribute('data-origin')!;
    const show: boolean = text.includes(filter) && origins.includes(origin);
    item.style.display = show ? '' : 'none';
  });

  const scopeGroups: NodeListOf<HTMLElement> = document.querySelectorAll(
    '#' + listId + ' .scope-group',
  );
  scopeGroups.forEach((group) => {
    const bindings: NodeListOf<HTMLElement> =
      group.querySelectorAll('.binding');
    const anyVisible: boolean = Array.from(bindings).some(
      (b) => b.style.display !== 'none',
    );
    group.style.display = anyVisible ? '' : 'none';
  });

  const totalCountNumber: number = items.length;
  updateFilteredCount(listId, headerId, totalCountNumber);
}

function extendDropdownIfCollapsed(btn: HTMLElement): void {
  const header = btn.closest('.exp-dropdown-header')!;
  if (header.classList.contains('collapsed')) {
    toggleDropdown(header as HTMLElement);
  }
}

function toggleFilterBox(btn: HTMLElement): void {
  const body = btn
    .closest('.exp-dropdown-section')!
    .querySelector('.exp-dropdown-body') as Element;
  const filterBox = body.querySelector('.filter-box') as HTMLElement;
  filterBox.style.display = filterBox.style.display === 'none' ? '' : 'none';
  if (filterBox.style.display !== 'none') {
    filterBox.focus();
  }
}

function toggleFilterMenu(btn: HTMLElement): void {
  const body = btn
    .closest('.exp-dropdown-section')!
    .querySelector('.exp-dropdown-body') as Element;
  const filterMenu = body.querySelector('.filter-menu') as HTMLElement;
  filterMenu.style.display = filterMenu.style.display === 'none' ? '' : 'none';
}

document.addEventListener('DOMContentLoaded', function (): void {
  document.querySelectorAll('[data-hole-id]').forEach((element) => {
    const holeId = (element as HTMLElement).dataset.holeId!;
    const state = getHoleState(holeId);

    const pinBtn = element.querySelector('[data-pin]') as HTMLElement;
    if (pinBtn) {
      pinBtn.title = 'Pin - Keep expanded';
      if (state.pinned) {
        pinBtn.classList.add('pinned');
        const pinIcon = pinBtn.querySelector('[data-pin-icon]') as HTMLElement;
        pinIcon.classList.remove('codicon-pin');
        pinIcon.classList.add('codicon-pinned');
        pinBtn.title = 'Unpin - Allow auto-close';

        const holeCard = document.getElementById(`hole-${holeId}`);
        if (holeCard) {
          holeCard.classList.add('pinned');
        }
      }
    }

    if (element.classList.contains('exp-dropdown-header') && state.expanded) {
      element.classList.remove('collapsed');
      const body = element.nextElementSibling as HTMLElement;
      body.classList.remove('hidden');
    }
  });

  document.querySelectorAll('.exp-dropdown-body').forEach((body) => {
    const filterBox = body.querySelector('.filter-box') as HTMLInputElement;
    const listId = (body.querySelector('.bindings-list') as HTMLElement).id;
    const idx = body.id.match(/bindings-dropdown-body-(\d+)/)![1];
    const headerId = 'bindings-dropdown-header-' + idx;
    filterDropdownList(filterBox, listId, headerId);
  });
});

window.addEventListener(
  'message',
  function (
    event: MessageEvent<{ command: string; holeId?: string; states?: any }>,
  ): void {
    const message = event.data;
    if (message.command === 'highlightHole') {
      const holeId: string = message.holeId!;
      const el = document.getElementById('hole-' + holeId)!;
      document
        .querySelectorAll('.hole-card')
        .forEach((e) => e.classList.remove('highlighted'));
      el.classList.add('highlighted');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      expandHole(holeId);
    } else if (message.command === 'restoreHoleStates') {
      if (message.states) {
        window.holeStates = new Map(Object.entries(message.states));

        document.querySelectorAll('[data-hole-id]').forEach((element) => {
          const holeId = (element as HTMLElement).dataset.holeId!;
          const state = getHoleState(holeId);

          const pinBtn = element.querySelector('[data-pin]') as HTMLElement;
          if (pinBtn && state.pinned) {
            pinBtn.classList.add('pinned');
            const pinIcon = pinBtn.querySelector(
              '[data-pin-icon]',
            ) as HTMLElement;
            pinIcon.classList.remove('codicon-pin');
            pinIcon.classList.add('codicon-pinned');
            pinBtn.title = 'Unpin - Allow auto-close';

            const holeCard = document.getElementById(`hole-${holeId}`);
            if (holeCard) {
              holeCard.classList.add('pinned');
            }
          }

          if (
            element.classList.contains('exp-dropdown-header') &&
            state.expanded
          ) {
            element.classList.remove('collapsed');
            const body = element.nextElementSibling as HTMLElement;
            body.classList.remove('hidden');
          }
        });
      }
    }
  },
);

document.querySelectorAll('[data-dropdown-toggle]').forEach((btn) => {
  btn.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('.exp-dropdown-actions')) {
      return;
    }
    toggleDropdown(btn as HTMLElement);
  });
});

document.querySelectorAll('[data-pin]').forEach((btn) => {
  btn.addEventListener('click', (event) => {
    togglePinState(btn as HTMLElement);
    event.stopPropagation();
  });
});

document.querySelectorAll('[data-search]').forEach((btn) => {
  btn.addEventListener('click', (event) => {
    extendDropdownIfCollapsed(btn as HTMLElement);
    toggleFilterBox(btn as HTMLElement);
    event.stopPropagation();
  });
});

document.querySelectorAll('[data-filter]').forEach((btn) => {
  btn.addEventListener('click', (event) => {
    extendDropdownIfCollapsed(btn as HTMLElement);
    toggleFilterMenu(btn as HTMLElement);
    event.stopPropagation();
  });
});

document
  .querySelectorAll<HTMLInputElement>('[data-filter-box]')
  .forEach((input) => {
    const listId = input.dataset.listId!;
    const headerId = input.dataset.headerId!;
    input.addEventListener('input', () => {
      filterDropdownList(input, listId, headerId);
    });
  });

document
  .querySelectorAll<HTMLInputElement>('[data-filter-origin]')
  .forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const body = checkbox.closest('.exp-dropdown-body') as Element;
      const filterBox = body.querySelector('.filter-box') as HTMLInputElement;
      const listId = (body.querySelector('.bindings-list') as HTMLElement).id;
      const idx = body.id.match(/bindings-dropdown-body-(\d+)/)![1];
      const headerId = 'bindings-dropdown-header-' + idx;
      filterDropdownList(filterBox, listId, headerId);
    });
  });

document.querySelectorAll('[data-jump-hole-id]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const holeId = (btn as HTMLElement).getAttribute('data-jump-hole-id');
    if (holeId && vscode) {
      vscode.postMessage({
        command: 'jumpToHole',
        holeId,
      });
    }
  });
});
