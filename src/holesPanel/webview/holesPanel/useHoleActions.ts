/**
 * Hook for handling user actions on holes
 *
 * Provides functions for expanding/collapsing holes, clearing selections
 * and managing the interaction between selected and expanded states
 */

import { useCallback } from 'react';
import { HoleState } from './holeState';
import { isInputFocused, blurActiveInput } from './useKeyboardNavigation';
interface HoleActionsCallbacks {
  setSelectedHoleId: (id: string | null) => void;
  setExpandedHoleId: (id: string | null) => void;
  handleJump: (id: string) => void;
  selectFirstHole: () => void;
}

export const useHoleActions = (
  state: HoleState,
  callbacks: HoleActionsCallbacks,
) => {
  const { selectedHoleId, expandedHoleId } = state;
  const { setSelectedHoleId, setExpandedHoleId, handleJump, selectFirstHole } =
    callbacks;

  const expandSelectedHole = useCallback((): void => {
    if (isInputFocused()) {
      return;
    }

    if (selectedHoleId) {
      if (expandedHoleId === selectedHoleId) {
        setExpandedHoleId(null);
      } else {
        handleJump(selectedHoleId);
      }
    } else if (expandedHoleId) {
      // If hole is expanded but no selection, select it and then collapse
      setSelectedHoleId(expandedHoleId);
      setExpandedHoleId(null);
    } else {
      // No hole selected or expanded - default
      selectFirstHole();
    }
  }, [
    selectedHoleId,
    expandedHoleId,
    setExpandedHoleId,
    handleJump,
    setSelectedHoleId,
    selectFirstHole,
  ]);

  const clearSelection = useCallback(
    (event?: KeyboardEvent): void => {
      if (isInputFocused()) {
        blurActiveInput();
        event?.preventDefault();
      } else {
        setExpandedHoleId(null);
        setSelectedHoleId(null);
      }
    },
    [setExpandedHoleId, setSelectedHoleId],
  );

  return {
    expandSelectedHole,
    clearSelection,
  };
};
