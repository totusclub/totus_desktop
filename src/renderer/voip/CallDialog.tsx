import React, { useEffect, useState } from 'react';
import { Icon } from '../icons';
import { Modal } from '../components/Modal';
import {
  endCall,
  getConnectionStatus,
  resetToIdle,
  subscribe,
  toggleMute,
  toggleSpeakerMode,
  type ConnectionStatus,
  type VoipSnapshot,
} from './VoipClient';
import './call.css';

// Порт component/UI/callModal/CallModal.tsx (только исходящий звонок в поддержку) —
// Figma «Desktop / Call (active)»: панель 640 по центру, качество соединения, аватар-инициал 156,
// имя/подпись, статус, таймер, кнопки MUTE / SPEAKER / СБРОСИТЬ.

type Props = {
  open: boolean;
  onClose: () => void;
  /** Подпись под именем (Figma: «Служба поддержки Totus Club»). */
  subtitle?: string;
};

type Quality = 'low' | 'high' | 'none';

const formatCallTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getStateText = (state: VoipSnapshot['state']) => {
  switch (state) {
    case 'calling':
      return 'Вызов...';
    case 'answered':
      return 'Разговор';
    case 'ended':
      return 'Звонок завершён';
    case 'rejected':
      return 'Звонок отклонён';
    default:
      return '';
  }
};

export const CallDialog: React.FC<Props> = ({ open, onClose, subtitle = 'Служба поддержки Totus Club' }) => {
  const [snap, setSnap] = useState<VoipSnapshot | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(getConnectionStatus());
  const [callSeconds, setCallSeconds] = useState(0);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => subscribe(setSnap), []);

  // Как в CallModal: опрос состояния соединения и таймера каждые 500 мс.
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setConnectionStatus(getConnectionStatus());
      const startedAt = snap?.startedAt;
      if (snap?.state === 'answered' && startedAt) {
        setCallSeconds(Math.floor((Date.now() - startedAt) / 1000));
      } else {
        setCallSeconds(0);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [open, snap?.state, snap?.startedAt]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!open || !snap || snap.state === 'idle') return null;

  const isOutgoing = snap.state === 'calling';
  const isActive = snap.state === 'answered';
  const isEnded = snap.state === 'ended' || snap.state === 'rejected';
  const isNoAnswer = isEnded && !snap.wasAnswered;

  // Качество соединения: в приложении — по NetInfo (WiFi/4G — high, 2G/3G — low, offline — none).
  // На десктопе: offline → none; disconnected/reconnecting/failed → low; иначе high.
  const quality: Quality = !online
    ? 'none'
    : snap.connectionState === 'disconnected' || snap.connectionState === 'reconnecting' || snap.connectionState === 'failed'
      ? 'low'
      : 'high';

  const displayName = snap.callerName || 'Неизвестный';
  const displayInitial = displayName.charAt(0).toUpperCase();

  const statusText = connectionStatus.isConnected
    ? 'Соединение установлено'
    : connectionStatus.isConnecting
      ? connectionStatus.iceConnectionState === 'checking' && connectionStatus.connectionState !== 'new'
        ? 'Соединение...'
        : 'Вызов...'
      : connectionStatus.connectionState === 'failed'
        ? 'Ошибка подключения'
        : connectionStatus.connectionState === 'disconnected' || connectionStatus.connectionState === 'closed'
          ? 'Отключено'
          : isOutgoing
            ? 'Установка соединения...'
            : 'Ожидание...';
  const statusColor = connectionStatus.isConnected
    ? 'var(--success)'
    : connectionStatus.isConnecting || isOutgoing
      ? 'var(--warning)'
      : 'var(--error)';

  const handleClose = () => {
    if (isEnded) resetToIdle();
    onClose();
  };

  return (
    <Modal open width={640} onClose={isEnded ? handleClose : undefined} closeOnOverlay={false}>
      <div className="call">
        <div className="call__header">
          <span className={`call__quality call__quality--${quality}`}>
            {quality === 'high' ? 'качество соединения - хорошее' : quality === 'low' ? 'качество соединения низкий' : 'Нет подключения'}
          </span>
          <span className="call__header-title">Звонок</span>
          <button type="button" className="call__close" onClick={handleClose} aria-label="Закрыть" title={isEnded ? 'Закрыть' : 'Свернуть'}>
            ✕
          </button>
        </div>

        <div className="call__body">
          <div className="call__avatar" aria-hidden="true">
            {displayInitial}
          </div>
          <div className="call__name">{displayName}</div>
          <div className="call__subtitle">{subtitle}</div>

          {!isEnded ? (
            <div className="call__status" style={{ color: statusColor }}>
              {statusText}
            </div>
          ) : (
            <div className="call__status muted">{getStateText(snap.state)}</div>
          )}

          {isActive ? <div className="call__timer">{formatCallTime(callSeconds)}</div> : null}
          {isNoAnswer ? <div className="call__no-answer">Нет ответа</div> : null}

          {!isEnded ? (
            <div className="call__controls">
              {isActive ? (
                <div className="call__control">
                  <button
                    type="button"
                    className={'call__circle' + (snap.isMuted ? ' call__circle--on' : '')}
                    onClick={() => toggleMute()}
                    aria-pressed={snap.isMuted}
                    aria-label="Микрофон">
                    <Icon name="mute" size={24} color={snap.isMuted ? 'var(--warning)' : 'var(--text)'} />
                  </button>
                  <span className="call__label" style={{ color: snap.isMuted ? 'var(--warning)' : 'var(--text)' }}>
                    MUTE
                  </span>
                </div>
              ) : null}
              {isActive ? <div className="call__divider" /> : null}
              <div className="call__control">
                <button
                  type="button"
                  className={'call__circle' + (snap.speakerMode === 'loudspeaker' ? ' call__circle--on' : '')}
                  onClick={() => toggleSpeakerMode()}
                  aria-pressed={snap.speakerMode === 'loudspeaker'}
                  aria-label="Динамик">
                  <Icon name="speaker" size={24} color={snap.speakerMode === 'loudspeaker' ? 'var(--warning)' : 'var(--text)'} />
                </button>
                <span className="call__label" style={{ color: snap.speakerMode === 'loudspeaker' ? 'var(--warning)' : 'var(--text)' }}>
                  SPEAKER
                </span>
              </div>
              <div className="call__divider" />
              <div className="call__control">
                <button type="button" className="call__circle call__circle--danger" onClick={() => endCall()} aria-label="Сбросить">
                  <Icon name="phone" size={24} color="#FFFFFF" />
                </button>
                <span className="call__label muted">СБРОСИТЬ</span>
              </div>
            </div>
          ) : (
            <div className="call__end">
              <div className="call__end-text">{snap.state === 'ended' ? 'Звонок завершён' : 'Звонок отклонён'}</div>
              <button type="button" className="btn btn--ghost" onClick={handleClose}>
                Закрыть
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CallDialog;
