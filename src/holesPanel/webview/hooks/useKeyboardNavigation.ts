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

const isInputFocused = (): boolean => {
  const activeElement = document.activeElement;
  return activeElement?.tagName === 'INPUT';
};

const blurActiveInput = (): void => {
  const activeElement = document.activeElement;
  if (activeElement?.tagName === 'INPUT') {
    (activeElement as HTMLInputElement).blur();
  }
};

export const useKeyboardNavigation = (keyBindings: Partial<KeyBindings>) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key } = event;
      const handler = keyBindings[key as keyof KeyBindings];

      if (!handler) {
        return;
      }

      if (key === 'Escape') {
        if (isInputFocused()) {
          blurActiveInput();
          event.preventDefault();
          return;
        }
        handler(event);
        return;
      }

      if (key === 'ArrowUp' || key === 'ArrowDown') {
        handler(event);
        return;
      }

      if (!isInputFocused()) {
        handler(event);
      }
    },
    [keyBindings],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
