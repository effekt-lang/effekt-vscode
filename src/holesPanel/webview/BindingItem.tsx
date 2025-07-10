import React from 'react';
import {
  BINDING_KIND_TERM,
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
        {binding.kind === BINDING_KIND_TERM
          ? fullyQualifiedName(binding as TermBinding)
          : binding.definition || binding.name}
      </span>
      {binding.kind === BINDING_KIND_TERM && (binding as TermBinding).type && (
        <span className="binding-type">: {(binding as TermBinding).type}</span>
      )}
    </div>
  );
};
