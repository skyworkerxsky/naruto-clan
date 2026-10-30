(() => {
  // MAIN world: автопереход на следующую серию в плеере allplay (online-serial.com).
  // Механика плеера: window.autoplayNext = 1 добавляет autoplay=1 в запрос файла
  // следующей серии; клик по скрытой кнопке [data-id="N+1"] в селекторе серий
  // переключает серию без перезагрузки страницы.
  const LOG = (...args) => console.debug('[2x2-voice:auto-next]', ...args);
  const MIN_CONTENT_DURATION = 300; // серии ~20 мин, реклама короче — отсекаем ended у рекламы
  const PLAY_RETRY_MS = 500;
  const PLAY_RETRY_FOR_MS = 20000; // после смены серии может сначала идти реклама

  let advancedFrom = null; // id серии, с которой уже перешли (защита от повтора)

  function autoNextEnabled() {
    return document.documentElement.dataset.n2x2AutoNext === '1';
  }

  function videoEl() {
    return document.getElementById('player');
  }

  function currentEpisode() {
    try {
      // fileList — глобальная лексическая переменная страницы (const)
      if (typeof fileList !== 'undefined' && fileList.active && Number(fileList.active.episode) > 0) {
        return { season: Number(fileList.active.seasons), episode: Number(fileList.active.episode) };
      }
    } catch {}
    const active = document.querySelector('[data-select^="episodeType"] .select__drop-item.active');
    if (active) return { season: null, episode: Number(active.getAttribute('data-id')) };
    return null;
  }

  function episodeButton(id) {
    return document.querySelector(`[data-select^="episodeType"] .select__drop-item[data-id="${id}"]`);
  }

  function ensurePlaying(startedAt) {
    const media = videoEl();
    if (!media) return;
    if (!media.paused || Date.now() - startedAt > PLAY_RETRY_FOR_MS) return;
    const p = media.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    setTimeout(() => ensurePlaying(startedAt), PLAY_RETRY_MS);
  }

  function goToNext() {
    if (!autoNextEnabled()) return;
    const cur = currentEpisode();
    if (!cur || !Number.isInteger(cur.episode)) return;
    if (advancedFrom === cur.episode) return;

    const nextBtn = episodeButton(cur.episode + 1);
    if (!nextBtn) {
      LOG('no next episode after', cur.episode);
      return;
    }

    advancedFrom = cur.episode;
    try {
      window.autoplayNext = 1; // плеер сам добавит autoplay=1 в запрос файла
    } catch {}
    nextBtn.click();
    LOG('switch to episode', cur.episode + 1);
    setTimeout(() => ensurePlaying(Date.now()), PLAY_RETRY_MS);
  }

  function onEnded() {
    const media = videoEl();
    if (!media || !(media.duration > MIN_CONTENT_DURATION)) return; // не конец серии (реклама)
    if (!media.ended) return;
    goToNext();
  }

  function publishEpisode() {
    const cur = currentEpisode();
    if (!cur || !Number.isInteger(cur.episode)) return;
    const root = document.documentElement;
    if (root.dataset.n2x2Season !== String(cur.season ?? '')) {
      root.dataset.n2x2Season = cur.season ?? '';
    }
    if (root.dataset.n2x2Episode !== String(cur.episode)) {
      root.dataset.n2x2Episode = String(cur.episode);
      advancedFrom = null; // серия сменилась — разрешаем следующий автопереход
      LOG('now playing episode', cur.episode);
    }
  }

  function bind() {
    const media = videoEl();
    if (media && !media.dataset.n2x2AutoNextBound) {
      media.dataset.n2x2AutoNextBound = '1';
      media.addEventListener('ended', onEnded);
      LOG('bound ended on video');
    }
    publishEpisode();
  }

  setInterval(bind, 1000);
  bind();
})();
