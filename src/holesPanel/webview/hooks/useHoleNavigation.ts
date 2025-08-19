import { useCallback } from 'react';
import { HoleState } from './holeState';
interface HoleNavigationActions {
  setSelectedHoleId: (id: string | null) => void;
  setHighlightedHoleId: (id: string | null) => void;
}

export const useHoleNavigation = (
  state: HoleState,
  actions: HoleNavigationActions,
) => {
  const { holes, selectedHoleId, highlightedHoleId } = state;
  const { setSelectedHoleId, setHighlightedHoleId } = actions;

  const getCurrentIndex = useCallback((): number => {
    if (selectedHoleId) {
      return holes.findIndex((h) => h.id === selectedHoleId);
    }
    if (highlightedHoleId) {
      return holes.findIndex((h) => h.id === highlightedHoleId);
    }
    return -1;
  }, [holes, selectedHoleId, highlightedHoleId]);

  const scrollToHole = useCallback((holeId: string): void => {
    const holeElement = document.getElementById(`hole-${holeId}`);
    holeElement!.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, []);

  const navigateToNextHole = useCallback((): void => {
    if (holes.length === 0) {
      return;
    }

    const currentIndex = getCurrentIndex();
    const nextIndex = currentIndex < holes.length - 1 ? currentIndex + 1 : 0;
    const nextHole = holes[nextIndex]!;

    setHighlightedHoleId(null);
    setSelectedHoleId(nextHole.id);
    scrollToHole(nextHole.id);
  }, [
    holes,
    getCurrentIndex,
    setHighlightedHoleId,
    setSelectedHoleId,
    scrollToHole,
  ]);

  const navigateToPreviousHole = useCallback((): void => {
    if (holes.length === 0) {
      return;
    }

    const currentIndex = getCurrentIndex();
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : holes.length - 1;
    const prevHole = holes[prevIndex]!;

    setHighlightedHoleId(null);
    setSelectedHoleId(prevHole.id);
    scrollToHole(prevHole.id);
  }, [
    holes,
    getCurrentIndex,
    setHighlightedHoleId,
    setSelectedHoleId,
    scrollToHole,
  ]);

  const selectFirstHole = useCallback((): void => {
    if (holes.length === 0) {
      return;
    }

    const firstHole = holes[0];
    setSelectedHoleId(firstHole.id);
    scrollToHole(firstHole.id);
  }, [holes, setSelectedHoleId, scrollToHole]);

  return {
    navigateToNextHole,
    navigateToPreviousHole,
    selectFirstHole,
    scrollToHole,
  };
};
