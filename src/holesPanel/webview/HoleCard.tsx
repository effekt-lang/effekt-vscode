import React, { useEffect, useRef, useState } from 'react';
import { EffektHoleInfo } from '../effektHoleInfo';
import { BindingsSection } from './BindingsSection';

interface HoleCardProps {
  hole: EffektHoleInfo;
  expanded: boolean;
  selected: boolean;
  onJump: (id: string) => void;
  onDeselect: () => void;
}

// Placeholder function for MCP server communication
const solveHole = async (hole: EffektHoleInfo): Promise<void> => {
  // TODO: Implement MCP server communication
  console.log('Solving hole:', hole);
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 1000));
};

export const HoleCard: React.FC<HoleCardProps> = ({
  hole,
  expanded,
  selected,
  onJump,
  onDeselect,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSolving, setIsSolving] = useState(false);

  useEffect(() => {
    if (expanded) {
      cardRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [expanded]);

  const handleSolve = async () => {
    setIsSolving(true);
    try {
      await solveHole(hole);
    } catch (error) {
      console.error('Error solving hole:', error);
    } finally {
      setIsSolving(false);
    }
  };

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
      />
    </section>
  );
};
