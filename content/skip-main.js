(() => {
  let DEBUG = false;
  const LOG = (...args) => { if (DEBUG) console.debug('[2x2-voice:skip]', ...args); };

  function introEnabled() {
    return document.documentElement.dataset.n2x2Skip === '1';
  }

  function creditsEnabled() {
    return document.documentElement.dataset.n2x2SkipCredits === '1';
  }

  function visible(el) {
    if (el.hidden) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findBySelector(selector) {
    for (const el of document.querySelectorAll(selector)) {
      if (visible(el)) return el;
    }
    return null;
  }

  function findByText(tag, textRegex) {
    for (const el of document.querySelectorAll(tag)) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!textRegex.test(text) || !visible(el)) continue;
      return el;
    }
    return null;
  }

  function introButton() {
    return findBySelector('.allplay__skip--intro') ?? findByText('button', /^пропустить заставку$/i);
  }

  function creditsButton() {
    return (
      findBySelector('.allplay__skip--credits, .allplay__skip--ending') ??
      findByText('button', /^пропустить титры$/i)
    );
  }

  // Скрипт запускается во всех фреймах online-serial.com — без плеера работать нечему
  setInterval(() => {
    if (!document.querySelector('.allplay, #player, [data-select]')) return;
    if (introEnabled()) introButton()?.click();
    if (creditsEnabled()) creditsButton()?.click();
  }, 400);

  // MAIN world не имеет доступа к chrome.storage — читаем debug только если API доступен
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get({ debug: false }).then(
        (data) => {
          DEBUG = data.debug === true;
        },
        () => {}
      );
    }
  } catch {}
})();
