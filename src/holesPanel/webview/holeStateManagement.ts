import { HoleState } from './holeState';

const holeStates = new Map<string, HoleState>();

function getHoleState(holeId: string): HoleState {
  if (!holeStates.has(holeId)) {
    holeStates.set(holeId, { expanded: false, highlighted: false });
  }
  return holeStates.get(holeId)!;
}

function setHoleState(holeId: string, state: HoleState): void {
  holeStates.set(holeId, state);

  const header = document.querySelector(
    `[data-hole-id="${holeId}"].exp-dropdown-header`,
  )! as HTMLElement;

  if (state.expanded) {
    header.classList.remove('collapsed');
  } else {
    header.classList.add('collapsed');
  }

  const card = document.getElementById('hole-' + holeId)!;
  if (state.highlighted) {
    card.classList.add('highlighted');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    card.classList.remove('highlighted');
  }
}

export function expandHole(holeId: string): void {
  const currentState = getHoleState(holeId);
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
  setHoleState(holeId, { ...currentState, expanded: false });
}

export function highlightHole(holeId: string): void {
  holeStates.forEach((state, id) => {
    if (state.highlighted) {
      setHoleState(id, { ...state, highlighted: false });
    }
  });
  const currentState = getHoleState(holeId);
  setHoleState(holeId, { ...currentState, highlighted: true });
}
