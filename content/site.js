(() => {
  // Parent page: keep «Плеер 2» + force iframe translation=1 (2x2 on Alloha/online-serial)
  const TRANSLATION_ID = '1';
  const TAB2_SELECTORS = ['a[href="#tab2"]', '#ui-id-2', '.ui-tabs-nav a[data-voice="2"]'];
  const LOG = (...args) => console.debug('[2x2-voice:site]', ...args);

  let extensionOn = true;
  let enabled = true;
  let settingsReady = false;
  let observer = null;
  const timers = [];

  function ensureVoiceCookie() {
    if (!/(?:^|;\s*)voice=2(?:;|$)/.test(document.cookie)) {
      document.cookie = `voice=2; path=/; max-age=${60 * 60 * 24 * 365}`;
      LOG('set cookie voice=2');
    }
  }

  function isPlayer2Active() {
    if (document.querySelector('.ui-tabs-active a[href="#tab2"], .ui-tabs-active a[data-voice="2"]')) {
      return true;
    }
    const panel = document.querySelector('#tab2');
    if (!panel) return false;
    return getComputedStyle(panel).display !== 'none' && panel.getAttribute('aria-hidden') !== 'true';
  }

  function activatePlayer2() {
    ensureVoiceCookie();
    if (isPlayer2Active()) return;

    for (const sel of TAB2_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) {
        el.click();
        LOG('activate tab2 via', sel);
        return;
      }
    }

    const byText = [...document.querySelectorAll('.ui-tabs-nav a, .tabs a')].find((a) =>
      /плеер\s*2/i.test((a.textContent || '').trim())
    );
    if (byText) {
      byText.click();
      LOG('activate tab2 by text');
    }
  }

  function rewritePlayerUrl(url) {
    try {
      const u = new URL(url, location.href);
      if (!/online-serial\.com$/i.test(u.hostname) && !u.hostname.endsWith('.online-serial.com')) {
        return null;
      }
      let changed = false;
      const translation = u.searchParams.get('translation');
      if (voiceOn()) {
        if (translation !== TRANSLATION_ID) {
          u.searchParams.set('translation', TRANSLATION_ID);
          changed = true;
        }
      } else if (translation != null) {
        u.searchParams.delete('translation');
        changed = true;
      }

      if (u.searchParams.has('autoplay')) {
        u.searchParams.delete('autoplay');
        changed = true;
      }
      return changed ? u.toString() : null;
    } catch {
      return null;
    }
  }

  function playerFrames() {
    return document.querySelectorAll(
      '#tab2 iframe, .tab_pane iframe, iframe[title*="Плеер 2"], iframe[src*="online-serial.com"], iframe[data-lzl-src*="online-serial.com"]'
    );
  }

  function patchPlayer2Iframes() {
    let patched = 0;

    for (const iframe of playerFrames()) {
      const src = iframe.getAttribute('src') || '';
      const dataSrc = iframe.getAttribute('data-lzl-src') || '';

      for (const [attr, value] of [
        ['src', src],
        ['data-lzl-src', dataSrc],
      ]) {
        if (!value || value.startsWith('data:') || value === 'about:blank') continue;
        const next = rewritePlayerUrl(value);
        if (next && next !== value) {
          iframe.setAttribute(attr, next);
          patched++;
          LOG(voiceOn() ? 'patched' : 'reverted', attr, next.slice(0, 140));
        }
      }

      if (!voiceOn()) continue;

      const live = iframe.getAttribute('src') || '';
      const lazy = iframe.getAttribute('data-lzl-src') || '';
      if (lazy.includes('online-serial.com') && (!live || live.startsWith('data:') || live === 'about:blank')) {
        iframe.setAttribute('src', lazy);
        patched++;
        LOG('forced lazy src');
      }
    }

    return patched;
  }

  function voiceOn() {
    return extensionOn && enabled;
  }

  function rememberPage() {
    const match = location.pathname.match(/\/season-(\d+)\/episode-(\d+)/i);
    if (!match) return;
    chrome.storage.local.set({
      lastSeason: Number(match[1]),
      lastEpisode: Number(match[2]),
    });
  }

  function run() {
    if (!voiceOn()) {
      patchPlayer2Iframes();
      return;
    }
    activatePlayer2();
    patchPlayer2Iframes();
  }

  function clearTimers() {
    while (timers.length) clearTimeout(timers.pop());
  }

  function disarmWatchOnly() {
    clearTimers();
    observer?.disconnect();
    observer = null;
  }

  function arm() {
    disarmWatchOnly();
    run();
    timers.push(setTimeout(run, 300), setTimeout(run, 1000), setTimeout(run, 2500));

    const root = document.querySelector('.tabss, .videos, #page, #page_inc') || document.body;
    observer = new MutationObserver(() => {
      if (voiceOn()) activatePlayer2();
      patchPlayer2Iframes();
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'data-lzl-src', 'class', 'style', 'aria-hidden'],
    });
  }

  function apply(data) {
    extensionOn = data.extensionOn !== false;
    enabled = data.enabled !== false;
    settingsReady = true;
    rememberPage();
    arm();
  }

  const defaults = { extensionOn: true, enabled: true };

  chrome.storage.local.get(defaults).then(apply);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.extensionOn && !changes.enabled)) return;
    chrome.storage.local.get(defaults).then(apply);
  });

  window.addEventListener('pageshow', () => {
    if (settingsReady) run();
  });
})();
