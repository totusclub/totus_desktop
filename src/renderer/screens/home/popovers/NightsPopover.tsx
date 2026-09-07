import React, { useEffect, useState } from 'react';
import { Icon } from '../../../icons';
import { CloseIcon, MinusIcon } from '../../../components/uiIcons';

// Порт home/searchSection/modals/NightsSelectionModal: степпер + слайдер 1–30, тумблер «±2 ночи», «Готово».

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (nights: number) => void;
  initialNights?: number;
};

const MIN_NIGHTS = 1;
const MAX_NIGHTS = 30;

export const NightsPopover: React.FC<Props> = ({ open, onClose, onSelect, initialNights = 7 }) => {
  const [nights, setNights] = useState(initialNights);
  const [flexibleNights, setFlexibleNights] = useState(false);

  useEffect(() => {
    if (open) setNights(initialNights);
  }, [open, initialNights]);

  const handleConfirm = () => {
    onSelect(nights);
    onClose();
  };

  return (
    <div className="home-pop">
      <div className="home-pop__head">
        <div className="home-pop__title">Количество ночей: {nights}</div>
        <button type="button" className="home-pop__close" onClick={onClose} aria-label="Закрыть">
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="home-stepper">
        <button
          type="button"
          className="home-counter__btn"
          onClick={() => setNights(v => Math.max(MIN_NIGHTS, v - 1))}
          disabled={nights <= MIN_NIGHTS}
          aria-label="Меньше ночей">
          <MinusIcon size={20} />
        </button>
        <div className="home-stepper__value">
          <span className="home-stepper__num">{nights}</span>
          <span className="home-stepper__hint">ночей</span>
        </div>
        <button
          type="button"
          className="home-counter__btn"
          onClick={() => setNights(v => Math.min(MAX_NIGHTS, v + 1))}
          disabled={nights >= MAX_NIGHTS}
          aria-label="Больше ночей">
          <Icon name="plus" size={20} />
        </button>
      </div>
      <input
        type="range"
        className="home-nights-range"
        min={MIN_NIGHTS}
        max={MAX_NIGHTS}
        step={1}
        value={nights}
        onChange={e => setNights(Number(e.target.value))}
        aria-label="Количество ночей"
      />
      <button type="button" className="home-toggle-row" onClick={() => setFlexibleNights(v => !v)}>
        <span className="home-toggle-row__text">
          <span className="home-toggle-row__title">Длительность тура ±2 ночи</span>
          <span className="home-toggle-row__sub">Бывает выгоднее</span>
        </span>
        <span className={'toggle' + (flexibleNights ? ' toggle--on' : '')} aria-hidden="true" />
      </button>
      <div className="home-pop__footer">
        <button type="button" className="btn btn--block" onClick={handleConfirm}>
          Готово
        </button>
      </div>
    </div>
  );
};

export default NightsPopover;
