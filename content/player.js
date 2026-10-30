// DEFAULTS chrome.storage.local — синхронизировать в site.js, player.js, popup.js, background.js
(() => {
  // Alloha / online-serial.com: [data-select^="translationType"] → button.select__drop-item
  // 2x2 = data-id="t1" (id_translation=1); default often «Дублированный» (t66)
  const TARGET = /^(?:2x2|2х2)$/i;
  let DEBUG = false;
  const LOG = (...args) => { if (DEBUG) console.debug('[2x2-voice:player]', ...args); };
  const RETRY_MS = 350;
  const RETRY_FOR_MS = 20000;

  let enabled = true;
  let startedAt = 0;
  let settled = false;
  let interval = null;
  let obs = null;
  // Пользователь вручную выбрал другую озвучку — не перебиваем его выбор
  let manualVoiceOverride = false;

  function textOf(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function translationRoot() {
    return (
      document.querySelector('.select[data-select^="translationType"]') ||
      document.querySelector('[data-select*="translation"]')
    );
  }

  function currentLabel(root) {
    const label = root?.querySelector('.select__item-text');
    return label ? textOf(label) : '';
  }

  function find2x2Button(root) {
    if (!root) return null;
    const items = [...root.querySelectorAll('button.select__drop-item')];
    return (
      items.find((btn) => TARGET.test(textOf(btn))) ||
      items.find((btn) => btn.getAttribute('data-id') === 't1') ||
      null
    );
  }

  function is2x2Active(root) {
    const label = currentLabel(root);
    if (TARGET.test(label)) return true;
    const btn = find2x2Button(root);
    return !!(btn && btn.classList.contains('active'));
  }

  // Отличаем ручной выбор пользователя от наших собственных кликов (isTrusted)
  function setupManualOverrideListener() {
    const root = translationRoot();
    if (!root) return;
    if (root.dataset.n2x2OverrideBound === '1') return;
    root.dataset.n2x2OverrideBound = '1';

    root.addEventListener(
      'click',
      (e) => {
        if (!e.isTrusted) return; // наши клики игнорируем
        const item = e.target.closest('button.select__drop-item');
        if (!item || !root.contains(item)) return;
        if (TARGET.test(textOf(item)) || item.getAttribute('data-id') === 't1') {
          manualVoiceOverride = false;
        } else {
          manualVoiceOverride = true;
          LOG('manual voice override:', textOf(item));
        }
      },
      true
    );
  }

  function select2x2() {
    if (!enabled) return false;
    if (manualVoiceOverride) return false;

    const root = translationRoot();
    if (!root) {
      LOG('no translation select yet', location.host);
      return false;
    }

    if (is2x2Active(root)) {
      LOG('already 2x2:', currentLabel(root));
      return true;
    }

    const btn = find2x2Button(root);
    if (!btn) {
      LOG('2x2 option missing; options=', [...root.querySelectorAll('.select__drop-item')].map(textOf));
      return false;
    }

    btn.click();
    LOG('clicked 2x2', btn.getAttribute('data-id'), textOf(btn));
    return true;
  }

  function tick() {
    if (!enabled) return false;
    setupManualOverrideListener();
    if (select2x2()) {
      if (Date.now() - startedAt > 1500) settled = true;
      return true;
    }
    return false;
  }

  function stop() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    obs?.disconnect();
    obs = null;
    settled = true;
    LOG('stopped');
  }

  function start() {
    stop();
    enabled = true;
    startedAt = Date.now();
    settled = false;
    LOG('start', location.href.slice(0, 160));
    tick();

    interval = setInterval(() => {
      if (!enabled || Date.now() - startedAt > RETRY_FOR_MS) {
        clearInterval(interval);
        interval = null;
        return;
      }
      if (!settled) tick();
      else if (!is2x2Active(translationRoot())) {
        settled = false;
        startedAt = Date.now();
        tick();
      }
    }, RETRY_MS);

    obs = new MutationObserver(() => {
      if (!enabled) return;
      const root = translationRoot();
      if (!root) return;
      if (!is2x2Active(root)) {
        settled = false;
        startedAt = Date.now();
        tick();
      }
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  function apply(data) {
    DEBUG = data.debug === true;
    const on = voiceWanted(data);
    if (on) start();
    else {
      enabled = false;
      stop();
    }
  }

  function voiceWanted(data) {
    return data.extensionOn !== false && data.enabled !== false;
  }

  function publishSkip(data) {
    const on = data.extensionOn !== false && data.skipIntro !== false;
    document.documentElement.dataset.n2x2Skip = on ? '1' : '0';
  }

  function publishSkipCredits(data) {
    const on = data.extensionOn !== false && data.skipCredits !== false;
    document.documentElement.dataset.n2x2SkipCredits = on ? '1' : '0';
  }

  function publishAutoNext(data) {
    const on = data.extensionOn !== false && data.autoNext !== false;
    document.documentElement.dataset.n2x2AutoNext = on ? '1' : '0';
  }

  const defaults = { extensionOn: true, enabled: true, skipIntro: true, skipCredits: true, autoNext: true, debug: false };

  let rememberedEpisode = '';

  function rememberPlaying() {
    // auto-next-main.js (MAIN world) публикует фактическую серию в dataset —
    // URL iframe не меняется при автопереходе внутри плеера
    const root = document.documentElement.dataset;
    let season = Number(root.n2x2Season);
    let episode = Number(root.n2x2Episode);
    if (!Number.isInteger(episode) || episode < 1) {
      season = Number(new URL(location.href).searchParams.get('season'));
      episode = Number(new URL(location.href).searchParams.get('episode'));
    }
    if (!Number.isInteger(season) || !Number.isInteger(episode) || season < 1 || episode < 1) return;
    const key = `${season}:${episode}`;
    if (key === rememberedEpisode) return;
    rememberedEpisode = key;
    chrome.runtime.sendMessage({ type: 'episodeChanged', season, episode }).catch(() => {});
    chrome.storage.local.set({ lastSeason: season, lastEpisode: episode });
  }

  rememberPlaying();
  setInterval(rememberPlaying, 1000);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (
      area !== 'local' ||
      (!changes.extensionOn && !changes.enabled && !changes.skipIntro && !changes.skipCredits && !changes.autoNext && !changes.debug)
    ) {
      return;
    }
    // Переключение тогла «Озвучка 2x2» возвращает управление расширению
    if (changes.enabled) manualVoiceOverride = false;
    if (changes.debug) DEBUG = changes.debug.newValue === true;
    chrome.storage.local.get(defaults).then((data) => {
      apply(data);
      publishSkip(data);
      publishSkipCredits(data);
      publishAutoNext(data);
    });
  });

  chrome.storage.local.get(defaults).then((data) => {
    apply(data);
    publishSkip(data);
    publishSkipCredits(data);
    publishAutoNext(data);
  });
})();
