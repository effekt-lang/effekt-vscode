import { useCallback } from 'react';
import { HoleState } from './holeState';
interface HoleActionsCallbacks {
  setSelectedHoleId: (id: string | null) => void;
  setexpandedHoleId: (id: string | null) => void;
  handleJump: (id: string) => void;
  selectFirstHole: () => void;
}

export const useHoleActions = (
  state: HoleState,
  callbacks: HoleActionsCallbacks,
) => {
  const { selectedHoleId, expandedHoleId } = state;
  const { setSelectedHoleId, setexpandedHoleId, handleJump, selectFirstHole } =
    callbacks;

  const expandSelectedHole = useCallback((): void => {
    if (selectedHoleId) {
      if (expandedHoleId === selectedHoleId) {
        setexpandedHoleId(null);
      } else {
        handleJump(selectedHoleId);
      }
    } else if (expandedHoleId) {
      // If hole is expanded but no selection, select it and then collapse
      setSelectedHoleId(expandedHoleId);
      setexpandedHoleId(null);
    } else {
      // No hole selected or expanded - default
      selectFirstHole();
    }
  }, [
    selectedHoleId,
    expandedHoleId,
    setexpandedHoleId,
    handleJump,
    setSelectedHoleId,
    selectFirstHole,
  ]);

  const clearSelection = useCallback((): void => {
    setexpandedHoleId(null);
    setSelectedHoleId(null);
  }, [setexpandedHoleId, setSelectedHoleId]);

  return {
    expandSelectedHole,
    clearSelection,
  };
};
