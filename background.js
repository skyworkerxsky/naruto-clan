const ORANGE = '#ff7a18';
const ASH = '#5c6573';

async function paintBadge(enabled) {
  await chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF' });
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? ORANGE : ASH });
  await chrome.action.setTitle({
    title: enabled
      ? 'Озвучка 2x2 включена'
      : 'Озвучка 2x2 выключена',
  });
}

async function syncBadge() {
  const data = await chrome.storage.local.get({ extensionOn: true });
  await paintBadge(data.extensionOn !== false);
}

chrome.runtime.onInstalled.addListener(syncBadge);
chrome.runtime.onStartup.addListener(syncBadge);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.extensionOn) return;
  paintBadge(changes.extensionOn.newValue !== false);
});

syncBadge();
