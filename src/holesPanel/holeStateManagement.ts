import { HoleState } from './holesViewProvider';

// declare global is used to safely extend the global Window interface with custom properties
declare global {
  interface Window {
    holeStates: Map<string, HoleState>;
    vscode: any;
  }
}

window.holeStates = window.holeStates || new Map<string, HoleState>();

export function getHoleState(holeId: string): HoleState {
  if (!window.holeStates.has(holeId)) {
    window.holeStates.set(holeId, { expanded: false });
  }
  return window.holeStates.get(holeId)!;
}

export function expandHole(holeId: string): void {
  const state = getHoleState(holeId);
  const header = document.querySelector(
    `[data-hole-id="${holeId}"].exp-dropdown-header`,
  ) as HTMLElement;

  if (!header) {
    return;
  }

  if (header.classList.contains('collapsed')) {
    header.classList.remove('collapsed');
    const body = header.nextElementSibling as HTMLElement;
    body.classList.remove('hidden');
    state.expanded = true;
  }
}

export function expandHoleForButton(btn: HTMLElement): void {
  const section = btn.closest('.exp-dropdown-section');
  if (section) {
    const holeId = section
      .closest('[data-hole-id]')
      ?.getAttribute('data-hole-id');
    if (holeId) {
      expandHole(holeId);
    }
  }
}
export function updateAllHolesFromState() {
  document.querySelectorAll('[data-hole-id]').forEach((element) => {
    const holeId = (element as HTMLElement).dataset.holeId!;
    const state = getHoleState(holeId);

    // Update expanded/collapsed state
    if (element.classList.contains('exp-dropdown-header')) {
      const header = element as HTMLElement;
      const body = header.nextElementSibling as HTMLElement | null;
      // Only expanded state is managed now
      if (state.expanded) {
        header.classList.remove('collapsed');
        if (body) {
          body.classList.remove('hidden');
        }
      } else {
        header.classList.add('collapsed');
        if (body) {
          body.classList.add('hidden');
        }
        state.expanded = false; // Sync state
      }
    }
  });
}
