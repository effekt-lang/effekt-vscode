import React, { forwardRef } from 'react';

interface FilterBoxProps {
  filter: string;
  onFilterChange: (value: string) => void;
}

export const FilterBox = forwardRef<HTMLInputElement, FilterBoxProps>(
  ({ filter, onFilterChange }, ref) => (
    <input
      ref={ref}
      className="filter-box"
      placeholder="Search bindings..."
      value={filter}
      onChange={(e) => onFilterChange(e.target.value)}
    />
  ),
);

FilterBox.displayName = 'FilterBox';
