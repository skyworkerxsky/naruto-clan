const extensionBtn = document.getElementById('toggle-extension');
const voiceBtn = document.getElementById('toggle-voice');

const defaults = { extensionOn: true, enabled: true };

function paint(data) {
  const extensionOn = data.extensionOn !== false;
  const voiceOn = data.enabled !== false;

  extensionBtn.classList.toggle('is-on', extensionOn);
  extensionBtn.textContent = extensionOn ? 'Вкл' : 'Выкл';
  extensionBtn.setAttribute('aria-pressed', extensionOn ? 'true' : 'false');

  voiceBtn.classList.toggle('is-on', voiceOn);
  voiceBtn.setAttribute('aria-checked', voiceOn ? 'true' : 'false');
  document.body.classList.toggle('extension-off', !extensionOn);
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

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (!changes.extensionOn && !changes.enabled) return;
  read().then(paint);
});

read().then(paint);
