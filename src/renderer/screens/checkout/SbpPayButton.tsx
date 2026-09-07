import React from 'react';

// Порт UI/SbpPayButton: кнопка оплаты через СБП (`.btn .btn--sbp`) с бейджем «сбп» и логотипом.

const VIEW_WIDTH = 345.5;
const VIEW_HEIGHT = 398.9;

export const SbpLogo: React.FC<{ size?: number }> = ({ size = 22 }) => {
  const height = size;
  const width = (size * VIEW_WIDTH) / VIEW_HEIGHT;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} style={{ display: 'block', flex: 'none' }} aria-hidden="true">
      <path fill="#8F4794" d="M100.3,199.4l-52,30L0,313.1l196.9-113.7L100.3,199.4z" />
      <path fill="#E40646" d="M248.9,113.7l-52,30l-48.3,83.7l196.9-113.7L248.9,113.7z" />
      <polygon fill="#F9B429" points="196.9,83.7 148.6,0 148.6,398.9 196.9,315.2" />
      <polygon fill="#EF8019" points="148.6,0 196.9,83.7 248.9,113.7 345.5,113.7" />
      <polygon fill="#78B72A" points="148.6,171.5 148.6,398.9 196.9,315.2 196.9,255.2" />
      <path fill="#00853F" d="M248.9,285.2l-52,30l-48.3,83.7l196.9-113.7L248.9,285.2z" />
      <polygon fill="#5B57A2" points="0,85.8 0,313.1 48.3,229.5 48.3,169.4" />
      <polygon fill="#0698D6" points="148.6,171.5 0,85.8 48.3,169.4 248.9,285.2 345.5,285.2" />
    </svg>
  );
};

type Props = {
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
};

export const SbpPayButton: React.FC<Props> = ({
  onPress,
  loading = false,
  disabled = false,
  label = 'Оплатить',
  loadingLabel = 'Создаём QR-код...',
}) => {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      className="btn btn--sbp btn--block sbp-btn"
      disabled={isDisabled}
      onClick={() => {
        if (!isDisabled) onPress?.();
      }}>
      {loading ? (
        <>
          <span className="sbp-btn__spinner" aria-hidden="true" />
          <span className="sbp-btn__label">{loadingLabel}</span>
        </>
      ) : (
        <>
          <span className="sbp-btn__label">{label}</span>
          <span className="sbp-btn__badge">
            <SbpLogo size={24} />
            <span className="sbp-btn__badge-text">сбп</span>
          </span>
        </>
      )}
    </button>
  );
};

export default SbpPayButton;
