import React, { useState, useEffect, useCallback } from 'react';
import { EffektHoleInfo } from '../effektHoleInfo';
import { HoleCard } from './HoleCard';

declare function acquireVsCodeApi<T>(): { postMessage(msg: T): void };

interface OutgoingMessage {
  command: 'jumpToHole';
  holeId?: string;
}
type IncomingMessage =
  | { command: 'highlightHole'; holeId: string }
  | { command: 'updateHoles'; holes: EffektHoleInfo[] }
  | { command: 'setShowHoles'; show: boolean };

const vscode = acquireVsCodeApi<OutgoingMessage>();

const Description: React.FC = () => (
  <div className="desc" data-holes-panel-desc>
    This panel shows information about the types and terms in scope for each
    typed hole. Holes are placeholders for missing code used for type-driven
    development. You can create a hole using the <code>&lt;&gt;</code> syntax.
    For example, you can write a definition without a right-hand side as
    follows:
    <pre>def foo() = &lt;&gt;</pre>
    Use{' '}
    <code>
      &lt;{'{'}x{'}'}&gt;
    </code>{' '}
    in order to fill in a hole with a statement or expression <code>x</code>,
    for example:
    <pre>
      def foo() = &lt;{'{'} println("foo"); 42 {'}'}&gt;
    </pre>
  </div>
);

const Warning: React.FC = () => (
  <div className="empty">
    <div className="warning">
      <b>Warning:</b> The Holes Panel requires the setting{' '}
      <b>Extension &gt; Effekt &gt; Show Holes</b> to be enabled to function.
    </div>
  </div>
);

export const HolesPanel: React.FC<{ initShowHoles: boolean }> = ({
  initShowHoles,
}) => {
  const [holes, setHoles] = useState<EffektHoleInfo[]>([]);
  const [highlightedHoleId, setHighlightedHoleId] = useState<string | null>(
    null,
  );
  const [showHoles, setShowHoles] = useState<boolean>(initShowHoles);

  useEffect(() => {
    const handler = (event: MessageEvent<IncomingMessage>) => {
      const msg = event.data;
      if (msg.command === 'updateHoles') {
        setHoles(msg.holes);
        setHighlightedHoleId(null);
      } else if (msg.command === 'highlightHole') {
        setHighlightedHoleId(msg.holeId);
      } else if (msg.command === 'setShowHoles') {
        setShowHoles(msg.show);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleJump = useCallback((id: string) => {
    vscode.postMessage({ command: 'jumpToHole', holeId: id });
  }, []);

  const handleDeselect = useCallback(() => {
    setHighlightedHoleId(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHighlightedHoleId(null);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (holes.length === 0) {
          return;
        }

        e.preventDefault();
        const currentIndex = highlightedHoleId
          ? holes.findIndex((h) => h.id === highlightedHoleId)
          : -1;

        let nextIndex: number;
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < holes.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : holes.length - 1;
        }

        const nextHole = holes[nextIndex];
        if (nextHole) {
          vscode.postMessage({ command: 'jumpToHole', holeId: nextHole.id });
        }
      } else if (e.key === 'Enter') {
        if (holes.length === 0) {
          return;
        }

        e.preventDefault();
        if (!highlightedHoleId) {
          // No hole selected, jump to first hole
          const firstHole = holes[0];
          if (firstHole) {
            vscode.postMessage({ command: 'jumpToHole', holeId: firstHole.id });
          }
        }
      } else if (e.key === '/' && highlightedHoleId) {
        // Focus search bar when inside a hole
        e.preventDefault();
        const searchBox = document.querySelector(
          '.filter-box',
        ) as HTMLInputElement;
        if (searchBox) {
          searchBox.focus();
          searchBox.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [holes, highlightedHoleId]);

  return (
    <div className="holes-list">
      {!showHoles && <Warning />}
      {holes.length === 0 ? (
        <div className="empty">There are no holes in this file.</div>
      ) : (
        holes.map((h) => (
          <HoleCard
            key={h.id}
            hole={h}
            highlighted={h.id === highlightedHoleId}
            onJump={handleJump}
            onDeselect={handleDeselect}
          />
        ))
      )}
      {holes.length === 0 && <Description />}
    </div>
  );
};
