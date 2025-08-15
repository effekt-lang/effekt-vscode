import React from 'react';
import { BindingInfo } from '../effektHoleInfo';

interface BindingItemProps {
  binding: BindingInfo;
}

export const BindingItem: React.FC<BindingItemProps> = ({ binding }) => {
  return (
    <div
      className="binding"
      dangerouslySetInnerHTML={{
        __html: binding.signatureHtml!,
      }}
    ></div>
  );
};
