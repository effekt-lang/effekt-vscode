export {}; // Ensures this file is treated as a TypeScript module (not a script), which is required for global type augmentation.
import { HoleState } from '../holesViewProvider';

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

export function toggleDropdown(header: HTMLElement): void {
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

export function togglePinState(btn: HTMLElement): void {
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

export function expandHole(holeId: string): void {
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
