import { HoleState } from './holesViewProvider';

// declare global is used to safely extend the global Window interface with custom properties
declare global {
  interface Window {
    holeStates: Map<string, HoleState>;
  }
}

window.holeStates = window.holeStates || new Map<string, HoleState>();

function getHoleState(holeId: string): HoleState {
  if (!window.holeStates.has(holeId)) {
    window.holeStates.set(holeId, { expanded: false });
  }
  return window.holeStates.get(holeId)!;
}

function setHoleState(holeId: string, state: HoleState): void {
  window.holeStates.set(holeId, state);
}

export function expandHole(holeId: string): void {
  const currentState = getHoleState(holeId);
  const header = document.querySelector(
    `[data-hole-id="${holeId}"].exp-dropdown-header`,
  ) as HTMLElement;

  header.classList.remove('collapsed');
  setHoleState(holeId, { ...currentState, expanded: true });
}

export function expandHoleForButton(btn: HTMLElement): void {
  const section = btn.closest('.exp-dropdown-section');
  const holeId = section!
    .closest('[data-hole-id]')!
    .getAttribute('data-hole-id');
  expandHole(holeId!);
}

export function toggleHole(holeId: string): void {
  const state = getHoleState(holeId);
  if (state.expanded) {
    collapseHole(holeId);
  } else {
    expandHole(holeId);
  }
}

function collapseHole(holeId: string): void {
  const currentState = getHoleState(holeId);
  const header = document.querySelector(
    `[data-hole-id="${holeId}"].exp-dropdown-header`,
  ) as HTMLElement;

  header.classList.add('collapsed');

  setHoleState(holeId, { ...currentState, expanded: false });
}

export function updateAllHolesFromState() {
  document.querySelectorAll('[data-hole-id]').forEach((element) => {
    const holeId = (element as HTMLElement).dataset.holeId!;
    const state = getHoleState(holeId);

    if (state.expanded) {
      expandHole(holeId);
    } else {
      collapseHole(holeId);
    }
  });
}
