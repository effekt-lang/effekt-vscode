import React, { useEffect, useRef } from 'react';
import { EffektHoleInfo, BindingInfo } from '../effektHoleInfo';
import { BindingsSection } from './BindingsSection';

interface HoleCardProps {
  hole: EffektHoleInfo;
  expanded: boolean;
  selected: boolean;
  onJump: (id: string) => void;
  onJumpToDefinition: (binding: BindingInfo) => void;
  onDeselect: () => void;
}

export const HoleCard: React.FC<HoleCardProps> = ({
  hole,
  expanded,
  selected,
  onJump,
  onJumpToDefinition,
  onDeselect,
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
        onJumpToDefinition={onJumpToDefinition}
      />
    </section>
  );
};
