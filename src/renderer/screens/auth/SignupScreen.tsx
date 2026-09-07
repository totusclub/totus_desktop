import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@shared/modules/store';
import { signupUser } from '@shared/modules/store/actions/auth';
import { useAppNavigation, useRouteParams } from '../../app/navigation';
import { SmartCaptcha, YANDEX_SMARTCAPTCHA_SITEKEY, type CaptchaStatus } from '../../components/SmartCaptcha';
import { AuthLayout } from './AuthLayout';
import './auth.css';

// Порт screens/auth/SignupScreen.tsx: Имя + email + капча → signupUser → verification (isSignup).

type SignupRouteParams = { email?: string; returnTo?: string; returnParams?: Record<string, unknown> };

export const SignupScreen: React.FC = () => {
  const nav = useAppNavigation();
  const params = useRouteParams<SignupRouteParams>();
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(params?.email || '');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [captchaStatus, setCaptchaStatus] = useState<CaptchaStatus>('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captchaRequired = Boolean(YANDEX_SMARTCAPTCHA_SITEKEY);
  const formReady = Boolean(name.trim()) && Boolean(email.trim());
  const buttonDisabled = useMemo(() => !formReady || loading, [formReady, loading]);

  const resetCaptcha = () => {
    setCaptchaToken('');
    setCaptchaResetKey(k => k + 1);
  };

  const onSubmit = async () => {
    if (!formReady || loading) return;

    if (captchaRequired && !captchaToken) {
      setError(
        captchaStatus === 'error'
          ? 'Обновите капчу и попробуйте снова'
          : 'Пройдите проверку «Я не робот» ниже, затем нажмите «Продолжить»',
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await dispatch(
        signupUser({
          name: name.trim(),
          email: email.trim(),
          'smart-token': captchaToken,
          smartToken: captchaToken,
        }),
      );
      if (signupUser.fulfilled.match(result)) {
        const payload = result.payload as any;
        if (!payload?.screen) {
          setError(payload?.message || 'Ошибка регистрации');
          resetCaptcha();
          return;
        }
        nav.navigate('verification', {
          email: email.trim(),
          isSignup: true,
          returnTo: params?.returnTo,
          returnParams: params?.returnParams,
        });
      } else {
        setError((result.payload as any)?.message || 'Не удалось зарегистрироваться');
        resetCaptcha();
      }
    } catch (e: any) {
      setError(e?.message || 'Ошибка регистрации');
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
          <h1 className="auth-form__title">Регистрация</h1>
        </div>

        <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Имя" autoComplete="given-name" autoFocus />
        <input
          className="input"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoCapitalize="none"
          placeholder="Электронная почта"
          autoComplete="email"
        />

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
          {loading ? 'Отправка…' : 'Продолжить'}
        </button>

        <button type="button" className="link auth-form__link" onClick={() => nav.navigate('login', { returnTo: params?.returnTo, returnParams: params?.returnParams })}>
          Уже есть аккаунт
        </button>
      </form>
    </AuthLayout>
  );
};

export default SignupScreen;
