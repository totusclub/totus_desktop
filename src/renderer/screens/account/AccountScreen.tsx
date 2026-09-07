import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import type { RootState } from '@shared/modules/store';
import { logoutReducer } from '@shared/modules/store/slices/auth';
import { getUserById } from '@shared/modules/api/users';
import { useAppNavigation, useRouteParams } from '../../app/navigation';
import { PageHeader } from '../../shell/PageHeader';
import { Icon } from '../../icons';
import { ConfirmModal, Modal } from '../../components/Modal';
import { useTheme } from '../../theme/ThemeContext';
import { openExternal } from '../../lib/desktop';
import { CallDialog } from '../../voip/CallDialog';
import { cleanupVoipOnLogout, getCallState, setUserLoyaltyId, startOutgoingVoiceCallByLoyaltyId } from '../../voip/VoipClient';
import './account.css';

// Порт component/account/Account.tsx (Figma «Desktop / Account»): слева карта лояльности,
// справа группы настроек; Alert → inline-тосты / ConfirmModal; шторки → центрированные диалоги.

// Support team loyalty ID — change this to your actual support account loyalty_id
const SUPPORT_LOYALTY_ID = '0978 6356 3712 8057';
const SUPPORT_DISPLAY_NAME = 'Поддержка Totus';
const SUPPORT_PHONE_NUMBER = '+74951234567'; // Fallback phone number

type DecodedToken = {
  id?: string;
  name?: string;
  l_name?: string;
  loyalty_id?: string;
  email?: string;
  [key: string]: any;
};

const CopyIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const InfoIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const UserIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

type CallSupportModalProps = {
  open: boolean;
  onClose: () => void;
  onCallPhone: () => void;
  onCallApp: () => void;
  error?: string | null;
};

/** Шторка «Звонок в поддержку» → центрированный диалог 520 (Figma «Desktop / Support call»). */
const CallSupportModal: React.FC<CallSupportModalProps> = ({ open, onClose, onCallPhone, onCallApp, error }) => (
  <Modal open={open} onClose={onClose} width={520}>
    <div className="account-support">
      <div className="account-support__title">Звонок в поддержку</div>
      <div className="account-support__message">Выберите способ связи с поддержкой</div>
      {error ? <div className="error-text account-support__error">{error}</div> : null}
      <div className="account-support__actions">
        <button type="button" className="btn btn--block account-support__btn" onClick={onCallApp}>
          <Icon name="phone" size={20} color="#FFFFFF" />
          Звонок через приложение
        </button>
        <button type="button" className="btn btn--ghost btn--block account-support__btn" onClick={onCallPhone}>
          <Icon name="phone" size={20} />
          Позвонить по телефону
        </button>
        <button type="button" className="account-support__cancel" onClick={onClose}>
          Отмена
        </button>
      </div>
    </div>
  </Modal>
);

export const AccountScreen: React.FC = () => {
  const nav = useAppNavigation();
  const routeParams = useRouteParams();
  const dispatch = useDispatch();
  const { accessToken, user: userFromState, fullAuth, userId } = useSelector((state: RootState) => state.auth);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [showCallingSupport, setShowCallingSupport] = useState(true);
  const [toast, setToast] = useState<{ title: string; text: string; error?: boolean } | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);
  const { isDark, toggle: toggleTheme } = useTheme();

  // Тост «Скопировано» / «Ошибка» (замена Alert.alert)
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // access 0 = show calling support, access 1 = hide
  useEffect(() => {
    if (!userId) {
      setShowCallingSupport(true);
      return;
    }
    getUserById(Number(userId))
      .then(u => {
        const a = u?.access;
        setShowCallingSupport(a === 0 || a === false);
        // Для звонка: loyalty_id пользователя (как CallsScreen.initializeUser → setUserLoyaltyId)
        if (u?.loyaltyId) setUserLoyaltyId(u.loyaltyId);
      })
      .catch(() => setShowCallingSupport(true));
  }, [userId]);

  // Check authentication and redirect to login if not authenticated
  useEffect(() => {
    if (!fullAuth || !accessToken) {
      nav.navigate('login', {
        returnTo: 'account',
        returnParams: routeParams || {},
      });
    }
    // routeParams — новый объект на каждый рендер (location.state || {}), в зависимости не включаем.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullAuth, accessToken, nav]);

  // Use user from state, or decode from token if not available
  const user: DecodedToken | null = useMemo(() => {
    if (userFromState) {
      return userFromState as DecodedToken;
    }
    if (!accessToken) return null;
    try {
      return jwtDecode<DecodedToken>(accessToken);
    } catch (error) {
      console.error('[AccountScreen] Error decoding token:', error);
      return null;
    }
  }, [accessToken, userFromState]);

  const formatLoyaltyCard = (loyaltyId: string | undefined): string => {
    if (!loyaltyId) return '0000 0000 0000 0000';
    // Format as XXXX XXXX XXXX XXXX
    const cleaned = loyaltyId.replace(/\s/g, '');
    return cleaned.match(/.{1,4}/g)?.join(' ') || loyaltyId;
  };

  const userName = user ? `${user.name || ''} ${user.l_name || ''}`.trim() : 'Пользователь';
  const loyaltyId = String(user?.loyalty_id || user?.id || '0000 0000 0000 0000');

  const handleCopyLoyaltyId = async () => {
    const loyaltyIdToCopy = loyaltyId.replace(/\s/g, ''); // Remove spaces for copy
    try {
      await navigator.clipboard.writeText(loyaltyIdToCopy);
      setToast({ title: 'Скопировано', text: 'Loyalty ID скопирован в буфер обмена' });
    } catch (error) {
      console.error('Error copying loyalty ID:', error);
      setToast({ title: 'Ошибка', text: 'Не удалось скопировать Loyalty ID', error: true });
    }
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    // Clean up call-related state before logout
    await cleanupVoipOnLogout();
    dispatch(logoutReducer());
    nav.reset('login');
  };

  const confirmDeleteAccount = async () => {
    // TODO: Implement account deletion API call (как в приложении — пока только выход)
    setDeleteModalVisible(false);
    await cleanupVoipOnLogout();
    dispatch(logoutReducer());
    nav.reset('login');
  };

  const handleCallSupportPhone = () => {
    setSupportModalVisible(false);
    openExternal(`tel:${SUPPORT_PHONE_NUMBER}`);
  };

  const handleCallSupportApp = async () => {
    const callState = getCallState();
    if (callState.state !== 'idle' && callState.state !== 'ended' && callState.state !== 'rejected') {
      setSupportError('У вас уже есть активный звонок');
      return;
    }
    setSupportError(null);
    setSupportModalVisible(false);
    setCallModalVisible(true);
    try {
      await startOutgoingVoiceCallByLoyaltyId(SUPPORT_LOYALTY_ID, SUPPORT_DISPLAY_NAME);
    } catch (e: any) {
      console.error('Failed to call support:', e);
      const errorMessage = e?.message || 'Неизвестная ошибка';
      setCallModalVisible(false);
      // Деградация: «Не удалось соединиться» + предложение позвонить по телефону
      setSupportError(`Не удалось соединиться: ${errorMessage}`);
      setSupportModalVisible(true);
    }
  };

  // Don't render if not authenticated (will redirect to login)
  if (!fullAuth || !accessToken) {
    return null;
  }

  const settingsBlocks = (
    <div className="account-settings">
      <div className="card account-settings__card">
        {showCallingSupport ? (
          <>
            <button type="button" className="account-row" onClick={() => setSupportModalVisible(true)}>
              <span className="account-row__icon account-row__icon--green">
                <Icon name="helpcenter" size={16} color="#34C759" />
              </span>
              <span className="account-row__text">
                <span className="account-row__title">Звонок в поддержку</span>
                <span className="account-row__subtitle">Связаться с командой Totus</span>
              </span>
              <Icon name="arrowRight" size={14} color="var(--text-tertiary)" />
            </button>
            <div className="account-row__hairline" />
          </>
        ) : null}

        <div className="account-row account-row--static">
          <span className={'account-row__icon ' + (isDark ? 'account-row__icon--violet' : 'account-row__icon--orange')}>
            {isDark ? <Icon name="moon" size={16} color="#5856D6" /> : <Icon name="sun" size={16} color="#FF9500" />}
          </span>
          <span className="account-row__text">
            <span className="account-row__title">{isDark ? 'Тёмная тема' : 'Светлая тема'}</span>
            <span className="account-row__subtitle">Внешний вид приложения</span>
          </span>
          <button
            type="button"
            className={'toggle' + (isDark ? ' toggle--on account-toggle--dark' : '')}
            role="switch"
            aria-checked={isDark}
            aria-label="Тёмная тема"
            onClick={toggleTheme}
          />
        </div>
      </div>

      <div className="card account-settings__card">
        <button type="button" className="account-row" onClick={() => nav.navigate('privacyPolicy')}>
          <span className="account-row__icon account-row__icon--violet">
            <Icon name="document" size={16} color="#5856D6" />
          </span>
          <span className="account-row__text">
            <span className="account-row__title">Политика конфиденциальности</span>
            <span className="account-row__subtitle">Как мы защищаем ваши данные</span>
          </span>
          <Icon name="arrowRight" size={14} color="var(--text-tertiary)" />
        </button>
      </div>

      <div className="card account-settings__card">
        <button type="button" className="account-row" onClick={() => setLogoutModalVisible(true)}>
          <span className="account-row__icon account-row__icon--orange">
            <Icon name="logout" size={16} color="#FF9500" />
          </span>
          <span className="account-row__title account-row__title--solo">Выйти</span>
          <Icon name="arrowRight" size={14} color="var(--text-tertiary)" />
        </button>
        <div className="account-row__hairline" />
        <button type="button" className="account-row" onClick={() => setDeleteModalVisible(true)}>
          <span className="account-row__icon account-row__icon--brand">
            <Icon name="warning" size={16} color="#FE732E" />
          </span>
          <span className="account-row__title account-row__title--solo" style={{ color: '#FE732E' }}>
            Удалить аккаунт
          </span>
          <Icon name="arrowRight" size={14} color="var(--text-tertiary)" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader title="Аккаунт" />
      <div className="page-body">
        <div className="account-layout">
          <div className="account-main">
            {/* Loyalty Card */}
            <div className="loyalty-card">
              <div className="loyalty-card__bg" aria-hidden="true" />
              <div className="loyalty-card__content">
                <div className="loyalty-card__header">
                  <div className="loyalty-card__title">Карта лояльности</div>
                  <Icon name="bird" size={64} color="#FFFFFF" />
                </div>

                <div className="loyalty-card__info">
                  <button type="button" className="loyalty-card__number-btn" onClick={() => void handleCopyLoyaltyId()} title="Скопировать">
                    <span className="loyalty-card__number">{formatLoyaltyCard(loyaltyId)}</span>
                    <span className="loyalty-card__copy">
                      <CopyIcon size={18} />
                    </span>
                  </button>
                  <div className="loyalty-card__info-row">
                    <InfoIcon size={18} />
                    <span className="loyalty-card__info-text">Ваш персональный номер</span>
                  </div>
                </div>

                <div className="loyalty-card__footer">
                  <div className="loyalty-card__name">{userName}</div>
                  <span className="loyalty-card__user">
                    <UserIcon size={16} />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <aside className="account-side">{settingsBlocks}</aside>
        </div>
      </div>

      {toast ? (
        <div className={'account-toast' + (toast.error ? ' account-toast--error' : '')} role="status">
          <div className="account-toast__title">{toast.title}</div>
          <div className="account-toast__text">{toast.text}</div>
        </div>
      ) : null}

      <ConfirmModal
        open={deleteModalVisible}
        title="Удаление аккаунта"
        text="Вы действительно хотите удалить аккаунт? Если вы не войдёте в систему в течение 30 дней, аккаунт будет автоматически удалён."
        confirmText="Удалить"
        cancelText="Отмена"
        danger
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={() => void confirmDeleteAccount()}
      />

      <ConfirmModal
        open={logoutModalVisible}
        title="Выход"
        text="Вы действительно хотите выйти?"
        confirmText="Выйти"
        cancelText="Отмена"
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={() => void confirmLogout()}
      />

      <CallSupportModal
        open={supportModalVisible}
        error={supportError}
        onClose={() => {
          setSupportModalVisible(false);
          setSupportError(null);
        }}
        onCallPhone={handleCallSupportPhone}
        onCallApp={() => void handleCallSupportApp()}
      />

      {/* Active call UI */}
      <CallDialog open={callModalVisible} onClose={() => setCallModalVisible(false)} />
    </>
  );
};

export default AccountScreen;
