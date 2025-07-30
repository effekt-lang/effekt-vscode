import React from 'react';
import {
  BINDING_KIND_TERM,
  BindingInfo,
  fullyQualifiedName,
  TermBinding,
} from '../effektHoleInfo';
import { SyntaxHighlightedCode } from './SyntaxHighlightedCode';

interface BindingItemProps {
  binding: BindingInfo;
}

export const BindingItem: React.FC<BindingItemProps> = ({ binding }) => {
  const bindingText =
    binding.kind === BINDING_KIND_TERM
      ? fullyQualifiedName(binding as TermBinding)
      : binding.definition || binding.name;

  const typeText =
    binding.kind === BINDING_KIND_TERM ? (binding as TermBinding).type : null;

  return (
    <div className="binding">
      <SyntaxHighlightedCode
        code={bindingText}
        className="binding-term"
        language="effekt"
      />
      {typeText && (
        <>
          <span className="binding-colon">: </span>
          <SyntaxHighlightedCode
            code={typeText}
            className="binding-type"
            language="effekt"
          />
        </>
      )}
    </div>
  );
};
