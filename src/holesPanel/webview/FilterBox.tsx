import React from 'react';

interface FilterBoxProps {
  filter: string;
  onFilterChange: (value: string) => void;
  ref?: React.Ref<HTMLInputElement>;
}

export const FilterBox: React.FC<FilterBoxProps> = ({
  filter,
  onFilterChange,
  ref,
}) => (
  <input
    ref={ref}
    className="filter-box"
    placeholder="Search bindings..."
    value={filter}
    onChange={(e) => onFilterChange(e.target.value)}
  />
);
