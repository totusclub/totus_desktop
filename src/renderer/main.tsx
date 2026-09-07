import { createRoot } from 'react-dom/client';
import './theme/global.css';
import { App } from './app/App';

// Без React.StrictMode: логика totus_APP (useHotelRooms, автозапуск поиска на странице отеля
// через debounce-таймер с очисткой при unmount) не рассчитана на двойной запуск эффектов
// в dev-режиме — из-за этого номера отеля «грузились бесконечно» в `npm run dev`.
createRoot(document.getElementById('root') as HTMLElement).render(<App />);
