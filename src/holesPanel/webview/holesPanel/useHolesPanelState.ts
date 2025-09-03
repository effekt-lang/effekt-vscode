/**
 * Main state management hook for the Holes Panel.
 *
 * Handles communication with VS Code through message passing and provides
 * actions for updating state and interacting with holes
 */

import { useState, useEffect, useCallback } from 'react';
import { EffektHoleInfo } from '../../effektHoleInfo';
import { HoleState } from './holeState';
import { Location as LSPLocation } from 'vscode-languageserver-protocol';
import { vscode, IncomingMessage } from '../vscodeApi';

export const useHolesPanelState = (initShowHoles: boolean) => {
  const [holes, setHoles] = useState<EffektHoleInfo[]>([]);
  const [expandedHoleId, setExpandedHoleId] = useState<string | null>(null);
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
          setExpandedHoleId(msg.holeId);
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
    setExpandedHoleId(id);
    setSelectedHoleId(null);
    vscode.postMessage({ command: 'jumpToHole', holeId: id });
  }, []);

  const handleJumpToDefinition = useCallback(
    (definitionLocation: LSPLocation) => {
      vscode.postMessage({ command: 'jumpToDefinition', definitionLocation });
    },
    [],
  );

  const handleDeselect = useCallback(() => {
    setExpandedHoleId(null);
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
    setExpandedHoleId,
    setSelectedHoleId,
    setShowHoles,
    handleJump,
    handleJumpToDefinition,
    handleDeselect,
  };

  return { state, actions };
};
