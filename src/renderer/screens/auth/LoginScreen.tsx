import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@shared/modules/store';
import { loginUser } from '@shared/modules/store/actions/auth';
import { ELoginDataType } from '@shared/modules/store/types/auth';
import { useAppNavigation, useRouteParams } from '../../app/navigation';
import { SmartCaptcha, YANDEX_SMARTCAPTCHA_SITEKEY, type CaptchaStatus } from '../../components/SmartCaptcha';
import { AuthLayout } from './AuthLayout';
import './auth.css';

// Порт screens/auth/LoginScreen.tsx (+ returnTo/returnParams из component/auth/Login.tsx):
// email → капча → loginUser → verification (или signup при payload.screen === 'SIGNUP').

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
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [captchaStatus, setCaptchaStatus] = useState<CaptchaStatus>('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captchaRequired = Boolean(YANDEX_SMARTCAPTCHA_SITEKEY);
  /** Keep button tappable when email is valid so reviewers get feedback, not a dead gray control. */
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

  const onSubmit = async () => {
    if (!emailValid || loading) return;

    if (captchaRequired && !captchaToken) {
      setError(
        captchaStatus === 'error' ? 'Обновите капчу и попробуйте снова' : 'Пройдите проверку «Я не робот» ниже, затем нажмите «Войти»',
      );
      return;
    }

    setLoading(true);
    setError(null);
    const { returnTo, returnParams } = params || {};
    try {
      const result = await dispatch(
        loginUser({
          type: ELoginDataType.email,
          email: email.trim(),
          'smart-token': captchaToken,
          smartToken: captchaToken,
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

        <SmartCaptcha
          resetKey={captchaResetKey}
          onTokenChange={token => {
            setCaptchaToken(token);
            if (token) setError(null);
          }}
          onStatusChange={setCaptchaStatus}
        />

        {error ? <div className="error-text auth-form__error">{error}</div> : null}

        <button type="submit" className="btn btn--block" disabled={buttonDisabled}>
          {loading ? 'Отправка…' : 'Войти'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginScreen;
