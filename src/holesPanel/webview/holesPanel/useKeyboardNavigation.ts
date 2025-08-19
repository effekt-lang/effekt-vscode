/**
 * Hook for handling keyboard navigation in the holes panel
 *
 * Sets up global keyboard event listeners and manages key bindings
 * Moves all behavior logic to the individual key handlers
 */

import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface KeyBindings {
  Escape: KeyHandler;
  ArrowUp: KeyHandler;
  ArrowDown: KeyHandler;
  Enter: KeyHandler;
  ' ': KeyHandler;
  ArrowLeft: KeyHandler;
  ArrowRight: KeyHandler;
}

export const isInputFocused = (): boolean => {
  const activeElement = document.activeElement;
  return activeElement?.tagName === 'INPUT';
};

export const blurActiveInput = (): void => {
  const activeElement = document.activeElement;
  if (activeElement?.tagName === 'INPUT') {
    (activeElement as HTMLInputElement)!.blur();
  }
};

export const useKeyboardNavigation = (keyBindings: Partial<KeyBindings>) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key } = event;
      const handler = keyBindings[key as keyof KeyBindings]!;

      handler(event);
    },
    [keyBindings],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
