import { updateHoleView } from './view';

export interface HoleState {
  expanded: boolean;
  highlighted: boolean;
  showDefined: boolean;
  showImported: boolean;
  filter: string;
}

const holeStates = new Map<string, HoleState>();

export function updateHoleStates(holes: { id: string }[]): void {
  holes.forEach((hole) => {
    if (!holeStates.has(hole.id)) {
      setHoleState(hole.id, {
        expanded: false,
        highlighted: false,
        showDefined: true,
        showImported: false,
        filter: '',
      });
    } else {
      setHoleState(hole.id, holeStates.get(hole.id)!);
    }
  });
}

function getHoleState(holeId: string): HoleState {
  if (!holeStates.has(holeId)) {
    holeStates.set(holeId, {
      expanded: false,
      highlighted: false,
      showDefined: true,
      showImported: false,
      filter: '',
    });
  }
  return holeStates.get(holeId)!;
}

function setHoleState(holeId: string, state: HoleState): void {
  holeStates.set(holeId, state);
  updateHoleView(holeId, state);
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

export function filterHole(holeId: string, filter: string): void {
  const currentState = getHoleState(holeId);
  setHoleState(holeId, { ...currentState, filter: filter.toLowerCase() });
}

export function filterHoleByDefined(
  holeId: string,
  showDefined: boolean,
): void {
  const currentState = getHoleState(holeId);
  setHoleState(holeId, { ...currentState, showDefined });
}

export function filterHoleByImported(
  holeId: string,
  showImported: boolean,
): void {
  const currentState = getHoleState(holeId);
  setHoleState(holeId, { ...currentState, showImported });
}
