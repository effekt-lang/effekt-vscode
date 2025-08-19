import { useCallback } from 'react';
import { EffektHoleInfo } from '../../effektHoleInfo';

interface HoleActionsState {
  holes: EffektHoleInfo[];
  selectedHoleId: string | null;
  highlightedHoleId: string | null;
}

interface HoleActionsCallbacks {
  setSelectedHoleId: (id: string | null) => void;
  setHighlightedHoleId: (id: string | null) => void;
  handleJump: (id: string) => void;
  selectFirstHole: () => void;
}

export const useHoleActions = (
  state: HoleActionsState,
  callbacks: HoleActionsCallbacks,
) => {
  const { selectedHoleId, highlightedHoleId } = state;
  const {
    setSelectedHoleId,
    setHighlightedHoleId,
    handleJump,
    selectFirstHole,
  } = callbacks;

  const expandSelectedHole = useCallback((): void => {
    if (selectedHoleId) {
      if (highlightedHoleId === selectedHoleId) {
        setHighlightedHoleId(null);
      } else {
        // Not expanded, expand it
        handleJump(selectedHoleId);
      }
    } else if (highlightedHoleId) {
      // If there's a highlighted hole but no selection, select it and then collapse
      setSelectedHoleId(highlightedHoleId);
      setHighlightedHoleId(null);
    } else {
      // No hole selected or highlighted, select first hole
      selectFirstHole();
    }
  }, [
    selectedHoleId,
    highlightedHoleId,
    setHighlightedHoleId,
    handleJump,
    setSelectedHoleId,
    selectFirstHole,
  ]);

  const clearSelection = useCallback((): void => {
    setHighlightedHoleId(null);
    setSelectedHoleId(null);
  }, [setHighlightedHoleId, setSelectedHoleId]);

  return {
    expandSelectedHole,
    clearSelection,
  };
};
