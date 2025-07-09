import {
  expandHole,
  updateAllHolesFromState,
  expandHoleForButton,
  toggleHole,
} from './holeStateManagement';

declare function acquireVsCodeApi<T>(): {
  postMessage(msg: T): void;
};

interface NotifyMessage {
  command: 'jumpToHole';
  holeId?: string;
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

  // Hide scope-group if all its .binding children are hidden
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
  document.querySelectorAll('.exp-dropdown-body').forEach((body) => {
    const filterBox = body.querySelector('.filter-box') as HTMLInputElement;
    const listId = (body.querySelector('.bindings-list') as HTMLElement).id;
    // Find header id by traversing up to .exp-dropdown-section and finding the id of the header container
    const idx = body.id.match(/bindings-dropdown-body-(\d+)/)![1];
    const headerId = 'bindings-dropdown-header-' + idx;
    filterDropdownList(filterBox, listId, headerId);
  });
});

// Focus hole support: highlight and scroll to requested hole, and expand bindings
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
    }
  },
);

document.querySelectorAll('[data-dropdown-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const holeId = (btn as HTMLElement).getAttribute('data-hole-id');
    if (holeId) {
      toggleHole(holeId);
    }
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
