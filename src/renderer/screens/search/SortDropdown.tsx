import React, { useState } from 'react';
import { Popover } from '../../components/Popover';
import { ArrowDownIcon, CheckmarkIcon, LineArrowDownIcon, LineArrowUpIcon, RecommendedIcon } from '../../components/uiIcons';
import { Icon } from '../../icons';

// Порт searchResult/modals/SortModal — на десктопе выпадающий список вместо шторки.

export type SortOption = { id: string; label: string; icon: string };

export const sortOptions: SortOption[] = [
  { id: 'recommended', label: 'По рекомендации', icon: 'recommended' },
  { id: 'highRating', label: 'Высокий рейтинг', icon: 'star' },
  { id: 'cheapFirst', label: 'Сначала дешёвые', icon: 'lineArrowDown' },
  { id: 'expensiveFirst', label: 'Сначала дорогие', icon: 'lineArrowUp' },
];

const SortIcon: React.FC<{ icon: string }> = ({ icon }) => {
  if (icon === 'star') return <Icon name="star" size={22} />;
  if (icon === 'lineArrowDown') return <LineArrowDownIcon size={22} />;
  if (icon === 'lineArrowUp') return <LineArrowUpIcon size={22} />;
  return <RecommendedIcon size={22} />;
};

type Props = {
  selectedOption: string;
  selectedLabel: string;
  onSelect: (option: SortOption) => void;
  options?: SortOption[];
};

export const SortDropdown: React.FC<Props> = ({ selectedOption, selectedLabel, onSelect, options = sortOptions }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      width={280}
      anchor={
        <button type="button" className="search-sort__btn" onClick={() => setOpen(v => !v)} aria-expanded={open}>
          <span>{selectedLabel}</span>
          <ArrowDownIcon size={16} />
        </button>
      }>
      <div className="search-sort__menu" role="listbox">
        {options.map(option => (
          <button
            type="button"
            key={option.id}
            role="option"
            aria-selected={selectedOption === option.id}
            className={'search-sort__option' + (selectedOption === option.id ? ' search-sort__option--active' : '')}
            onClick={() => {
              onSelect(option);
              setOpen(false);
            }}>
            <span className="search-sort__option-left">
              <SortIcon icon={option.icon} />
              <span>{option.label}</span>
            </span>
            {selectedOption === option.id ? <CheckmarkIcon size={20} color="var(--brand)" /> : null}
          </button>
        ))}
      </div>
    </Popover>
  );
};

export default SortDropdown;
