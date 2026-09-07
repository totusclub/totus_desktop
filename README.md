# Totus Club — Desktop (Electron, Windows / macOS)

Desktop-версия приложения Totus Club. Экраны и логика — те же, что в мобильном приложении
`totus_APP`, интерфейс — по макетам Figma «DESKTOP UI · Light / Dark» (файл `u6A5og35jw0BBJyOkKl8Ij`).
AI-ассистент Мила — тот же виджет `@tosmedia/ai-assistant`, что на сайте totus.club.

## Стек

- Electron 33 (main + preload на TypeScript, `contextIsolation`), electron-builder (dmg / zip / nsis)
- Renderer: React 19 + TypeScript + Vite 6, react-router (HashRouter), Redux Toolkit + redux-persist,
  axios, socket.io-client (VoIP), `@tosmedia/ai-assistant` (React-виджет Милы)
- Шрифт Golos Text (Google Fonts), тема Light / Dark / System

## Запуск

Требования: Node.js 20+, npm 10+, доступ к репозиторию `tosmedia/totus_ai_v2` (git-зависимость виджета Милы —
как на сайте: `github:tosmedia/totus_ai_v2#pkg/ai-assistant`).

```bash
npm install
npm run dev          # Vite (5173) + Electron с hot reload
npm run typecheck    # tsc для renderer и electron
npm test             # vitest
npm run build        # dist/ (renderer) + dist-electron/ (main)
npm run dist:mac     # release/*.dmg, *.zip  (на macOS)
npm run dist:win     # release/*.exe (nsis)   (на Windows)
```

Иконки приложения для сборки положить в `build/icon.icns` (macOS) и `build/icon.ico` (Windows).

## Структура

```
electron/            main.ts (окно 1440×900, title bar, IPC), preload.ts, captcha.ts (+captchaPreload.ts)
src/shared/          КОПИЯ слоя логики totus_APP без RN-зависимостей:
                     types/, utils/ (aiRoomPick, ordersUtils, booking/…), modules/api (levelTravelApi,
                     auth, favorites, users), modules/store (Redux: auth, search, destinations, departures),
                     modules/hooks (useHotelRooms, useBooking, useOrders, …), config/server.ts
src/renderer/
  app/               App.tsx (роуты = экраны totus_APP), navigation.ts (useAppNavigation с именами RN-экранов)
  shell/             TitleBar, RailSidebar (рейл 88 pt: иконки + подписи), PageHeader, AppShell
  theme/             tokens.css (токены light/dark 1:1 с src/theme приложения), global.css, ThemeContext
  ai/                AiRoot (AiAssistantProvider), AiScreen (страница Totus AI), AiFloatingWidget (кнопка Милы
                     на остальных экранах), useAiLinkInterceptor (карточки → экран отеля), ai.css (Dark Mode)
  screens/           home, search, hotel, tickets, booking, checkout, orders, favorites, account, auth, onboarding
  components/        HotelCard, DatePicker, RangeSlider, Popover, Modal, SmartCaptcha (webview)
  voip/              VoipClient (WebRTC + socket.io к voip.totus.club), CallDialog — только звонок в поддержку
  icons/             SVG-иконки приложения (currentColor)
```

## Как обеспечена согласованность с App / Web

- **API и состояние**: `src/shared` — дословная копия `types/`, `utils/`, `modules/api`, `modules/store`,
  `modules/hooks` из totus_APP (заменены только AsyncStorage → localStorage, Crashlytics и RN-навигация).
  Все эндпоинты (`/start-search`, `/grouped-hotels`, `/hotels-rooms`, `/packages/*`, `/create-package`,
  `/vtb/create-order`, `/check_pay`, `/api/favorites`, `/api/users/by-id/:id`, `/api/auth/*`,
  `/customer-auth/refresh-token`) и порядок шагов бронирования/оплаты — как в приложении.
- **Мила**: `@tosmedia/ai-assistant` (тот же пакет, что `GlobalAiChat` на сайте) с теми же параметрами
  (`apiBase https://apiv2.totus.club/api`, `wss://apiv2.totus.club/ws/assistant`, `historyMode auto`, JWT в
  `getAccessToken`) — общий WebSocket-протокол (`chat / reset / restore` → `typing / token / tours / rooms /
  destinations / booking / tool / done / error`), история чатов в MySQL по JWT, карточки туров/номеров.
  Ссылки из карточек перехватываются и открывают экран отеля внутри приложения с теми же параметрами, что
  `hotelFromAi` + `aiRoomPick` в мобильном приложении (`src/shared/utils/aiAssistantOpenHotel.ts`).
  Персональные данные пользователя в ассистента не передаются (только текст сообщений и JWT).
  Гейт как в приложении: Totus AI доступен авторизованным с `access === 0`.
- **Тема**: токены `src/theme/light.ts` / `dark.ts` приложения повторены в `tokens.css`; виджет Милы (Tailwind v4)
  перекрашен через CSS-переменные в `ai/ai.css`.

## Известные ограничения / что проверить при первой сборке

- Проект собран без запуска `npm install` в среде разработки (нет доступа к npm-реестру), поэтому первую
  сборку нужно прогнать локально: `npm install && npm run typecheck && npm test && npm run dev`. Возможны
  мелкие типовые правки (несовпадение типов между экранами и `src/shared`).
- SmartCaptcha на входе рендерится в `<webview>` c origin `https://totus.club` (перехват одного URL в отдельной
  сессии, `electron/captcha.ts`) — проверить, что домен разрешён в консоли Yandex Cloud для этого sitekey.
- VoIP-звонок в поддержку портирован на браузерный WebRTC (`src/renderer/voip/VoipClient.ts`); desktop
  регистрируется в calling_api_v2 как web-клиент (`voipToken: 'web', platform: 'web'`, как панель агента).
  Звонок доходит до поддержки только если агент онлайн в панели calling_v2 (сокет); иначе сервер отвечает
  ошибкой доставки и показывается «Поддержка сейчас не в сети». Кнопка «Позвонить по телефону» работает всегда.
- Голосовой ввод в чате не реализован (в веб-виджете его нет; в Electron нет Web Speech API без ключей).
- Автообновление, системные меню Electron, подпись/нотаризация — вне этого этапа.
