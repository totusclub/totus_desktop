import React from 'react';
import type { BookingValidationErrors } from '@shared/types/booking';
import { formatPhoneMask } from './masks';

// Порт booking/components/ContactSection.tsx: «Контакты покупателя» — email + телефон (маска +7 999 999-99-99).

interface ContactSectionProps {
  email: string;
  phone: string;
  errors: BookingValidationErrors;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ email, phone, errors, onEmailChange, onPhoneChange }) => (
  <section className="card booking-card">
    <div className="booking-card__head">
      <h2 className="booking-card__title">Контакты покупателя</h2>
      <div className="booking-card__subtitle">Для получения документов к туру</div>
    </div>

    <div className="booking-row">
      <div className="booking-field">
        <input
          className={'input' + (errors.email ? ' input--error' : '')}
          type="email"
          value={email}
          onChange={e => onEmailChange(e.target.value)}
          placeholder="Электронная почта"
          autoCapitalize="none"
          autoComplete="email"
        />
        {errors.email ? <div className="error-text booking-field__error">{errors.email}</div> : null}
      </div>

      <div className="booking-field">
        <input
          className={'input' + (errors.phone ? ' input--error' : '')}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={e => onPhoneChange(formatPhoneMask(e.target.value))}
          placeholder="Номер телефона"
          autoComplete="tel"
          maxLength={16}
        />
        {errors.phone ? <div className="error-text booking-field__error">{errors.phone}</div> : null}
      </div>
    </div>
  </section>
);

export default ContactSection;
