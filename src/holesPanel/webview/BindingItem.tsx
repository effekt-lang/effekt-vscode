import React from 'react';
import {
  BindingInfo,
  fullyQualifiedName,
  TermBinding,
} from '../effektHoleInfo';

interface BindingItemProps {
  binding: BindingInfo;
}

export const BindingItem: React.FC<BindingItemProps> = ({ binding }) => {
  return (
    <div className="binding">
      <span className="binding-term">
        {binding.kind === 'Term'
          ? fullyQualifiedName(binding as TermBinding)
          : binding.definition || binding.name}
      </span>
      {binding.kind === 'Term' && (binding as TermBinding).type && (
        <span className="binding-type">: {(binding as TermBinding).type}</span>
      )}
    </div>
  );
};
