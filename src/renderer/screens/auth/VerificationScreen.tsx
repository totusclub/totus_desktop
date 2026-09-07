import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import type { AppDispatch, RootState } from '@shared/modules/store';
import { loginUser, verifyCode } from '@shared/modules/store/actions/auth';
import { setAuth } from '@shared/modules/store/slices/auth';
import { ELoginDataType } from '@shared/modules/store/types/auth';
import { useAppNavigation, useRouteParams } from '../../app/navigation';
import { AuthLayout } from './AuthLayout';
import './auth.css';

// Порт component/auth/Verification.tsx + UI/verificationCode (4 ячейки кода, таймер повторной отправки).

type VerificationRouteParams = {
  email: string;
  isSignup?: boolean;
  returnTo?: string; // Screen to navigate to after verification
  returnParams?: Record<string, unknown>; // Params for the return screen
};

const CELL_COUNT = 4;

type CodeInputProps = {
  setValid?: (value: boolean) => void;
  valid?: boolean;
  error?: boolean;
  onComplete: (code: string) => void;
};

/** Порт UI/verificationCode: 4 ячейки, ввод только цифр, onComplete при 4 символах. */
const VerificationCode: React.FC<CodeInputProps> = ({ setValid, valid, error, onComplete }) => {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.length === CELL_COUNT) {
      // Use setTimeout to avoid calling during render
      const t = setTimeout(() => onComplete(value), 0);
      return () => clearTimeout(t);
    }
    setValid?.(false);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/\D/g, '').slice(0, CELL_COUNT);
    setValue(next);
  };

  const activeIndex = Math.min(value.length, CELL_COUNT - 1);

  return (
    <div className="code">
      <div className="code__cells" onClick={() => inputRef.current?.focus()}>
        {Array.from({ length: CELL_COUNT }).map((_, index) => {
          const symbol = value[index] || '';
          const isFocused = focused && index === activeIndex && value.length < CELL_COUNT;
          const cls =
            'code__cell' +
            (error ? ' code__cell--error' : index < value.length || isFocused ? ' code__cell--active' : '') +
            (isFocused ? ' code__cell--cursor' : '');
          return (
            <span key={index} className={cls} aria-hidden="true">
              {symbol}
            </span>
          );
        })}
        <input
          ref={inputRef}
          className="code__input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CELL_COUNT}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Код подтверждения"
        />
      </div>
      {!error && !valid ? <div className="code__hint muted">Введите код, направленный на email.</div> : null}
      {error ? <div className="code__hint error-text">Некорректный код. Попробуйте снова.</div> : null}
    </div>
  );
};

export const VerificationScreen: React.FC = () => {
  const nav = useAppNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.auth);
  const params = useRouteParams<VerificationRouteParams>();
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [valid, setValid] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { email = '', isSignup = false, returnTo, returnParams } = params || {};

  const handleComplete = useCallback(
    async (fullCode: string) => {
      if (!email) {
        setError('Ошибка: Email не найден');
        return;
      }

      try {
        setError(null);

        const result = await dispatch(
          verifyCode({
            email: email,
            code: fullCode,
          }),
        );

        if (verifyCode.fulfilled.match(result)) {
          const data = result.payload as any;

          // Check if auth is true (like web code: if(data.auth))
          if (data?.auth && data?.authToken) {
            // Decode token and set auth (like web code)
            const user = jwtDecode(data.authToken);

            dispatch(
              setAuth({
                token: data.accessToken || data.authToken,
                refreshToken: data.refreshToken ?? null,
                user,
              }),
            );

            // Navigate to return screen if specified, otherwise navigate to account
            // (в RN — вложенная навигация tab → AccountStackScreen → account; на десктопе маршрут прямой)
            if (returnTo) {
              nav.navigate(returnTo, returnParams || {});
            } else {
              nav.navigate('account');
            }
          } else {
            setValid(true);
          }
        } else {
          setValid(true);
          setError('Некорректный код. Попробуйте снова.');
        }
      } catch (err: any) {
        setValid(true);
        setError(err?.message || 'Произошла ошибка');
      }
    },
    [email, returnTo, returnParams, dispatch, nav],
  );

  useEffect(() => {
    if (secondsLeft === 0) return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const handleResendCode = async () => {
    if (!email) return;

    try {
      setError(null);
      setValid(false);

      if (isSignup) {
        // For signup resend, we need to call signupUser again
        // But we don't have the signup data here, so we'll just show an error
        setError('Для повторной отправки кода вернитесь на экран регистрации');
        return;
      }
      const result = await dispatch(
        loginUser({
          type: ELoginDataType.email,
          email: email,
        }),
      );

      if (loginUser.fulfilled.match(result)) {
        setSecondsLeft(60);
      } else {
        setError((result.payload as any)?.message || 'Ошибка при повторной отправке кода');
      }
    } catch (err: any) {
      setError(err?.message || 'Произошла ошибка');
    }
  };

  return (
    <AuthLayout>
      <div className="auth-form">
        <div className="auth-form__header">
          <h1 className="auth-form__title">Подтверждение</h1>
          <p className="auth-form__subtitle">Введите код, направленный на {email}</p>
        </div>

        {/* Как в приложении с onComplete: внутренняя ошибка ячеек не используется, текст ошибки — ниже на экране */}
        <VerificationCode setValid={setValid} valid={valid} onComplete={code => void handleComplete(code)} />

        {loading ? <div className="auth-form__info">Проверка кода…</div> : null}
        {error ? <div className="error-text auth-form__error auth-form__error--center">{error}</div> : null}

        <div className="auth-form__resend">
          {secondsLeft > 0 ? (
            <span className="muted">Выслать код повторно через {secondsLeft} сек.</span>
          ) : (
            <button type="button" className="link" onClick={() => void handleResendCode()}>
              Отправить код повторно
            </button>
          )}
        </div>

        <button type="button" className="link auth-form__link" onClick={() => nav.goBack()}>
          Назад
        </button>
      </div>
    </AuthLayout>
  );
};

export default VerificationScreen;
