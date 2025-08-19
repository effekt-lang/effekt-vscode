/**
 * Hook for navigating between holes in panel
 *
 * Provides functions to move between holes (next/previous), scroll to specific holes,
 * and manage the current selection index. Handles circular navigation through the hole list
 */

import { useCallback } from 'react';
import { HoleState } from './holeState';
interface HoleNavigationActions {
  setSelectedHoleId: (id: string | null) => void;
  setExpandedHoleId: (id: string | null) => void;
}

export const useHoleNavigation = (
  state: HoleState,
  actions: HoleNavigationActions,
) => {
  const { holes, selectedHoleId, expandedHoleId } = state;
  const { setSelectedHoleId, setExpandedHoleId } = actions;

  const getCurrentIndex = useCallback((): number => {
    if (selectedHoleId) {
      return holes.findIndex((h) => h.id === selectedHoleId);
    }
    if (expandedHoleId) {
      return holes.findIndex((h) => h.id === expandedHoleId);
    }
    return -1;
  }, [holes, selectedHoleId, expandedHoleId]);

  const scrollToHole = useCallback((holeId: string): void => {
    const holeElement = document.getElementById(`hole-${holeId}`);
    holeElement!.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const navigateToNextHole = useCallback((): void => {
    if (holes.length === 0) {
      return;
    }

    const currentIndex = getCurrentIndex();
    const nextIndex = currentIndex < holes.length - 1 ? currentIndex + 1 : 0;
    const nextHole = holes[nextIndex]!;

    setExpandedHoleId(null);
    setSelectedHoleId(nextHole.id);
    scrollToHole(nextHole.id);
  }, [
    holes,
    getCurrentIndex,
    setExpandedHoleId,
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

    setExpandedHoleId(null);
    setSelectedHoleId(prevHole.id);
    scrollToHole(prevHole.id);
  }, [
    holes,
    getCurrentIndex,
    setExpandedHoleId,
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
