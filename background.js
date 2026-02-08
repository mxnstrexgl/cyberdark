// background.js - Service Worker for Cyberdark Extension
// Handles dynamic icon generation based on user colors
// Provides fast enabled-state cache for content scripts

// === In-Memory Caches ===
// Content scripts query these for ~0ms lookup (vs 20-100ms storage)
let enabledStateCache = null;
let blacklistCache = [];

// Problematic sites that should not have dark mode applied
const PROBLEMATIC_SITES = [
    'docs.google.com',
    'sheets.google.com',
    'slides.google.com',
    'figma.com',
    'chrome.google.com'
];

// Helper: Check if hostname matches a pattern (exact or subdomain)
function hostMatches(hostname, pattern) {
    if (!hostname || !pattern) return false;
    const h = String(hostname).toLowerCase();
    const p = String(pattern).toLowerCase();
    return h === p || h.endsWith('.' + p);
}

// Helper: Check if hostname is blacklisted
function isBlacklisted(hostname) {
    const allBlacklisted = [...blacklistCache, ...PROBLEMATIC_SITES];
    return allBlacklisted.some(pattern => hostMatches(hostname, pattern));
}

// Initialize caches on startup
chrome.storage.sync.get(['cyberdarkEnabled', 'cyberdarkSettings'], (result) => {
    enabledStateCache = result.cyberdarkEnabled === true;
    blacklistCache = result.cyberdarkSettings?.blacklist || [];
    console.log('[Cyberdark] Caches initialized:', {
        enabled: enabledStateCache,
        blacklistCount: blacklistCache.length
    });
});

// Keep caches synchronized with storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
        if ('cyberdarkEnabled' in changes) {
            enabledStateCache = changes.cyberdarkEnabled.newValue === true;
            console.log('[Cyberdark] Enabled state cache updated:', enabledStateCache);
        }
        if ('cyberdarkSettings' in changes) {
            blacklistCache = changes.cyberdarkSettings.newValue?.blacklist || [];
            console.log('[Cyberdark] Blacklist cache updated:', blacklistCache.length, 'entries');
        }
    }
});

// Fast-path query handler for content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'getEnabledState') {
        const hostname = request.hostname || '';
        const blacklisted = hostname ? isBlacklisted(hostname) : false;
        sendResponse({
            enabled: enabledStateCache,
            blacklisted: blacklisted
        });
        return true; // Keep channel open for async response
    }
});

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
