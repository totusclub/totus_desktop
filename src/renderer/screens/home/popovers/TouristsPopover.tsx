import React, { useEffect, useState } from 'react';
import { Icon } from '../../../icons';
import { CloseIcon, MinusIcon } from '../../../components/uiIcons';

// Порт home/searchSection/modals/TouristsSelectionModal: взрослые / дети / возраст детей, «Готово».

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (adults: number, children: number, kidsAges: number[]) => void;
  initialAdults?: number;
  initialChildren?: number;
  initialKidsAges?: number[];
};

const getValidAdults = (value: number | undefined): number => {
  if (value === undefined || value === null || isNaN(value) || value < 1) return 1;
  return value;
};
const getValidChildren = (value: number | undefined): number => {
  if (value === undefined || value === null || isNaN(value) || value < 0) return 0;
  return value;
};

const Counter: React.FC<{
  value: number;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  incDisabled?: boolean;
}> = ({ value, onDec, onInc, decDisabled, incDisabled }) => (
  <div className="home-counter">
    <button type="button" className="home-counter__btn" onClick={onDec} disabled={decDisabled} aria-label="Меньше">
      <MinusIcon size={20} />
    </button>
    <span className="home-counter__value">{value}</span>
    <button type="button" className="home-counter__btn" onClick={onInc} disabled={incDisabled} aria-label="Больше">
      <Icon name="plus" size={20} />
    </button>
  </div>
);

export const TouristsPopover: React.FC<Props> = ({
  open,
  onClose,
  onSelect,
  initialAdults = 1,
  initialChildren = 0,
  initialKidsAges = [],
}) => {
  const [adults, setAdults] = useState(() => getValidAdults(initialAdults));
  const [children, setChildren] = useState(() => getValidChildren(initialChildren));
  const [kidsAges, setKidsAges] = useState<number[]>(() =>
    initialKidsAges && Array.isArray(initialKidsAges) && initialKidsAges.length > 0 ? initialKidsAges : [],
  );

  useEffect(() => {
    if (open) {
      setAdults(getValidAdults(initialAdults));
      setChildren(getValidChildren(initialChildren));
      setKidsAges(initialKidsAges && Array.isArray(initialKidsAges) && initialKidsAges.length > 0 ? initialKidsAges : []);
    }
  }, [open, initialAdults, initialChildren, initialKidsAges]);

  // Синхронизация массива возрастов с количеством детей
  useEffect(() => {
    if (children > kidsAges.length) {
      setKidsAges(prev => [...prev, ...Array(children - prev.length).fill(0)]);
    } else if (children < kidsAges.length) {
      setKidsAges(prev => prev.slice(0, children));
    }
  }, [children, kidsAges.length]);

  const handleAgeChange = (index: number, newAge: number) => {
    setKidsAges(prev => {
      const updated = [...prev];
      updated[index] = newAge;
      return updated;
    });
  };

  const handleConfirm = () => {
    onSelect(adults, children, kidsAges);
    onClose();
  };

  return (
    <div className="home-pop">
      <div className="home-pop__head">
        <div className="home-pop__title">Туристы</div>
        <button type="button" className="home-pop__close" onClick={onClose} aria-label="Закрыть">
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="home-tourists">
        <div className="home-tourists__row">
          <div>
            <div className="home-tourists__title">Взрослые</div>
            <div className="home-tourists__sub">от 17 лет и старше</div>
          </div>
          <Counter
            value={adults || 1}
            onDec={() => {
              if (adults > 1) setAdults(prev => prev - 1);
            }}
            onInc={() => setAdults(prev => prev + 1)}
            decDisabled={adults <= 1}
          />
        </div>
        <div className="home-tourists__row">
          <div>
            <div className="home-tourists__title">Дети</div>
            <div className="home-tourists__sub">от 0 до 16 лет</div>
          </div>
          <Counter
            value={children || 0}
            onDec={() => {
              if (children > 0) setChildren(prev => prev - 1);
            }}
            onInc={() => setChildren(prev => prev + 1)}
            decDisabled={children <= 0}
          />
        </div>
        {children > 0 ? (
          <div>
            <div className="home-tourists__ages-title">Возраст детей</div>
            {kidsAges.map((age, index) => (
              <div key={index} className="home-tourists__age-row">
                <span className="home-tourists__age-label">Ребёнок {index + 1}</span>
                <Counter
                  value={age}
                  onDec={() => {
                    if (kidsAges[index] > 0) handleAgeChange(index, kidsAges[index] - 1);
                  }}
                  onInc={() => {
                    if (kidsAges[index] < 16) handleAgeChange(index, kidsAges[index] + 1);
                  }}
                  decDisabled={age <= 0}
                  incDisabled={age >= 16}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="home-pop__footer home-pop__footer--line">
        <button type="button" className="btn btn--block" onClick={handleConfirm}>
          Готово
        </button>
      </div>
    </div>
  );
};

export default TouristsPopover;
