import React from 'react';
import { BindingInfo } from '../effektHoleInfo';
import { Location as LSPLocation } from 'vscode-languageserver-protocol';

interface BindingItemProps {
  binding: BindingInfo;
  onJumpToDefinition: (location: LSPLocation) => void;
}

export const BindingItem: React.FC<BindingItemProps> = ({
  binding,
  onJumpToDefinition,
}) => {
  const handleClick = () => {
    if (binding.definitionLocation) {
      onJumpToDefinition(binding.definitionLocation);
    }
  };

  const canJumpToDefinition = !!binding.definitionLocation;

  return (
    <div
      className={`binding ${canJumpToDefinition ? 'clickable' : ''}`}
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
