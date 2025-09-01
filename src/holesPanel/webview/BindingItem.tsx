import React from 'react';
import { BindingInfo } from '../effektHoleInfo';

interface BindingItemProps {
  binding: BindingInfo;
  onJumpToDefinition?: (binding: BindingInfo) => void;
}

export const BindingItem: React.FC<BindingItemProps> = ({
  binding,
  onJumpToDefinition,
}) => {
  const handleClick = () => {
    if (binding.definitionLocation && onJumpToDefinition) {
      onJumpToDefinition(binding);
    }
  };

  const canJumpToDefinition = !!binding.definitionLocation;

  return (
    <div
      className={`binding ${canJumpToDefinition ? 'binding--clickable' : ''}`}
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
};
