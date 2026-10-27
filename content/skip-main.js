(() => {
  function introEnabled() {
    return document.documentElement.dataset.n2x2Skip === '1';
  }

  function creditsEnabled() {
    return document.documentElement.dataset.n2x2SkipCredits === '1';
  }

  function findButton(selector, textRegex) {
    const nodes = document.querySelectorAll(`${selector}, button`);
    for (const el of nodes) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const match = el.matches(selector) || textRegex.test(text);
      if (!match || el.hidden) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return el;
    }
    return null;
  }

  function introButton() {
    return findButton('.allplay__skip--intro', /^пропустить заставку$/i);
  }

  function creditsButton() {
    return findButton('.allplay__skip--credits, .allplay__skip--ending', /^пропустить титры$/i);
  }

  setInterval(() => {
    if (introEnabled()) introButton()?.click();
    if (creditsEnabled()) creditsButton()?.click();
  }, 400);
})();
