// background.js - Service Worker for Cyberdark Extension
// Handles dynamic icon generation based on user colors

function updateIconWithColors(settings = {}) {
    const width = 128;
    const height = 128;
    let canvas, ctx;

    if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(width, height);
        ctx = canvas.getContext('2d');
    } else {
        console.warn('[Cyberdark] OffscreenCanvas not supported');
        setFallbackIcon();
        return;
    }

    ctx.fillStyle = settings.color1 || '#181828';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = settings.color2 || '#00ffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, width - 8, height - 8);

    try {
        const imageData = ctx.getImageData(0, 0, width, height);
        chrome.action.setIcon({ imageData });
    } catch (e) {
        console.warn('[Cyberdark] setIcon error', e);
        setFallbackIcon();
    }
}

function setFallbackIcon() {
    try {
        chrome.action.setIcon({
            path: {
                48: 'icons/icon48.png',
                128: 'icons/icon128.png'
            }
        });
    } catch (_) {}
}

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log(`[Cyberdark] Extension ${details.reason}`, details);

    if (details.reason === 'install') {
        await chrome.storage.sync.set({ cyberdarkEnabled: false });
        console.log('[Cyberdark] Installed - disabled by default');
    }

    const result = await chrome.storage.sync.get(['cyberdarkSettings']);
    updateIconWithColors(result.cyberdarkSettings);
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.cyberdarkSettings) {
        updateIconWithColors(changes.cyberdarkSettings.newValue);
    }
});

chrome.storage.sync.get(['cyberdarkSettings'], (result) => {
    updateIconWithColors(result.cyberdarkSettings);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { updateIconWithColors };
}
