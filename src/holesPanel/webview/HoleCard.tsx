import React, { useEffect, useRef } from 'react';
import { EffektHoleInfo } from '../effektHoleInfo';
import { BindingsSection } from './BindingsSection';
import { Location as LSPLocation } from 'vscode-languageserver-protocol';
import { vscode } from './vscodeApi';

interface HoleCardProps {
  hole: EffektHoleInfo;
  expanded: boolean;
  selected: boolean;
  selectedBindingIndex?: number | null;
  onJump: (id: string) => void;
  onJumpToDefinition: (definitionLocation: LSPLocation) => void;
  onDeselect: () => void;
  onFilteredBindingsChange?: (bindings: any[]) => void;
  agentSupport: boolean;
}

export const HoleCard: React.FC<HoleCardProps> = ({
  hole,
  expanded,
  selected,
  selectedBindingIndex,
  onJump,
  onJumpToDefinition,
  onDeselect,
  onFilteredBindingsChange,
  agentSupport,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded) {
      cardRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [expanded]);

  return (
    <section
      ref={cardRef}
      className={`hole-card${expanded ? ' expanded' : ''}${selected ? ' selected' : ''}`}
      id={`hole-${hole.id}`}
      onClick={() => {
        if (expanded) {
          onDeselect();
        } else {
          onJump(hole.id);
        }
      }}
    >
      <div className="hole-header">
        <span className="hole-id">Hole: {hole.id}</span>
        {agentSupport && (
          <button
            className="solve-button"
            onClick={(e) => {
              e.stopPropagation();
              solveHole(hole);
            }}
          >
            Solve
          </button>
        )}
      </div>
      {hole.expectedType && (
        <div className="hole-field" onClick={(e) => e.stopPropagation()}>
          <span className="field-label">Expected Type:</span>
          <span className="field-value">{hole.expectedType}</span>
        </div>
      )}
      {hole.innerType && (
        <div className="hole-field" onClick={(e) => e.stopPropagation()}>
          <span className="field-label">Inner type:</span>
          <span className="field-value">{hole.innerType}</span>
        </div>
      )}
      <BindingsSection
        scope={hole.scope}
        holeId={hole.id}
        isActive={expanded}
        selectedBindingIndex={selectedBindingIndex}
        onJumpToDefinition={onJumpToDefinition}
        onFilteredBindingsChange={onFilteredBindingsChange}
      />
    </section>
  );
};

const solveHole = async (hole: EffektHoleInfo): Promise<void> => {
  vscode.postMessage({
    command: 'openCopilotChat',
    holeId: hole.id,
  });
};
