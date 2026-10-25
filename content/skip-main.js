(() => {
  function enabled() {
    return document.documentElement.dataset.n2x2Skip === '1';
  }

  function skipButton() {
    const nodes = document.querySelectorAll('.allplay__skip--intro, button');
    for (const el of nodes) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const match = el.classList.contains('allplay__skip--intro') || /^пропустить заставку$/i.test(text);
      if (!match || el.hidden) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return el;
    }
    return null;
  }

  setInterval(() => {
    if (!enabled()) return;
    skipButton()?.click();
  }, 400);
})();
