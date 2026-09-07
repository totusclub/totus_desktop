import React from 'react';

/** Title bar 38 pt: область перетаскивания окна. macOS — «светофор» рисует система (hiddenInset),
 *  Windows — кнопки окна рисует titleBarOverlay. Мы только держим высоту и цвет фона. */
export const TitleBar: React.FC<{ title?: string }> = ({ title }) => (
  <div className="title-bar">
    <span className="title-bar__title">{title ?? ''}</span>
  </div>
);
