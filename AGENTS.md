# Project

Chrome-расширение (Manifest V3) для сайта [naruto-clan.net](https://naruto-clan.net).
Автоматически переключает озвучку на **2x2** в Плеере 2 и пропускает заставку/титры в iframe онлайн-плеера (`online-serial.com`).

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (ES6+)
- `chrome.storage.local` для настроек
- Без сборки, без зависимостей, без TypeScript, без тестов
- Иконки: PNG 16/32/48/128

## Структура

```
manifest.json        — манифест расширения, хост-пермишены, контент-скрипты
background.js        — service worker: бейдж ON/OFF (оранжевый/серый), реактив на storage
content/site.js      — naruto-clan.net: cookie voice=2, вкладка #tab2, параметр translation=1 в iframe
content/player.js    — online-serial.com (все фреймы): кликает пункт 2x2 в дропдауне озвучки
content/skip-main.js — online-serial.com (world: MAIN): кликает skip intro / skip credits
content/auto-next-main.js — online-serial.com (world: MAIN): автопереход на следующую серию
popup/popup.html     — UI попапа
popup/popup.js       — логика попапа
popup/popup.css      — стили попапа
icons/               — PNG-иконки 16/32/48/128
```

## Как работает

1. `content/site.js` (naruto-clan.net) ставит cookie `voice=2`, активирует вкладку `#tab2`, в iframe `online-serial.com` добавляет `?translation=1`.
2. `content/player.js` внутри iframe кликает пункт **2x2** (`button.select__drop-item`, запасной `data-id="t1"`), если озвучка ещё не выбрана.
3. `content/skip-main.js` (в MAIN world, чтобы видеть DOM iframe):
   - пропуск заставки: `button.allplay__skip--intro`
   - пропуск титров: `button.allplay__skip--credits` или `button.allplay__skip--ending`
4. `content/auto-next-main.js` (MAIN world): по событию `ended` на `<video id="player">`
   (только если `duration > 300` — отсекает рекламу) ставит `window.autoplayNext = 1`
   и кликает следующую серию `[data-select^="episodeType"] .select__drop-item[data-id="N+1"]`.
   Плеер allplay переключает серию без перезагрузки iframe и сам добавляет `autoplay=1`
   в запрос файла. Страховочный `media.play()` с ретраями. Текущая серия публикуется
   в `document.documentElement.dataset.n2x2Season/n2x2Episode` для `player.js`.
   `player.js` при смене серии отправляет `chrome.runtime.sendMessage({ type: 'episodeChanged', season, episode })`.
   `content/site.js` принимает сообщение и через `history.replaceState` синхронизирует URL,
   `document.title`, `<h1>`, хлебные крошки и ссылки «Предыдущая/Следующая серия» на
   родительской странице — чтобы F5 оставил на актуальной серии.
   Встроенный флаг сервера `userParam.autoPlayChange` через URL не ставится (проверено),
   поэтому переход реализуется кликом по скрытому селектору серий.

## Переключатели попапа (все по умолчанию включены)

- **Вкл/Выкл** — общий тумблер. Бейдж: `ON` / `OFF`.
- **Озвучка 2x2** — отдельный тогл. Состояние сохраняется, даже когда расширение выключено.
- **Пропустить заставку**
- **Пропустить титры**
- **Следующая серия автоматически**

## Ключи в chrome.storage.local

- `extensionOn` (boolean)
- `enabled` (boolean) — автовыбор озвучки 2x2
- `skipIntro` (boolean)
- `skipCredits` (boolean)
- `autoNext` (boolean) — автопереход на следующую серию
- `lastSeason`, `lastEpisode` — последняя просмотренная серия

## Хост-пермишены

- `*://naruto-clan.net/*`, `*://*.naruto-clan.net/*`
- `*://online-serial.com/*`, `*://*.online-serial.com/*`

## Commands

- **Загрузка в Chrome**: `chrome://extensions` → Developer mode → Load unpacked → выбрать папку проекта.
- **Тестов**: нет. Проверка ручная (см. README.md).
- **Сборки**: нет. Изменения применяются сразу после перезагрузки расширения.

## Conventions

- Язык кода и комментариев: русский (в UI), английский (в коде/селекторах).
- Стиль: vanilla JS, async/await для `chrome.*` API, без фреймворков.
- Логирование: `console.log('[2x2-voice:site] ...')`, `[2x2-voice:player]`, `[2x2-voice:skip]`, `[2x2-voice:auto-next]`.

## Important Notes (ВАЖНО ДЛЯ ИИ-АГЕНТОВ)

- **Хрупкие селекторы**: все селекторы привязаны к DOM сторонних сайтов. Если naruto-clan.net или online-serial.com поменяют вёрстку — всё сломается. Перед правками обязательно сверяйся с актуальными селекторами.
- **Два сайта**: расширение работает сразу на двух доменах, контент-скрипты разделены по `matches`. Не смешивай логику.
- **iframe**: Плеер 2 — это iframe с `online-serial.com`. Контент-скрипты для него регистрируются с `all_frames: true`. `skip-main.js` и `auto-next-main.js` дополнительно требуют `world: "MAIN"` (доступ к глобальным переменным плеера: `player`, `fileList`, `autoplayNext`).
- **Никакой сборки**: любой change — это правка исходного файла. Перезагрузка расширения в `chrome://extensions` обязательна.
- **Версионирование**: при изменениях обновляй `version` в `manifest.json` (SemVer).
- **Тестировать только вручную**: открыть серию на naruto-clan.net → вкладка Плеер 2 → проверить, что 2x2 выбран, заставка пропущена, «следующая серия» тоже работает, а по окончании серии автоматически включается следующая и URL страницы меняется (например, `/season-1/episode-45` → `/season-1/episode-46`), чтобы F5 оставлял на новой серии.
- **Не добавляй зависимости и сборку**: расширение сознательно минимальное.
