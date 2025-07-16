import React, { useEffect, useRef, useState } from 'react';
import { EffektHoleInfo } from '../effektHoleInfo';
import { BindingsSection } from './BindingsSection';

// VS Code API for webview communication
declare const acquireVsCodeApi: () => any;

interface HoleCardProps {
  hole: EffektHoleInfo;
  highlighted: boolean;
  onJump: (id: string) => void;
}

// Chat integration function
const solveHole = async (hole: EffektHoleInfo): Promise<void> => {
  const vscode = acquireVsCodeApi();

  // Send request to extension host to open copilot chat
  vscode.postMessage({
    type: 'open-copilot-chat',
    payload: {
      holeId: hole.id,
      expectedType: hole.expectedType,
      innerType: hole.innerType,
      scope: hole.scope,
    },
  });
};

export const HoleCard: React.FC<HoleCardProps> = ({
  hole,
  highlighted,
  onJump,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSolving, setIsSolving] = useState(false);

  useEffect(() => {
    if (highlighted) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlighted]);

  const handleSolve = async () => {
    setIsSolving(true);
    try {
      await solveHole(hole);
      // Chat window will open automatically, no need to handle response
    } catch (error) {
      console.error('Error opening copilot chat:', error);
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <section
      ref={cardRef}
      className={`hole-card${highlighted ? ' highlighted' : ''}`}
      id={`hole-${hole.id}`}
      onClick={highlighted ? undefined : () => onJump(hole.id)}
    >
      <div className="hole-header">
        <span className="hole-id">Hole: {hole.id}</span>
        <button
          className="solve-button"
          onClick={(e) => {
            e.stopPropagation();
            handleSolve();
          }}
          disabled={isSolving}
        >
          {isSolving ? 'Solving...' : 'Solve'}
        </button>
      </div>
      {hole.expectedType && (
        <div className="hole-field">
          <span className="field-label">Expected Type:</span>
          <span className="field-value">{hole.expectedType}</span>
        </div>
      )}
      {hole.innerType && (
        <div className="hole-field">
          <span className="field-label">Inner type:</span>
          <span className="field-value">{hole.innerType}</span>
        </div>
      )}
      <BindingsSection
        scope={hole.scope}
        holeId={hole.id}
        isActive={highlighted}
      />
    </section>
  );
};
