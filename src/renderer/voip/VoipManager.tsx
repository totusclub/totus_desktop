import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/modules/store';
import { getUserById } from '@shared/modules/api/users';
import { CallDialog } from './CallDialog';
import { getCurrentLoyaltyId, setUserLoyaltyId, subscribe, type VoipSnapshot } from './VoipClient';

/**
 * Глобальный менеджер звонков (аналог GlobalCallManager в панели calling_v2 и
 * initVoipAndCallKeep при старте приложения): как только пользователь авторизован —
 * регистрируем устройство в calling_api_v2 и держим сокет, чтобы входящий звонок от поддержки
 * пришёл на любом экране; окно звонка показывается поверх всего приложения.
 */
export const VoipManager: React.FC = () => {
  const { accessToken, fullAuth, userId } = useSelector((s: RootState) => s.auth);
  const [snap, setSnap] = useState<VoipSnapshot | null>(null);
  const [hiddenForCall, setHiddenForCall] = useState<string | null>(null);
  const lastRegisteredUserRef = useRef<string | null>(null);

  useEffect(() => subscribe(setSnap), []);

  // Регистрация при старте / после входа (loyalty_id берём из /api/users/by-id, как в AccountScreen).
  useEffect(() => {
    if (!fullAuth || !accessToken || !userId) {
      lastRegisteredUserRef.current = null;
      return;
    }
    const key = String(userId);
    if (lastRegisteredUserRef.current === key && getCurrentLoyaltyId()) return;
    let cancelled = false;
    getUserById(Number(userId))
      .then(u => {
        if (cancelled) return;
        if (u?.loyaltyId) {
          lastRegisteredUserRef.current = key;
          setUserLoyaltyId(u.loyaltyId);
        }
      })
      .catch(e => console.warn('[voip] не удалось получить loyalty_id для регистрации устройства', e));
    return () => {
      cancelled = true;
    };
  }, [fullAuth, accessToken, userId]);

  if (!snap || snap.state === 'idle') return null;
  // «Свернуть» скрывает окно до следующего звонка (входящий всегда показывается).
  const open = hiddenForCall !== snap.callUUID || snap.state === 'ringing';
  return <CallDialog open={open} onClose={() => setHiddenForCall(snap.callUUID)} />;
};

export default VoipManager;
