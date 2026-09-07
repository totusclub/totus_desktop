import React from 'react';
import { Icon } from '../../icons';
import './auth.css';

// Каркас экранов входа (Figma «Desktop / Login»): слева фото-панель с градиентом и слоганом,
// справа карточка формы 400.
export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="auth">
    <div className="auth__panel" aria-hidden="true">
      <div className="auth__panel-logo">
        <Icon name="bird" size={56} color="#FFFFFF" />
      </div>
      <div className="auth__panel-text">
        <div className="auth__panel-title">Лучшие туры в один клик</div>
        <div className="auth__panel-sub">Поиск, бронирование и оплата туров в одном приложении</div>
      </div>
    </div>
    <div className="auth__side">
      <div className="auth__card">{children}</div>
    </div>
  </div>
);

export default AuthLayout;
