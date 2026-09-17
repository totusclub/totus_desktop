/**
 * Возврат из браузера после входа через Яндекс ID.
 *
 * Слушает deep link totus://auth/yandex?ticket=… (главный процесс отдаёт его по IPC),
 * меняет одноразовый ticket на наши токены и кладёт их тем же setAuth, что и код из письма.
 * У нового пользователя показывает неблокирующий шаг «Почти готово» (телефон, только РФ).
 *
 * Если Яндекс не отдал почту — это не тупик: предлагаем повторить вход с экраном
 * прав (force_confirm) либо сразу войти по email.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { setAuth } from '@shared/modules/store/slices/auth';
import {
  parseYandexDeepLink,
  updateProfilePhone,
  yandexExchange,
  yandexStartUrl,
} from '@shared/modules/api/yandexAuth';
import { formatRuPhoneInput, normalizeRuPhone, RU_PHONE_HINT } from '@shared/utils/phone';
import { onDeepLink, openExternal, takeDeepLink } from '../lib/desktop';
import '../components/yandex.css';

type Stage = 'idle' | 'loading' | 'phone' | 'error';

const ERROR_TEXT: Record<string, string> = {
  yandex_email_required:
    'Яндекс не передал адрес почты. Она нужна, чтобы связать вход с вашим аккаунтом Totus Club. Можно вернуться на страницу Яндекса и разрешить доступ — или войти по email.',
  yandex_access_denied: 'Вы не разрешили доступ на странице Яндекса. Можно попробовать снова или войти по email.',
  ticket_invalid: 'Ссылка устарела: на подтверждение даётся две минуты. Начните вход заново.',
};

const DEFAULT_ERROR = 'Не получилось войти через Яндекс. Попробуйте ещё раз или войдите по email.';

export const YandexAuthBridge: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handled = useRef<Set<string>>(new Set());

  const [stage, setStage] = useState<Stage>('idle');
  const [errorCode, setErrorCode] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleUrl = useCallback(
    async (url?: string | null) => {
      if (!url) return;
      const parsed = parseYandexDeepLink(url);
      if (!parsed) return;

      if (parsed.error) {
        setErrorCode(parsed.error);
        setStage('error');
        return;
      }
      const ticket = parsed.ticket;
      if (!ticket || handled.current.has(ticket)) return;
      handled.current.add(ticket);

      setStage('loading');
      try {
        const data = await yandexExchange(ticket);
        const token = data.accessToken || data.authToken;
        if (!data?.auth || !token) {
          setErrorCode('ticket_invalid');
          setStage('error');
          return;
        }
        dispatch(
          setAuth({
            token,
            refreshToken: data.refreshToken ?? null,
            user: jwtDecode(token),
          }),
        );
        if (data.needsPhone) {
          setStage('phone');
          return;
        }
        setStage('idle');
        navigate('/account');
      } catch (error: any) {
        setErrorCode(error?.response?.data?.error || 'yandex_failed');
        setStage('error');
      }
    },
    [dispatch, navigate],
  );

  useEffect(() => {
    void takeDeepLink().then(handleUrl);
    return onDeepLink(url => void handleUrl(url));
  }, [handleUrl]);

  const goAccount = () => {
    setStage('idle');
    navigate('/account');
  };

  /** Повтор входа: с force Яндекс снова покажет экран прав, где можно выдать почту. */
  const retryYandex = (force: boolean) => {
    setStage('idle');
    openExternal(yandexStartUrl({ force }));
  };

  const goEmailLogin = () => {
    setStage('idle');
    navigate('/login');
  };

  const onPhoneChange = (value: string) => {
    setPhone(formatRuPhoneInput(value));
    if (phoneError) setPhoneError('');
  };

  const onSavePhone = async () => {
    const normalized = normalizeRuPhone(phone);
    if (!normalized) {
      setPhoneError(RU_PHONE_HINT);
      return;
    }
    setPhoneError('');
    setSaving(true);
    try {
      const data = await updateProfilePhone(normalized);
      const token = data?.accessToken || data?.authToken;
      if (token) {
        dispatch(
          setAuth({
            token,
            refreshToken: data?.refreshToken ?? null,
            user: jwtDecode(token),
          }),
        );
      }
      goAccount();
    } catch (error: any) {
      setPhoneError(
        error?.response?.data?.error === 'phone_invalid'
          ? error?.response?.data?.message || RU_PHONE_HINT
          : 'Не удалось сохранить номер',
      );
    } finally {
      setSaving(false);
    }
  };

  if (stage === 'idle') return null;

  const needsEmailPermission = errorCode === 'yandex_email_required';
  const errorText = ERROR_TEXT[errorCode] || DEFAULT_ERROR;

  return (
    <div className="yandex-overlay">
      <div className="yandex-dialog">
        {stage === 'loading' ? (
          <>
            <h2>Завершаем вход…</h2>
            <p>Проверяем ответ Яндекс ID. Это занимает пару секунд.</p>
          </>
        ) : null}

        {stage === 'phone' ? (
          <>
            <h2>Почти готово</h2>
            <p>Добавьте телефон — он нужен для оформления заказа и связи по бронированию.</p>
            <input
              className="input"
              type="tel"
              value={phone}
              onChange={e => onPhoneChange(e.target.value)}
              placeholder="+7 999 123-45-67"
              maxLength={18}
              autoFocus
            />
            <p>Только российские номера: +7 или 8</p>
            {phoneError ? <div className="error-text">{phoneError}</div> : null}
            <button type="button" className="btn btn--block" disabled={saving} onClick={() => void onSavePhone()}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
            <button type="button" className="yandex-dialog__skip" onClick={goAccount}>
              Пропустить
            </button>
          </>
        ) : null}

        {stage === 'error' ? (
          <>
            <h2>{needsEmailPermission ? 'Нужен доступ к почте' : 'Не получилось войти'}</h2>
            <p className="yandex-dialog__error">{errorText}</p>
            <button type="button" className="yandex-btn" onClick={() => retryYandex(needsEmailPermission)}>
              <span className="yandex-btn__logo" aria-hidden="true">Я</span>
              <span>{needsEmailPermission ? 'Разрешить доступ к почте' : 'Попробовать снова'}</span>
            </button>
            {needsEmailPermission ? (
              <p>На странице Яндекса отметьте «Адрес электронной почты» и нажмите «Разрешить».</p>
            ) : null}
            <button type="button" className="btn btn--block" onClick={goEmailLogin}>
              Войти по email
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default YandexAuthBridge;
