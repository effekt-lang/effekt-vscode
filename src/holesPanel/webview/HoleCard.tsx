import React, { useEffect, useRef, useState } from 'react';
import {
  EffektHoleInfo,
  ScopeInfo,
  BINDING_ORIGIN_DEFINED,
} from '../effektHoleInfo';
import { BindingsSection } from './BindingsSection';

// VS Code API type
interface VsCodeApi {
  postMessage(msg: any): void;
}

interface HoleCardProps {
  hole: EffektHoleInfo;
  highlighted: boolean;
  onJump: (id: string) => void;
  vscode: VsCodeApi;
}

// Filter function to remove imported bindings from scope
const filterImportedBindings = (scope: ScopeInfo): ScopeInfo => {
  return {
    ...scope,
    bindings: scope.bindings.filter(
      (binding) => binding.origin === BINDING_ORIGIN_DEFINED,
    ),
    outer: scope.outer ? filterImportedBindings(scope.outer) : undefined,
  };
};

// Filter function to create a clean hole info without imported bindings
const filterHoleInfo = (hole: EffektHoleInfo): EffektHoleInfo => {
  return {
    ...hole,
    scope: filterImportedBindings(hole.scope),
  };
};

// Chat integration function
const solveHole = async (
  hole: EffektHoleInfo,
  vscode: VsCodeApi,
): Promise<void> => {
  // Filter out imported bindings to reduce noise
  const filteredHole = filterHoleInfo(hole);

  // Send request to extension host to open copilot chat
  vscode.postMessage({
    type: 'open-copilot-chat',
    payload: {
      holeId: filteredHole.id,
      expectedType: filteredHole.expectedType,
      innerType: filteredHole.innerType,
      scope: filteredHole.scope,
    },
  });
};

export const HoleCard: React.FC<HoleCardProps> = ({
  hole,
  highlighted,
  onJump,
  vscode,
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
      await solveHole(hole, vscode);
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
