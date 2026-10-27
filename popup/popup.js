document.getElementById('version').textContent = chrome.runtime.getManifest().version;

const extensionBtn = document.getElementById('toggle-extension');
const voiceBtn = document.getElementById('toggle-voice');
const skipBtn = document.getElementById('toggle-skip');
const skipCreditsBtn = document.getElementById('toggle-skip-credits');

const defaults = { extensionOn: true, enabled: true, skipIntro: true, skipCredits: true, lastSeason: null, lastEpisode: null };

function paintSwitch(button, on) {
  button.classList.toggle('is-on', on);
  button.setAttribute('aria-checked', on ? 'true' : 'false');
}

function paint(data) {
  const extensionOn = data.extensionOn !== false;

  extensionBtn.classList.toggle('is-on', extensionOn);
  extensionBtn.textContent = extensionOn ? 'Вкл' : 'Выкл';
  extensionBtn.setAttribute('aria-pressed', extensionOn ? 'true' : 'false');

  paintSwitch(voiceBtn, data.enabled !== false);
  paintSwitch(skipBtn, data.skipIntro !== false);
  paintSwitch(skipCreditsBtn, data.skipCredits !== false);
  document.body.classList.toggle('extension-off', !extensionOn);

  const season = data.lastSeason;
  const episode = data.lastEpisode;
  document.getElementById('last-episode').textContent =
    Number.isInteger(season) && Number.isInteger(episode)
      ? `Сезон ${season} / Серия ${episode}`
      : 'Сезон — / Серия —';
}

async function read() {
  return chrome.storage.local.get(defaults);
}

extensionBtn.addEventListener('click', async () => {
  const data = await read();
  await chrome.storage.local.set({ extensionOn: data.extensionOn === false });
});

voiceBtn.addEventListener('click', async () => {
  const data = await read();
  await chrome.storage.local.set({ enabled: data.enabled === false });
});

skipBtn.addEventListener('click', async () => {
  const data = await read();
  await chrome.storage.local.set({ skipIntro: data.skipIntro === false });
});

skipCreditsBtn.addEventListener('click', async () => {
  const data = await read();
  await chrome.storage.local.set({ skipCredits: data.skipCredits === false });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (!changes.extensionOn && !changes.enabled && !changes.skipIntro && !changes.skipCredits && !changes.lastSeason && !changes.lastEpisode) return;
  read().then(paint);
});

read().then(paint);
