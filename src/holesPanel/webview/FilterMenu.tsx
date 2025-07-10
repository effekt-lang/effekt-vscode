import React from 'react';

interface FilterMenuProps {
  showDefined: boolean;
  showImported: boolean;
  onToggleDefined: (checked: boolean) => void;
  onToggleImported: (checked: boolean) => void;
}

export const FilterMenu: React.FC<FilterMenuProps> = ({
  showDefined,
  showImported,
  onToggleDefined,
  onToggleImported,
}) => (
  <div className="filter-menu" style={{ marginBottom: '0.5em' }}>
    <label>
      <input
        type="checkbox"
        checked={showDefined}
        onChange={(e) => onToggleDefined(e.target.checked)}
      />{' '}
      Defined
    </label>
    <label>
      <input
        type="checkbox"
        checked={showImported}
        onChange={(e) => onToggleImported(e.target.checked)}
      />{' '}
      Imported
    </label>
  </div>
);
