import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/modules/store';
import { getUserById } from '@shared/modules/api/users';

// Гейт вкладки Totus AI — как в navigation/authStack.tsx приложения:
// access 0 → показывать AI, 1 → прятать; при ошибке/отсутствии ответа — показывать (0).
let cached: { userId: string | number | null; value: 0 | 1 | null } = { userId: null, value: null };

export function useUserAccess(): 0 | 1 | null {
  const { accessToken, userId } = useSelector((s: RootState) => s.auth);
  const [access, setAccess] = useState<0 | 1 | null>(cached.userId === userId ? cached.value : null);

  useEffect(() => {
    if (!accessToken || !userId) {
      setAccess(null);
      cached = { userId: null, value: null };
      return;
    }
    if (cached.userId === userId && cached.value !== null) {
      setAccess(cached.value);
      return;
    }
    let alive = true;
    getUserById(Number(userId))
      .then(user => {
        const a = (user as any)?.access;
        const v: 0 | 1 = !user || a === 0 || a === false ? 0 : 1;
        cached = { userId, value: v };
        if (alive) setAccess(v);
      })
      .catch(() => {
        cached = { userId, value: 0 };
        if (alive) setAccess(0);
      });
    return () => {
      alive = false;
    };
  }, [accessToken, userId]);

  return access;
}
