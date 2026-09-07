import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TitleBar } from './TitleBar';
import { RailSidebar } from './RailSidebar';
import { AiFloatingWidget } from '../ai/AiFloatingWidget';
import { VoipManager } from '../voip/VoipManager';

// Окно: title bar + рейл + контент (Figma «Desktop / *»). Онбординг — без рейла.
const NO_RAIL = new Set(['/onboarding']);

export const AppShell: React.FC = () => {
  const { pathname } = useLocation();
  const noRail = NO_RAIL.has(pathname);
  return (
    <div className={'window' + (noRail ? ' window--no-rail' : '')}>
      <TitleBar />
      {noRail ? null : <RailSidebar />}
      <main className="content" id="content-scroll">
        <Outlet />
      </main>
      {/* Плавающий виджет Милы на всех экранах, кроме страницы AI — как GlobalAiChat на сайте */}
      {noRail || pathname === '/ai' ? null : <AiFloatingWidget />}
      {/* Звонки (исходящий в поддержку / входящий от поддержки) — окно поверх любого экрана */}
      <VoipManager />
    </div>
  );
};
