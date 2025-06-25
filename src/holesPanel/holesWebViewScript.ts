export function updateFilteredCount(
  listId: string,
  headerId: string,
  totalCount: number,
): void {
  const list: HTMLElement | null = document.getElementById(listId);
  if (!list) {
    return;
  }
  const visible: number = list.querySelectorAll(
    '.binding:not([style*="display: none"])',
  ).length;
  const header: HTMLElement | null = document.getElementById(headerId);
  if (header) {
    const filteredSpan = header.querySelector('.filtered-count');
    const totalSpan = header.querySelector('.total-count');
    if (filteredSpan) {
      filteredSpan.textContent = String(visible);
    }
    if (totalSpan) {
      totalSpan.textContent = String(totalCount);
    }
  }
}

export function filterDropdownList(
  input: HTMLInputElement,
  listId: string,
  headerId: string,
): void {
  const filter: string = input.value.toLowerCase();
  const parent: Element = input.closest('.exp-dropdown-body') as Element;
  const origins: string[] = Array.from(
    parent.querySelectorAll('.filter-origin:checked'),
  ).map((cb) => (cb as HTMLInputElement).value);
  const items: NodeListOf<HTMLElement> = document.querySelectorAll(
    '#' + listId + ' .binding',
  );
  items.forEach((item) => {
    const text: string = item.textContent!.toLowerCase();
    const origin: string | null = item.getAttribute('data-origin');
    const show: boolean =
      text.includes(filter) && origin !== null && origins.includes(origin);
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

export function toggleDropdown(header: Element): void {
  header.classList.toggle('collapsed');
  const body: Element | null = header.nextElementSibling as Element;
  if (body) {
    body.classList.toggle('hidden');
  }
}

// always extend the dropdown if it's collapsed
export function extendDropdownIfCollapsed(btn: HTMLElement): void {
  const header: Element | null = btn.closest('.exp-dropdown-header');
  if (header && header.classList.contains('collapsed')) {
    toggleDropdown(header);
  }
}

export function toggleFilterBox(btn: HTMLElement): void {
  const body: Element = btn
    .closest('.exp-dropdown-section')!
    .querySelector('.exp-dropdown-body') as Element;
  const filterBox: HTMLElement = body.querySelector(
    '.filter-box',
  ) as HTMLElement;
  filterBox.style.display = filterBox.style.display === 'none' ? '' : 'none';
  if (filterBox.style.display !== 'none') {
    filterBox.focus();
  }
}

export function toggleFilterMenu(btn: HTMLElement): void {
  const body: Element = btn
    .closest('.exp-dropdown-section')!
    .querySelector('.exp-dropdown-body') as Element;
  const filterMenu: HTMLElement = body.querySelector(
    '.filter-menu',
  ) as HTMLElement;
  filterMenu.style.display = filterMenu.style.display === 'none' ? '' : 'none';
}

// Patch: on open, set imports off by default and update counts
document.addEventListener('DOMContentLoaded', function (): void {
  document.querySelectorAll('.filter-menu').forEach((menu) => {
    const importedBox: HTMLInputElement | null = menu.querySelector(
      'input.filter-origin[value="Imported"]',
    );
    if (importedBox) {
      importedBox.checked = false;
    }
  });
  // Trigger initial filter to update counts and hide imported
  document.querySelectorAll('.exp-dropdown-body').forEach((body) => {
    const filterBox: HTMLInputElement = body.querySelector(
      '.filter-box',
    ) as HTMLInputElement;
    const listId: string = (body.querySelector('.bindings-list') as HTMLElement)
      .id;
    // Find header id by traversing up to .exp-dropdown-section and finding the id of the header container
    const idx: string = body.id.match(/bindings-dropdown-body-(\d+)/)![1];
    const headerId: string = 'bindings-dropdown-header-' + idx;
    filterDropdownList(filterBox, listId, headerId);
  });
});

// Focus hole support: highlight and scroll to requested hole, and expand bindings
window.addEventListener(
  'message',
  function (event: MessageEvent<{ command: string; holeId: string }>): void {
    const message = event.data;
    if (message.command === 'highlightHole') {
      const holeId: string = message.holeId;
      const el: HTMLElement | null = document.getElementById('hole-' + holeId);
      if (el) {
        document
          .querySelectorAll('.hole-card')
          .forEach((e) => e.classList.remove('highlighted'));
        el.classList.add('highlighted');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Expand bindings dropdown if collapsed
        const bindingsHeader: Element | null = el.querySelector(
          '.exp-dropdown-header',
        );
        if (bindingsHeader && bindingsHeader.classList.contains('collapsed')) {
          toggleDropdown(bindingsHeader);
        }
      }
    }
  },
);

document.querySelectorAll('[data-dropdown-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => toggleDropdown(btn as HTMLElement));
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
