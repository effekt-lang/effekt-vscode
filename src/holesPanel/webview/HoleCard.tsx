import React, { useEffect, useRef } from 'react';
import { EffektHoleInfo } from '../effektHoleInfo';
import { BindingsSection } from './BindingsSection';

interface HoleCardProps {
  hole: EffektHoleInfo;
  highlighted: boolean;
  onJump: (id: string) => void;
  onDeselect: () => void;
}

export const HoleCard: React.FC<HoleCardProps> = ({
  hole,
  highlighted,
  onJump,
  onDeselect,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted) {
      cardRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [highlighted]);

  return (
    <section
      ref={cardRef}
      className={`hole-card${highlighted ? ' highlighted' : ''}`}
      id={`hole-${hole.id}`}
      onClick={() => {
        if (highlighted) {
          onDeselect();
        } else {
          onJump(hole.id);
        }
      }}
    >
      <div className="hole-header">
        <span className="hole-id">Hole: {hole.id}</span>
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
        isActive={highlighted}
      />
    </section>
  );
};
