import React from 'react';
import './RangeSlider.css';

// Порт UI/rangeSlider: заголовок, два числовых поля «min — max» и двухбегунковый слайдер
// (два <input type="range"> поверх общего трека).

type RangeSliderProps = {
  label: string;
  min: number;
  max: number;
  minValue?: number;
  maxValue?: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
};

export const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  min,
  max,
  minValue = 0,
  maxValue = 387648,
  onMinChange,
  onMaxChange,
  minPlaceholder = '0',
  maxPlaceholder = '387648',
}) => {
  const span = Math.max(1, maxValue - minValue);
  const clamp = (v: number) => Math.min(maxValue, Math.max(minValue, v));
  const leftPct = ((clamp(min) - minValue) / span) * 100;
  const rightPct = ((clamp(max) - minValue) / span) * 100;

  return (
    <div className="range-slider">
      <div className="range-slider__title">{label}</div>
      <div className="range-slider__inputs">
        <input
          className="input range-slider__input"
          inputMode="numeric"
          value={String(min)}
          placeholder={minPlaceholder}
          onChange={e => {
            const numValue = Number(e.target.value.replace(/[^\d]/g, '')) || 0;
            if (numValue <= max) onMinChange(numValue);
          }}
        />
        <span className="range-slider__sep">—</span>
        <input
          className="input range-slider__input"
          inputMode="numeric"
          value={String(max)}
          placeholder={maxPlaceholder}
          onChange={e => {
            const numValue = Number(e.target.value.replace(/[^\d]/g, '')) || 0;
            if (numValue >= min) onMaxChange(numValue);
          }}
        />
      </div>
      <div className="range-slider__track-wrap">
        <div className="range-slider__track" />
        <div className="range-slider__selected" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }} />
        <input
          type="range"
          className="range-slider__thumb"
          min={minValue}
          max={maxValue}
          step={1}
          value={clamp(min)}
          // Когда оба бегунка сошлись у правого края — минимальный должен быть сверху, иначе его не схватить
          style={{ zIndex: clamp(min) >= clamp(max) - span * 0.02 ? 4 : 3 }}
          onChange={e => {
            const v = Number(e.target.value);
            onMinChange(Math.min(v, max));
          }}
          aria-label="Минимальная цена"
        />
        <input
          type="range"
          className="range-slider__thumb"
          min={minValue}
          max={maxValue}
          step={1}
          value={clamp(max)}
          onChange={e => {
            const v = Number(e.target.value);
            onMaxChange(Math.max(v, min));
          }}
          aria-label="Максимальная цена"
        />
      </div>
    </div>
  );
};

export default RangeSlider;
