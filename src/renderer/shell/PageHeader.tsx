import React from 'react';
import { Icon } from '../icons';
import { useAppNavigation } from '../app/navigation';

type Props = { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode; onBack?: () => void };

/** Заголовок страницы (Figma): кнопка «назад» 40×40, title 24/600, подзаголовок 14. */
export const PageHeader: React.FC<Props> = ({ title, subtitle, back, right, onBack }) => {
  const nav = useAppNavigation();
  return (
    <header className="page-header">
      <div className="page-header__left">
        {back ? (
          <button type="button" className="page-header__back" onClick={onBack ?? nav.goBack} aria-label="Назад">
            <Icon name="chevronLeft" size={24} />
          </button>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <h1 className="page-header__title">{title}</h1>
          {subtitle ? <div className="page-header__sub">{subtitle}</div> : null}
        </div>
      </div>
      {right ? <div>{right}</div> : null}
    </header>
  );
};
