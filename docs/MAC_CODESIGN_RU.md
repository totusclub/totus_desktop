# Подпись macOS-сборки Totus Club

Сборка: `npm run dist:mac` (перед сборкой прогоняется `npm run check:entitlements`).

## Файлы прав (entitlements)

| Файл | Кому | Зачем |
| --- | --- | --- |
| `build/entitlements.mac.plist` | основной бандл `Totus Club.app` | JIT и исполняемая память для V8, переменные dyld, отключение library validation, микрофон (звонки в поддержку), сетевой клиент |
| `build/entitlements.mac.inherit.plist` | `Totus Club Helper*.app` | то же + `com.apple.security.inherit` — helper-процессы наследуют права родителя |

Eelectron под hardened runtime требует оба набора. Раньше `entitlementsInherit`
указывал на основной файл — helper'ы подписывались без `com.apple.security.inherit`.

Оба файла обязаны быть валидным XML plist в UTF-8 без BOM. Проверка:

```bash
npm run check:entitlements   # plutil -lint обоих файлов
```

## Ошибка `cannot read entitlement data`

```
⨯ Command failed: codesign --sign <ID> --force --timestamp --options runtime \
  --entitlements build/entitlements.mac.plist …/locale.pak
build/entitlements.mac.plist: cannot read entitlement data
```

Это сообщение самого `codesign`: он не смог **прочитать или распарсить** файл прав.
Подпись и сертификат тут ни при чём. Порядок проверки:

```bash
cd /путь/к/totus_desktop          # electron-builder передаёт путь относительно корня проекта:
                                  # сборку запускать только из корня репозитория
ls -l build/                      # 1. файл на месте? права на чтение есть?
plutil -lint build/entitlements.mac.plist build/entitlements.mac.inherit.plist   # 2. валидный plist?
file build/entitlements.mac.plist # 3. должно быть "XML 1.0 document text", не UTF-16 и не data
git status build/                 # 4. локальная копия не расходится с репозиторием?
```

Типичные причины:

1. **Сборка запущена не из корня проекта** (из IDE, из `release/`, через
   `npm --prefix`): путь `build/entitlements.mac.plist` относительный, `codesign`
   ищет файл относительно текущей директории и не находит его.
2. **Файл испорчен локально**: сохранён из TextEdit как rich text, в UTF-16 или
   с BOM, обрезан при копировании. `plutil -lint` покажет это сразу.
3. **Файла нет** в рабочей копии (не сделан `git pull`, файл случайно удалён).
   Восстановить: `git checkout -- build/entitlements.mac.plist`.
4. **Нет прав на чтение** — `chmod 644 build/*.plist`.

Отключать подпись (`identity: null`, `CSC_IDENTITY_AUTO_DISCOVERY=false`) для
обхода этой ошибки нельзя — она не про сертификат.

## Проверка готовой сборки

```bash
codesign -dv --entitlements :- "release/mac-arm64/Totus Club.app"
codesign -dv --entitlements :- "release/mac-arm64/Totus Club.app/Contents/Frameworks/Totus Club Helper.app"
codesign --verify --deep --strict --verbose=2 "release/mac-arm64/Totus Club.app"
spctl -a -vvv -t install "release/mac-arm64/Totus Club.app"   # до нотаризации ожидаемо "rejected"
```

У основного бандла в выводе должны быть `allow-jit`, `allow-unsigned-executable-memory`,
`device.audio-input`; у helper'а — `com.apple.security.inherit`.

## Нотаризация

`notarize: false` в `package.json` — сборка только подписывается. Для нотаризации
нужны Apple ID / app-specific password или API-ключ App Store Connect; включать
отдельно, секреты в репозиторий не класть.
