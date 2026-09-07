import React, { useEffect, useState } from 'react';
import type { Tourist, TouristErrors } from '@shared/types/booking';
import {
  documentTypeMap,
  documentTypeReverseMap,
  nationalityMap,
  nationalityReverseMap,
  citizenshipOptions,
  documentTypeOptions,
  getChildAgeRange,
  getNamePlaceholder,
  DEFAULT_NATIONALITY_ID,
} from '@shared/utils/booking/documentMappings';
import { ArrowDownIcon } from '../../components/uiIcons';
import { DateInput } from './DateInput';
import { SelectModal } from './SelectModal';

// Порт booking/components/TouristForm.tsx. Поля парами (Figma «Desktop / Booking»):
// Имя / Фамилия; Отчество / «Нет отчества»; Дата рождения / Пол; Гражданство / Документ; Серия и номер / Срок действия.

interface TouristFormProps {
  tourist: Tourist;
  index: number;
  errors: TouristErrors;
  onUpdate: (key: keyof Tourist, value: string | boolean | number, additionalUpdates?: Partial<Tourist>) => void;
  onClearPatronymicError: () => void;
  showDivider: boolean;
  onNoPatronymicToggle: (newValue: boolean) => void;
}

const FieldError: React.FC<{ text?: string }> = ({ text }) =>
  text ? <div className="error-text booking-field__error">{text}</div> : null;

export const TouristForm: React.FC<TouristFormProps> = ({ tourist, errors, onUpdate, showDivider, onNoPatronymicToggle }) => {
  const isChild = tourist.child || false;
  const noPatronymic = tourist.noPatronymic || false;
  const isInternationalPassport =
    tourist.doc_type === 'international_passport' || tourist.doc_type === 'international_passport_other';
  const isInternalPassport = tourist.doc_type === 'internal_passport';

  const [citizenshipModalVisible, setCitizenshipModalVisible] = useState(false);
  const [documentTypeModalVisible, setDocumentTypeModalVisible] = useState(false);
  const citizenshipLocked = citizenshipOptions.length <= 1;

  // Keep the payload consistent with the single allowed citizenship
  useEffect(() => {
    if (citizenshipLocked && tourist.nationality_id !== DEFAULT_NATIONALITY_ID) {
      onUpdate('nationality_id', DEFAULT_NATIONALITY_ID);
    }
  }, [citizenshipLocked, tourist.nationality_id, onUpdate]);

  const handlePatronymicChange = (value: string) => {
    onUpdate('patronymic', value);
    // If user types something, disable the "no patronymic" toggle
    if (value && value.trim() !== '') {
      onUpdate('noPatronymic', false);
    }
  };

  const handleNoPatronymicToggle = () => {
    onNoPatronymicToggle(!noPatronymic);
  };

  // Handle passport number input with length restriction
  const handlePassportNumberChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    let maxLength: number;
    if (isInternationalPassport) {
      maxLength = 9;
    } else if (isInternalPassport) {
      maxLength = 10;
    } else {
      maxLength = 10;
    }
    onUpdate('passport_number', digitsOnly.slice(0, maxLength));
  };

  const getPassportPlaceholder = () => {
    if (isInternationalPassport) return 'Серия и номер документа (9 цифр)';
    if (isInternalPassport) return 'Серия и номер документа (10 цифр)';
    return 'Серия и номер документа';
  };

  return (
    <>
      <div className="booking-tourist">
        {showDivider ? <div className="divider booking-tourist__divider" /> : null}

        <div className="booking-card__head">
          <h3 className="booking-card__title">{isChild ? 'Ребенок' : 'Взрослый'}</h3>
          <div className="booking-card__subtitle">{isChild ? getChildAgeRange(tourist.child_age) : 'старше 17 лет'}</div>
        </div>

        <div className="booking-form">
          {/* Имя / Фамилия */}
          <div className="booking-row">
            <div className="booking-field">
              <input
                className={'input' + (errors.name ? ' input--error' : '')}
                type="text"
                value={tourist.name}
                onChange={e => onUpdate('name', e.target.value)}
                placeholder={getNamePlaceholder('name', tourist.doc_type)}
                autoCapitalize="words"
              />
              <FieldError text={errors.name} />
            </div>
            <div className="booking-field">
              <input
                className={'input' + (errors.surname ? ' input--error' : '')}
                type="text"
                value={tourist.surname}
                onChange={e => onUpdate('surname', e.target.value)}
                placeholder={getNamePlaceholder('surname', tourist.doc_type)}
                autoCapitalize="words"
              />
              <FieldError text={errors.surname} />
            </div>
          </div>

          {/* Отчество / Нет отчества */}
          <div className="booking-row">
            <div className="booking-field">
              <input
                className={'input' + (errors.patronymic ? ' input--error' : '')}
                type="text"
                value={tourist.patronymic}
                onChange={e => handlePatronymicChange(e.target.value)}
                placeholder={getNamePlaceholder('patronymic', tourist.doc_type)}
                autoCapitalize="words"
                disabled={noPatronymic}
              />
              <FieldError text={errors.patronymic} />
            </div>
            <div className="booking-field booking-field--inline">
              <button type="button" className="booking-toggle-row" onClick={handleNoPatronymicToggle} aria-pressed={noPatronymic}>
                <span className="booking-toggle-row__label">Нет отчества</span>
                <span className={'toggle' + (noPatronymic ? ' toggle--on' : '')} />
              </button>
            </div>
          </div>

          {/* Дата рождения / Пол */}
          <div className="booking-row">
            <DateInput
              value={tourist.birthday}
              onChange={value => onUpdate('birthday', value)}
              placeholder="DD.MM.YYYY"
              label="Дата рождения"
              error={errors.birthday}
              allowPastDates={true}
              allowFutureDates={false}
            />
            <div className="booking-field booking-field--inline">
              <div className="booking-gender">
                <span className="booking-gender__label">Пол:</span>
                <div className="booking-radio-group" role="radiogroup" aria-label="Пол">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={tourist.gender === 'M'}
                    className="booking-radio"
                    onClick={() => onUpdate('gender', 'M')}>
                    <span className={'booking-radio__circle' + (tourist.gender === 'M' ? ' booking-radio__circle--on' : '')}>
                      {tourist.gender === 'M' ? <span className="booking-radio__inner" /> : null}
                    </span>
                    <span className="booking-radio__label">Мужской</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={tourist.gender === 'F'}
                    className="booking-radio"
                    onClick={() => onUpdate('gender', 'F')}>
                    <span className={'booking-radio__circle' + (tourist.gender === 'F' ? ' booking-radio__circle--on' : '')}>
                      {tourist.gender === 'F' ? <span className="booking-radio__inner" /> : null}
                    </span>
                    <span className="booking-radio__label">Женский</span>
                  </button>
                </div>
              </div>
              <FieldError text={errors.gender} />
            </div>
          </div>

          {/* Гражданство / Документ */}
          <div className="booking-row">
            <div className="booking-field">
              <button
                type="button"
                className={'booking-dropdown' + (citizenshipLocked ? ' booking-dropdown--locked' : '')}
                onClick={() => setCitizenshipModalVisible(true)}
                disabled={citizenshipLocked}>
                <span className="booking-dropdown__label">Гражданство</span>
                <span className="booking-dropdown__row">
                  <span className="booking-dropdown__value">
                    {nationalityReverseMap[tourist.nationality_id || DEFAULT_NATIONALITY_ID] || 'Россия'}
                  </span>
                  {!citizenshipLocked ? <ArrowDownIcon size={16} color="var(--text-disabled)" /> : null}
                </span>
              </button>
              <FieldError text={errors.nationality_id} />
            </div>
            <div className="booking-field">
              <button type="button" className="booking-dropdown" onClick={() => setDocumentTypeModalVisible(true)}>
                <span className="booking-dropdown__label">Документ</span>
                <span className="booking-dropdown__row">
                  <span className="booking-dropdown__value">{documentTypeReverseMap[tourist.doc_type] || 'Заграничный паспорт РФ'}</span>
                  <ArrowDownIcon size={16} color="var(--text-disabled)" />
                </span>
              </button>
              <FieldError text={errors.doc_type} />
            </div>
          </div>

          {/* Серия и номер / Срок действия */}
          <div className="booking-row">
            <div className="booking-field booking-field--inline">
              <input
                className={'input' + (errors.passport_number ? ' input--error' : '')}
                type="text"
                inputMode="numeric"
                value={tourist.passport_number.toString()}
                onChange={e => handlePassportNumberChange(e.target.value)}
                placeholder={getPassportPlaceholder()}
              />
              <FieldError text={errors.passport_number} />
            </div>
            <DateInput
              value={tourist.passport_expires_on}
              onChange={value => onUpdate('passport_expires_on', value)}
              placeholder="DD.MM.YYYY"
              label="Срок действия документа"
              error={errors.passport_expires_on}
              allowPastDates={false}
            />
          </div>
        </div>
      </div>

      {/* Citizenship Modal */}
      <SelectModal
        open={citizenshipModalVisible && !citizenshipLocked}
        title="Гражданство"
        options={citizenshipOptions}
        isSelected={option => tourist.nationality_id === nationalityMap[option]}
        onSelect={option => onUpdate('nationality_id', nationalityMap[option])}
        onClose={() => setCitizenshipModalVisible(false)}
      />

      {/* Document Type Modal */}
      <SelectModal
        open={documentTypeModalVisible}
        title="Документ"
        options={documentTypeOptions}
        isSelected={option => tourist.doc_type === documentTypeMap[option]}
        onSelect={option => onUpdate('doc_type', documentTypeMap[option])}
        onClose={() => setDocumentTypeModalVisible(false)}
      />
    </>
  );
};

export default TouristForm;
