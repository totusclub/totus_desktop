import React, { useEffect, useState } from 'react';
import { isYandexAuthEnabled, yandexStartUrl } from '@shared/modules/api/yandexAuth';
import { openExternal } from '../lib/desktop';
import './yandex.css';

/**
 * «Войти с Яндекс ID» (макеты: claude/YANDEX_AUTH_DESIGN_RU.md).
 * Вход всегда во внешнем браузере — требование Яндекса и безопаснее окна Electron.
 * Пока раздел выключен на сервере (503) — кнопки нет.
 */
export const YandexIdButton: React.FC<{ label?: string; divider?: boolean }> = ({
  label = 'Войти с Яндекс ID',
  divider = true,
}) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    void isYandexAuthEnabled().then(value => {
      if (alive) setEnabled(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      {divider ? (
        <div className="yandex-divider">
          <span />
          <p>или</p>
          <span />
        </div>
      ) : null}
      <button type="button" className="yandex-btn" onClick={() => openExternal(yandexStartUrl())}>
        <span className="yandex-btn__logo" aria-hidden="true">Я</span>
        <span>{label}</span>
      </button>
    </>
  );
};

export default YandexIdButton;
