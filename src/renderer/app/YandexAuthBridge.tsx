/**
 * Возврат из браузера после входа через Яндекс ID.
 *
 * Слушает deep link totus://auth/yandex?ticket=… (главный процесс отдаёт его по IPC),
 * меняет одноразовый ticket на наши токены и кладёт их тем же setAuth, что и код из письма.
 * У нового пользователя показывает неблокирующий шаг «Почти готово» (телефон).
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
} from '@shared/modules/api/yandexAuth';
import { onDeepLink, takeDeepLink } from '../lib/desktop';
import '../components/yandex.css';

type Stage = 'idle' | 'loading' | 'phone' | 'error';

const ERROR_TEXT: Record<string, string> = {
  yandex_email_required:
    'Яндекс не передал адрес почты. Она нужна, чтобы связать вход с вашим аккаунтом Totus Club. Разрешите доступ к почте на странице Яндекса или войдите по email.',
  yandex_access_denied: 'Вы не разрешили доступ на странице Яндекса. Можно попробовать снова или войти по email.',
  user_blocked: 'Доступ к этому аккаунту ограничен. Напишите в поддержку — мы разберёмся.',
  ticket_invalid: 'Ссылка устарела: на подтверждение даётся две минуты. Начните вход заново.',
};

const DEFAULT_ERROR = 'Не получилось войти через Яндекс. Попробуйте ещё раз или войдите по email.';

export const YandexAuthBridge: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handled = useRef<Set<string>>(new Set());

  const [stage, setStage] = useState<Stage>('idle');
  const [errorText, setErrorText] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleUrl = useCallback(
    async (url?: string | null) => {
      if (!url) return;
      const parsed = parseYandexDeepLink(url);
      if (!parsed) return;

      if (parsed.error) {
        setErrorText(ERROR_TEXT[parsed.error] || DEFAULT_ERROR);
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
          setErrorText(ERROR_TEXT.ticket_invalid);
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
        setErrorText(ERROR_TEXT[error?.response?.data?.error] || DEFAULT_ERROR);
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

  const onSavePhone = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setPhoneError('Введите номер целиком');
      return;
    }
    setPhoneError('');
    setSaving(true);
    try {
      const data = await updateProfilePhone(phone);
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
        error?.response?.data?.error === 'phone_invalid' ? 'Проверьте номер' : 'Не удалось сохранить номер',
      );
    } finally {
      setSaving(false);
    }
  };

  if (stage === 'idle') return null;

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
              onChange={e => setPhone(e.target.value)}
              placeholder="+7 999 123-45-67"
              autoFocus
            />
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
            <h2>Не получилось войти</h2>
            <p className="yandex-dialog__error">{errorText}</p>
            <button type="button" className="btn btn--block" onClick={() => setStage('idle')}>
              Понятно
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default YandexAuthBridge;
