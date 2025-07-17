import React from 'react';

interface FilterBoxProps {
  filter: string;
  onFilterChange: (value: string) => void;
}

export const FilterBox: React.FC<FilterBoxProps> = ({
  filter,
  onFilterChange,
}) => (
  <input
    className="filter-box"
    placeholder="Fuzzy search bindings..."
    value={filter}
    onChange={(e) => onFilterChange(e.target.value)}
  />
);
