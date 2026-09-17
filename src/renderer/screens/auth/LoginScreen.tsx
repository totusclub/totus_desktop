import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@shared/modules/store';
import { loginUser } from '@shared/modules/store/actions/auth';
import { ELoginDataType } from '@shared/modules/store/types/auth';
import { useAppNavigation, useRouteParams } from '../../app/navigation';
import { SmartCaptcha, YANDEX_SMARTCAPTCHA_SITEKEY, type CaptchaStatus } from '../../components/SmartCaptcha';
import { YandexIdButton } from '../../components/YandexIdButton';
import { AuthLayout } from './AuthLayout';
import './auth.css';

// Порт screens/auth/LoginScreen.tsx (+ returnTo/returnParams из component/auth/Login.tsx):
// email → капча → loginUser → verification (или signup при payload.screen === 'SIGNUP').
// Капча показывается ПОСЛЕ нажатия «Войти» и сама отправляет форму, когда пройдена;
// вход через Яндекс ID капчу не требует.

type LoginRouteParams = {
  returnTo?: string;
  returnParams?: Record<string, unknown>;
  email?: string;
};

export const LoginScreen: React.FC = () => {
  const nav = useAppNavigation();
  const params = useRouteParams<LoginRouteParams>();
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState(params?.email || '');
  const [emailValid, setEmailValid] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [captchaStatus, setCaptchaStatus] = useState<CaptchaStatus>('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captchaRequired = Boolean(YANDEX_SMARTCAPTCHA_SITEKEY);
  const buttonDisabled = useMemo(() => !emailValid || loading, [emailValid, loading]);

  // Update valid state when email from route params is set
  useEffect(() => {
    if (params?.email) {
      setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email.trim()));
    }
  }, [params?.email]);

  const onEmailChange = (value: string) => {
    setEmail(value);
    setError(null);
    setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
  };

  const resetCaptcha = () => {
    setCaptchaToken('');
    setCaptchaResetKey(k => k + 1);
  };

  const submit = async (token: string) => {
    setLoading(true);
    setError(null);
    const { returnTo, returnParams } = params || {};
    try {
      const result = await dispatch(
        loginUser({
          type: ELoginDataType.email,
          email: email.trim(),
          'smart-token': token,
          smartToken: token,
        }),
      );
      if (loginUser.fulfilled.match(result)) {
        const payload = result.payload as any;
        if (payload?.error || payload?.message === 'Captcha validation failed') {
          setError(payload?.message || 'Ошибка капчи');
          resetCaptcha();
          return;
        }
        if (payload?.screen === 'SIGNUP') {
          nav.navigate('signup', { email: email.trim(), returnTo, returnParams });
          return;
        }
        nav.navigate('verification', {
          email: email.trim(),
          isSignup: false,
          returnTo,
          returnParams,
        });
      } else {
        setError((result.payload as any)?.message || 'Не удалось отправить код');
        resetCaptcha();
      }
    } catch (e: any) {
      setError(e?.message || 'Ошибка входа');
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!emailValid || loading) return;

    // Капча нужна — показываем её; запрос уйдёт сам после прохождения.
    if (captchaRequired && !captchaToken) {
      setCaptchaVisible(true);
      setError(captchaStatus === 'error' && captchaVisible ? 'Обновите капчу и попробуйте снова' : null);
      return;
    }

    await submit(captchaToken);
  };

  // Капча пройдена после нажатия «Войти» — отправляем без второго клика.
  useEffect(() => {
    if (!captchaVisible || !captchaToken || loading || !emailValid) return;
    void submit(captchaToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captchaToken, captchaVisible]);

  return (
    <AuthLayout>
      <form
        className="auth-form"
        onSubmit={e => {
          e.preventDefault();
          void onSubmit();
        }}>
        <div className="auth-form__header">
          <h1 className="auth-form__title">Вход</h1>
          <p className="auth-form__subtitle">Введите ваш email для входа в аккаунт</p>
        </div>

        <input
          className="input"
          type="email"
          value={email}
          onChange={e => onEmailChange(e.target.value)}
          placeholder="Электронная почта"
          autoCapitalize="none"
          autoComplete="email"
          autoFocus
        />

        <p className="auth-form__info">Мы отправим код подтверждения на вашу электронную почту</p>

        {captchaVisible ? (
          <>
            <p className="auth-form__info">Подтвердите, что вы не робот — и мы отправим код на почту</p>
            <SmartCaptcha
              resetKey={captchaResetKey}
              onTokenChange={token => {
                setCaptchaToken(token);
                if (token) setError(null);
              }}
              onStatusChange={setCaptchaStatus}
            />
          </>
        ) : null}

        {error ? <div className="error-text auth-form__error">{error}</div> : null}

        <button type="submit" className="btn btn--block" disabled={buttonDisabled}>
          {loading ? 'Отправка…' : 'Войти'}
        </button>

        {/* Вход через Яндекс ID — появляется, только если раздел включён на сервере */}
        <YandexIdButton />
      </form>
    </AuthLayout>
  );
};

export default LoginScreen;
