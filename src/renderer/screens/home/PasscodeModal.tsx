import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';

// Порт home/PasscodeModal: пароль доступа к приложению (4 цифры, автопроверка).

type Props = { visible: boolean; onVerified: () => void };

const CORRECT_PASSCODE = '2103';

export const PasscodeModal: React.FC<Props> = ({ visible, onVerified }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPasscode('');
      setError(null);
    }
  }, [visible]);

  const handleVerify = () => {
    if (passcode === CORRECT_PASSCODE) {
      setError(null);
      onVerified();
    } else {
      setError('Неверный пароль. Попробуйте снова.');
      setPasscode('');
    }
  };

  const handlePasscodeChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setPasscode(numericText);
    setError(null);
    if (numericText.length === 4) {
      if (numericText === CORRECT_PASSCODE) {
        setError(null);
        onVerified();
      } else {
        setError('Неверный пароль. Попробуйте снова.');
        setPasscode('');
      }
    }
  };

  return (
    <Modal open={visible} width={420} closeOnOverlay={false}>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleVerify();
        }}>
        <div className="dialog__title">Введите пароль</div>
        <div className="dialog__text">Для доступа к приложению</div>
        <input
          className={'input home-passcode__input' + (error ? ' input--error' : '')}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={passcode}
          onChange={e => handlePasscodeChange(e.target.value)}
          placeholder="1234"
          autoFocus
        />
        {error ? (
          <div className="error-text" style={{ marginTop: 8 }}>
            {error}
          </div>
        ) : null}
      </form>
    </Modal>
  );
};

export default PasscodeModal;
