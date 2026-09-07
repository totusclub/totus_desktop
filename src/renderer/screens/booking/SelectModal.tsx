import React from 'react';
import { Modal } from '../../components/Modal';
import { CheckmarkIcon, CloseIcon } from '../../components/uiIcons';

// Порт модалок «Гражданство» / «Документ» из TouristForm.tsx (шторка снизу → центрированный диалог).

type Props = {
  open: boolean;
  title: string;
  options: string[];
  isSelected: (option: string) => boolean;
  onSelect: (option: string) => void;
  onClose: () => void;
};

export const SelectModal: React.FC<Props> = ({ open, title, options, isSelected, onSelect, onClose }) => (
  <Modal open={open} onClose={onClose} width={440}>
    <div className="booking-modal__head">
      <div className="booking-modal__title">{title}</div>
      <button type="button" className="booking-modal__close" onClick={onClose} aria-label="Закрыть">
        <CloseIcon size={22} />
      </button>
    </div>
    <div className="booking-modal__list">
      {options.map(option => (
        <button
          type="button"
          key={option}
          className="booking-modal__item"
          onClick={() => {
            onSelect(option);
            onClose();
          }}>
          <span>{option}</span>
          {isSelected(option) ? <CheckmarkIcon size={20} color="var(--brand)" /> : null}
        </button>
      ))}
    </div>
  </Modal>
);

export default SelectModal;
