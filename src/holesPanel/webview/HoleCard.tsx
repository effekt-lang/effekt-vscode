import React, { useEffect, useRef } from 'react';
import { EffektHoleInfo } from '../effektHoleInfo';
import { BindingsSection } from './BindingsSection';
import { VSCodeAPI } from './vscodeApi';

interface HoleCardProps {
  hole: EffektHoleInfo;
  highlighted: boolean;
  onJump: (id: string) => void;
  vscode: VSCodeAPI;
}

export const HoleCard: React.FC<HoleCardProps> = ({
  hole,
  highlighted,
  onJump,
  vscode,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlighted]);

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
            solveHole(hole, vscode);
          }}
        >
          Solve
        </button>
        <button
          className="solve-button"
          onClick={(e) => {
            e.stopPropagation();
            explainHole(hole, vscode);
          }}
          title="Explain the required type/effects and show a tiny example"
        >
          Explain
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

const solveHole = async (
  hole: EffektHoleInfo,
  vscode: VSCodeAPI,
): Promise<void> => {
  vscode.postMessage({
    command: 'openCopilotChat',
    holeId: hole.id,
  });
};

const explainHole = async (
  hole: EffektHoleInfo,
  vscode: VSCodeAPI,
): Promise<void> => {
  vscode.postMessage({
    command: 'explainHole',
    holeId: hole.id,
  });
};
