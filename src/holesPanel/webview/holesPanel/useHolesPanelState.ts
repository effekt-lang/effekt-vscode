/**
 * Main state management hook for the Holes Panel.
 *
 * Handles communication with VS Code through message passing and provides
 * actions for updating state and interacting with holes
 */

import { useState, useEffect, useCallback } from 'react';
import { EffektHoleInfo } from '../../effektHoleInfo';
import { IncomingMessage, OutgoingMessage } from '../messages';
import { HoleState } from './holeState';

declare function acquireVsCodeApi<T>(): { postMessage(msg: T): void };

const vscode = acquireVsCodeApi<OutgoingMessage>();

export const useHolesPanelState = (initShowHoles: boolean) => {
  const [holes, setHoles] = useState<EffektHoleInfo[]>([]);
  const [expandedHoleId, setexpandedHoleId] = useState<string | null>(null);
  const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
  const [showHoles, setShowHoles] = useState<boolean>(initShowHoles);

  useEffect(() => {
    const handler = (event: MessageEvent<IncomingMessage>) => {
      const msg = event.data;
      switch (msg.command) {
        case 'updateHoles':
          setHoles(msg.holes);
          setExpandedHoleId(null);
          setSelectedHoleId(null);
          break;
        case 'highlightHole':
          setexpandedHoleId(msg.holeId);
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
    setexpandedHoleId(id);
    setSelectedHoleId(null);
    vscode.postMessage({ command: 'jumpToHole', holeId: id });
  }, []);

  const handleDeselect = useCallback(() => {
    setexpandedHoleId(null);
    setSelectedHoleId(null);
  }, []);

  const state: HoleState = {
    holes,
    expandedHoleId,
    selectedHoleId,
    showHoles,
  };
  const actions = {
    setHoles,
    setexpandedHoleId,
    setSelectedHoleId,
    setShowHoles,
    handleJump,
    handleDeselect,
  };

  return { state, actions };
};
