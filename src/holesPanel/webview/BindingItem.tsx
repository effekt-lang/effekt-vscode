import React from 'react';
import {
  BINDING_KIND_TERM,
  BindingInfo,
  fullyQualifiedName,
  TermBinding,
  TypeBinding,
} from '../effektHoleInfo';

interface BindingItemProps {
  binding: BindingInfo;
}

export const BindingItem: React.FC<BindingItemProps> = ({ binding }) => {
  return (
    <div className="binding">
      <>
        {binding.kind === BINDING_KIND_TERM ? (
          fullyQualifiedName(binding as TermBinding)
        ) : (binding as TypeBinding).definitionHtml ? (
          <span
            dangerouslySetInnerHTML={{
              __html: (binding as TypeBinding).definitionHtml!,
            }}
          />
        ) : (
          binding.definition || binding.name
        )}
      </>
      {binding.kind === BINDING_KIND_TERM && (binding as TermBinding).type && (
        <>
          {': '}
          {(binding as TermBinding).typeHtml ? (
            <span
              dangerouslySetInnerHTML={{
                __html: (binding as TermBinding).typeHtml!,
              }}
            />
          ) : (
            (binding as TermBinding).type
          )}
        </>
      )}
    </div>
  );
};
