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
        <div className="button-group basic-actions">
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
          <button
            className="solve-button"
            onClick={(e) => {
              e.stopPropagation();
              suggestNextStep(hole, vscode);
            }}
            title="Suggest the next small step toward solving this hole"
          >
            Next step
          </button>
        </div>

        <div className="button-group tdd-workflow">
          <button
            className="solve-button tdd-button"
            onClick={(e) => {
              e.stopPropagation();
              writeTestFirst(hole, vscode);
            }}
            title="Write a test first that defines expected behavior"
          >
            Write Test First
          </button>
          <button
            className="solve-button tdd-button"
            onClick={(e) => {
              e.stopPropagation();
              runTests(hole, vscode);
            }}
            title="Run tests to see current failures"
          >
            Run Tests
          </button>
          <button
            className="solve-button tdd-button"
            onClick={(e) => {
              e.stopPropagation();
              implementToPass(hole, vscode);
            }}
            title="Implement the hole to make tests pass"
          >
            Implement to Pass
          </button>
        </div>

        <div className="button-group test-utilities">
          <button
            className="solve-button test-button"
            onClick={(e) => {
              e.stopPropagation();
              createTests(hole, vscode);
            }}
            title="Create comprehensive tests for this hole"
          >
            Create Tests
          </button>
        </div>
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

const suggestNextStep = async (
  hole: EffektHoleInfo,
  vscode: VSCodeAPI,
): Promise<void> => {
  vscode.postMessage({
    command: 'suggestNextStep',
    holeId: hole.id,
  });
};

const createTests = async (
  hole: EffektHoleInfo,
  vscode: VSCodeAPI,
): Promise<void> => {
  vscode.postMessage({
    command: 'createTests',
    holeId: hole.id,
  });
};

const writeTestFirst = async (
  hole: EffektHoleInfo,
  vscode: VSCodeAPI,
): Promise<void> => {
  vscode.postMessage({
    command: 'writeTestFirst',
    holeId: hole.id,
  });
};

const runTests = async (
  hole: EffektHoleInfo,
  vscode: VSCodeAPI,
): Promise<void> => {
  vscode.postMessage({
    command: 'runTests',
    holeId: hole.id,
  });
};

const implementToPass = async (
  hole: EffektHoleInfo,
  vscode: VSCodeAPI,
): Promise<void> => {
  vscode.postMessage({
    command: 'implementToPass',
    holeId: hole.id,
  });
};
