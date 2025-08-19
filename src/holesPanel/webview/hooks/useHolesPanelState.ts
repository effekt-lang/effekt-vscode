import { useState, useEffect, useCallback } from 'react';
import { EffektHoleInfo } from '../../effektHoleInfo';
import { IncomingMessage, OutgoingMessage } from '../messages';

declare function acquireVsCodeApi<T>(): { postMessage(msg: T): void };

const vscode = acquireVsCodeApi<OutgoingMessage>();

interface HolesPanelState {
  holes: EffektHoleInfo[];
  highlightedHoleId: string | null;
  selectedHoleId: string | null;
  showHoles: boolean;
}

export const useHolesPanelState = (initShowHoles: boolean) => {
  const [holes, setHoles] = useState<EffektHoleInfo[]>([]);
  const [highlightedHoleId, setHighlightedHoleId] = useState<string | null>(
    null,
  );
  const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
  const [showHoles, setShowHoles] = useState<boolean>(initShowHoles);

  useEffect(() => {
    const handler = (event: MessageEvent<IncomingMessage>) => {
      const msg = event.data;
      switch (msg.command) {
        case 'updateHoles':
          setHoles(msg.holes);
          setHighlightedHoleId(null);
          setSelectedHoleId(null);
          break;
        case 'highlightHole':
          setHighlightedHoleId(msg.holeId);
          setSelectedHoleId(null);
          break;
        case 'setShowHoles':
          setShowHoles(msg.show);
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleJump = useCallback((id: string) => {
    setHighlightedHoleId(id);
    setSelectedHoleId(null);
    vscode.postMessage({ command: 'jumpToHole', holeId: id });
  }, []);

  const handleDeselect = useCallback(() => {
    setHighlightedHoleId(null);
    setSelectedHoleId(null);
  }, []);

  const state: HolesPanelState = {
    holes,
    highlightedHoleId,
    selectedHoleId,
    showHoles,
  };
  const actions = {
    setHoles,
    setHighlightedHoleId,
    setSelectedHoleId,
    setShowHoles,
    handleJump,
    handleDeselect,
  };

  return { state, actions };
};
