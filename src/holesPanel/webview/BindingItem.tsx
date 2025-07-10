import React from 'react';
import { BindingInfo, TermBinding } from '../effektHoleInfo';

interface BindingItemProps {
  binding: BindingInfo;
}

export const BindingItem: React.FC<BindingItemProps> = ({ binding }) => {
  return (
    <div className="binding">
      <span className="binding-term">
        {binding.kind === 'Term'
          ? [(binding as TermBinding).qualifier, (binding as TermBinding).name]
              .flat()
              .join('::')
          : binding.definition || binding.name}
      </span>
      {binding.kind === 'Term' && (binding as TermBinding).type && (
        <span className="binding-type">: {(binding as TermBinding).type}</span>
      )}
    </div>
  );
};
