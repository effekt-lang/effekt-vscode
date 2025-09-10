/**
 * Hook for navigating between bindings within an expanded hole
 *
 * Provides functions to move between bindings (next/previous), focus search bar,
 * and handle binding selection. Works together with hole navigation for multi-layer navigation.
 */

import { useCallback } from 'react';
import { HoleState } from './holeState';
import { BindingInfo } from '../../effektHoleInfo';

interface BindingNavigationActions {
  setSelectedBindingIndex: (index: number | null) => void;
  handleJumpToDefinition: (definitionLocation: any) => void;
}

export const useBindingNavigation = (
  state: HoleState,
  actions: BindingNavigationActions,
  filteredBindings: BindingInfo[],
) => {
  const { expandedHoleId, selectedBindingIndex } = state;
  const { setSelectedBindingIndex, handleJumpToDefinition } = actions;

  const isInBindingMode =
    expandedHoleId !== null && selectedBindingIndex !== null;

  const navigateToNextBinding = useCallback((): void => {
    if (!expandedHoleId || filteredBindings.length === 0) {
      return;
    }

    const currentIndex = selectedBindingIndex ?? -1;
    const nextIndex =
      currentIndex < filteredBindings.length - 1 ? currentIndex + 1 : 0;

    setSelectedBindingIndex(nextIndex);
    scrollToBinding(nextIndex, expandedHoleId);
  }, [
    expandedHoleId,
    filteredBindings,
    selectedBindingIndex,
    setSelectedBindingIndex,
  ]);

  const navigateToPreviousBinding = useCallback((): void => {
    if (!expandedHoleId || filteredBindings.length === 0) {
      return;
    }

    const currentIndex = selectedBindingIndex ?? 0;
    const prevIndex =
      currentIndex > 0 ? currentIndex - 1 : filteredBindings.length - 1;

    setSelectedBindingIndex(prevIndex);
    scrollToBinding(prevIndex, expandedHoleId);
  }, [
    expandedHoleId,
    filteredBindings,
    selectedBindingIndex,
    setSelectedBindingIndex,
  ]);

  const enterBindingMode = useCallback((): void => {
    if (!expandedHoleId || filteredBindings.length === 0) {
      return;
    }

    setSelectedBindingIndex(0);
    scrollToBinding(0, expandedHoleId);
  }, [expandedHoleId, filteredBindings, setSelectedBindingIndex]);

  const exitBindingMode = useCallback((): void => {
    setSelectedBindingIndex(null);

    // Focus the search bar
    const holeId = expandedHoleId;
    if (holeId) {
      const searchInput = document
        .querySelector(`#bindings-dropdown-list-${holeId}`)
        ?.closest('.bindings-section')
        ?.querySelector('input[type="text"]') as HTMLInputElement;

      if (searchInput) {
        searchInput.focus();
      }
    }
  }, [expandedHoleId, setSelectedBindingIndex]);

  const jumpToSelectedBinding = useCallback((): void => {
    if (
      selectedBindingIndex === null ||
      !filteredBindings[selectedBindingIndex]
    ) {
      return;
    }

    const binding = filteredBindings[selectedBindingIndex];
    if (binding.definitionLocation) {
      handleJumpToDefinition(binding.definitionLocation);
    }
  }, [selectedBindingIndex, filteredBindings, handleJumpToDefinition]);

  return {
    isInBindingMode,
    navigateToNextBinding,
    navigateToPreviousBinding,
    enterBindingMode,
    exitBindingMode,
    jumpToSelectedBinding,
    scrollHoleCardIntoView,
  };
};

function scrollToBinding(bindingIndex: number, holeId: string): void {
  // Find the binding element by index within the hole's bindings list
  const bindingElement = document.querySelector(
    `#bindings-dropdown-list-${holeId} .binding:nth-of-type(${bindingIndex + 1})`,
  );
  if (bindingElement) {
    bindingElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function scrollHoleCardIntoView(holeId?: string) {
  // Scroll the parent hole card into view
  let selector = '.hole-card.expanded';
  if (holeId) {
    selector = `#hole-${holeId}`;
  }
  const card = document.querySelector(selector);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
