import React, { useCallback, useEffect, useRef, useState } from 'react';
import { YANDEX_SMARTCAPTCHA_SITEKEY } from '@shared/config/captcha';
import { desktop } from '../lib/desktop';

// Порт component/UI/YandexSmartCaptcha/index.tsx: вместо react-native-webview — Electron <webview>
// (страница https://totus.club/desktop-captcha отдаётся из main-процесса, см. electron/captcha.ts),
// события приходят через 'ipc-message' (channel 'captcha') из captchaPreload.
// Те же пропсы и статусы, что в приложении.

export type CaptchaStatus = 'loading' | 'ready' | 'solved' | 'error' | 'expired';

type Props = {
  onTokenChange: (token: string) => void;
  /** Increment to force widget remount after failed/expired token. */
  resetKey?: number;
  onStatusChange?: (status: CaptchaStatus) => void;
};

type CaptchaMessage = {
  type?: 'ready' | 'success' | 'error' | 'network_error' | 'expired' | 'challenge' | 'height';
  token?: string;
  height?: number;
  open?: boolean;
};

type IpcMessageEvent = Event & { channel: string; args: unknown[] };

const CHECKBOX_HEIGHT = 108;
const CHALLENGE_HEIGHT = 360;

export const SmartCaptcha: React.FC<Props> = ({ onTokenChange, resetKey = 0, onStatusChange }) => {
  const [status, setStatus] = useState<CaptchaStatus>('loading');
  const [webHeight, setWebHeight] = useState(CHECKBOX_HEIGHT);
  const [localReset, setLocalReset] = useState(0);
  const statusRef = useRef<CaptchaStatus>('loading');
  const boxRef = useRef<HTMLDivElement>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const onStatusChangeRef = useRef(onStatusChange);
  onTokenChangeRef.current = onTokenChange;
  onStatusChangeRef.current = onStatusChange;

  const emitStatus = useCallback((next: CaptchaStatus) => {
    statusRef.current = next;
    setStatus(next);
    onStatusChangeRef.current?.(next);
  }, []);

  const remountKey = `${resetKey}-${localReset}`;

  const onMessage = useCallback(
    (data: CaptchaMessage) => {
      const type = data?.type;
      const token = typeof data?.token === 'string' ? data.token : '';

      if (type === 'height') {
        const next = Math.round(Number(data?.height) || 0);
        if (Number.isFinite(next) && next > 0) {
          setWebHeight(prev => {
            const target = Math.min(Math.max(next, CHECKBOX_HEIGHT), 520);
            return Math.abs(target - prev) > 8 ? target : prev;
          });
        }
        return;
      }
      if (type === 'challenge') {
        if (data?.open) setWebHeight(prev => Math.max(prev, CHALLENGE_HEIGHT));
        return;
      }
      if (type === 'ready') {
        emitStatus('ready');
        return;
      }
      if (type === 'success') {
        emitStatus('solved');
        onTokenChangeRef.current(token);
        setWebHeight(CHECKBOX_HEIGHT);
        return;
      }
      if (type === 'expired') {
        emitStatus('expired');
        onTokenChangeRef.current('');
        return;
      }
      if (type === 'error' || type === 'network_error') {
        emitStatus('error');
        onTokenChangeRef.current('');
      }
    },
    [emitStatus],
  );

  // Создаём <webview> императивно (JSX-тег отсутствует в типах React), навешиваем ipc-message.
  useEffect(() => {
    if (!YANDEX_SMARTCAPTCHA_SITEKEY) return;
    if (status === 'error') return;
    const box = boxRef.current;
    if (!box) return;
    let disposed = false;
    let view: HTMLElement | null = null;

    const handleIpc = (e: Event) => {
      const ev = e as IpcMessageEvent;
      if (ev.channel !== 'captcha') return;
      const data = (ev.args && ev.args[0]) as CaptchaMessage | undefined;
      if (data) onMessage(data);
    };
    const handleStart = () => {
      if (statusRef.current !== 'solved') emitStatus('loading');
    };
    const handleFail = () => {
      emitStatus('error');
      onTokenChangeRef.current('');
    };

    desktop
      .getCaptcha()
      .then(info => {
        if (disposed) return;
        if (!info || !info.url) {
          // Вне Electron (vitest / браузер) капчи нет
          handleFail();
          return;
        }
        view = document.createElement('webview');
        view.setAttribute('src', info.url);
        if (info.partition) view.setAttribute('partition', info.partition);
        if (info.preload) view.setAttribute('preload', info.preload);
        view.style.width = '100%';
        view.style.height = '100%';
        view.style.display = 'block';
        view.style.background = 'transparent';
        view.addEventListener('ipc-message', handleIpc);
        view.addEventListener('did-start-loading', handleStart);
        view.addEventListener('did-fail-load', handleFail);
        box.appendChild(view);
      })
      .catch(handleFail);

    return () => {
      disposed = true;
      if (view) {
        view.removeEventListener('ipc-message', handleIpc);
        view.removeEventListener('did-start-loading', handleStart);
        view.removeEventListener('did-fail-load', handleFail);
        view.remove();
      }
    };
    // Пересоздание только по remountKey (как key={remountKey} у WebView) и при выходе из error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remountKey, status === 'error']);

  const handleRetry = useCallback(() => {
    onTokenChangeRef.current('');
    emitStatus('loading');
    setWebHeight(CHECKBOX_HEIGHT);
    setLocalReset(k => k + 1);
  }, [emitStatus]);

  if (!YANDEX_SMARTCAPTCHA_SITEKEY) {
    return <div className="captcha__hint muted">Капча не настроена</div>;
  }

  return (
    <div className="captcha">
      {status === 'loading' || status === 'error' ? (
        <div className="captcha__status">
          {status === 'loading' ? (
            <>
              <span className="captcha__spinner" aria-hidden="true" />
              <span className="captcha__hint muted">Загрузка проверки…</span>
            </>
          ) : (
            <>
              <span className="captcha__hint" style={{ color: 'var(--error)' }}>
                Не удалось загрузить капчу
              </span>
              <button type="button" className="link captcha__retry" onClick={handleRetry}>
                Обновить
              </button>
            </>
          )}
        </div>
      ) : null}

      {status !== 'error' ? <div ref={boxRef} className="captcha__box" style={{ height: webHeight }} /> : null}

      {status === 'ready' ? <div className="captcha__hint muted">Отметьте «Я не робот», затем дождитесь активации кнопки</div> : null}

      {status === 'expired' ? (
        <button type="button" className="link captcha__retry" onClick={handleRetry}>
          Капча истекла — обновить
        </button>
      ) : null}
    </div>
  );
};

export default SmartCaptcha;
export { YANDEX_SMARTCAPTCHA_SITEKEY };
