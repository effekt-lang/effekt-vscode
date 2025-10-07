import React, { useEffect, useRef } from 'react';
import { BindingInfo } from '../effektHoleInfo';
import { Location as LSPLocation } from 'vscode-languageserver-protocol';

interface BindingItemProps {
  binding: BindingInfo;
  isSelected?: boolean;
  onJumpToDefinition: (location: LSPLocation) => void;
}

// It is important that this component is memoized to avoid re-renders on selection changes
export const BindingItem = React.memo<BindingItemProps>(
  ({ binding, isSelected = false, onJumpToDefinition }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (isSelected && ref.current) {
        // Throttle to next frame to avoid layout thrash during rapid key repeats
        requestAnimationFrame(() => {
          ref.current?.scrollIntoView({ block: 'center' });
        });
      }
    }, [isSelected]);

    const handleClick = () => {
      if (binding.definitionLocation) {
        onJumpToDefinition(binding.definitionLocation);
      }
    };

    const canJumpToDefinition = !!binding.definitionLocation;

    return (
      <div
        ref={ref}
        className={`binding ${canJumpToDefinition ? 'clickable' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        title={
          canJumpToDefinition
            ? `Jump to definition of ${binding.name}`
            : undefined
        }
        dangerouslySetInnerHTML={{
          __html: binding.signatureHtml!,
        }}
      ></div>
    );
  },
);
