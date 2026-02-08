// === EMERGENCY DARK MODE ===
// Prevents flashbang by applying dark background BEFORE async storage loads
// Removed gracefully if extension is disabled or full styles are applied
// Uses pitch-black (#0a0a0a) for maximum eye protection

// === Module-level state flags (declared early for use in emergency removal) ===
// Prevents multiple animation triggers during emergency dark removal
let emergencyRemovalInProgress = false;
// Prevents multiple listener registrations (memory leak prevention)
let storageListenerRegistered = false;
// MutationObserver for dynamic media elements
let mediaObserver = null;

(function injectEmergencyDark() {
  'use strict';

  // Check feature flag (defaults to enabled if config not loaded yet)
  const featureEnabled = typeof CyberdarkConfig === 'undefined' ||
    !CyberdarkConfig.FEATURES ||
    CyberdarkConfig.FEATURES.emergencyDarkMode !== false;

  if (!featureEnabled) return;

  // Skip PDFs - browser handles these differently
  if (window.location.pathname.endsWith('.pdf') ||
      document.contentType === 'application/pdf') {
    return;
  }

  // Inject color-scheme meta tag for browser hint
  const meta = document.createElement('meta');
  meta.name = 'color-scheme';
  meta.content = 'dark only';
  (document.head || document.documentElement).appendChild(meta);

  // Create emergency stylesheet
  const emergency = document.createElement('style');
  emergency.id = 'cyberdark-emergency';
  emergency.textContent = `
    /* Emergency dark - maximum protection */
    html {
      background-color: #0a0a0a !important;
      color-scheme: dark !important;
    }

    /* Overlay to catch any white flashes */
    html::before {
      content: '';
      position: fixed;
      inset: 0;
      background: #0a0a0a;
      z-index: 2147483646;
      pointer-events: none;
    }

    /* Force dark on common white patterns */
    body, main, article, section, div, header, footer, nav, aside {
      background-color: #0a0a0a !important;
    }

    /* Skeleton loaders and loading states */
    [class*="skeleton"], [class*="loading"], [class*="placeholder"],
    [class*="shimmer"], [class*="pulse"] {
      background-color: #1a1a1a !important;
      animation: none !important;
    }

    /* Modal backdrops */
    [class*="modal"], [class*="overlay"], [class*="backdrop"],
    [role="dialog"], [role="alertdialog"] {
      background-color: rgba(0,0,0,0.9) !important;
    }

    /* Cross-origin iframe coverage */
    iframe {
      background-color: #0a0a0a !important;
      border-color: #333 !important;
    }

    /* Canvas/video protection until content loads */
    canvas:not([data-cyberdark-ready]),
    video:not([data-cyberdark-ready]) {
      filter: brightness(0.1);
      transition: filter 0.3s ease;
    }
    canvas[data-cyberdark-ready],
    video[data-cyberdark-ready] {
      filter: none;
    }

    /* Text color for readability during emergency phase */
    html, body {
      color: #e0e0e0 !important;
    }
  `;

  // Inject into documentElement (head doesn't exist yet at document_start)
  (document.head || document.documentElement).appendChild(emergency);
})();

// === Graceful Emergency Removal ===
function removeEmergencyDark(animate = true) {
  const emergency = document.getElementById('cyberdark-emergency');
  if (!emergency) return;

  // Guard against multiple rapid calls during animation
  if (emergencyRemovalInProgress) return;

  // Also remove the color-scheme meta if we're disabling
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"][content="dark only"]');

  if (animate) {
    emergencyRemovalInProgress = true;
    // Fade out overlay smoothly via CSS transition
    emergency.textContent += `
      html::before {
        transition: opacity 0.15s ease-out !important;
        opacity: 0 !important;
      }
    `;
    setTimeout(() => {
      emergency.remove();
      if (colorSchemeMeta) colorSchemeMeta.remove();
      emergencyRemovalInProgress = false;
    }, 150);
  } else {
    emergency.remove();
    if (colorSchemeMeta) colorSchemeMeta.remove();
  }
}

// Import validation utilities
const validate = typeof CyberdarkValidate !== 'undefined' ? CyberdarkValidate : null;

// User settings defaults
// Use global config if available, otherwise fallback (should be available via manifest injection)
const config = typeof CyberdarkConfig !== 'undefined' ? CyberdarkConfig : {
  DEFAULT_SETTINGS: {
    color1: '#00ffff',
    color2: '#00ff00',
    color3: '#ff00ff',
    color4: '#ff0000',
    textShadow: true,
    highContrast: true,
    focusOutline: true,
    reducedMotion: false,
    fontSize: 16,
    lineHeight: 1.5,
    colorBlindMode: false,
    blacklist: [],
    perSiteOverrides: {},
    enabled: true
  },
  isBlacklisted: (d, b) => b.some(x => d.includes(x))
};

const cyberdarkDefaults = config.DEFAULT_SETTINGS;

// Site detection: Check if site already has dark mode
// NOTE: Reserved for future optimization - could skip style injection on sites
// that already have native dark mode, reducing visual disruption.
// Not currently called to ensure consistent behavior across all sites.
// To use: Check `hasNativeDarkMode()` in `loadAndApplyCyberdark()` and skip if true.
function hasNativeDarkMode() {
  // Check for common dark mode classes on body/html
  if (document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')) return true;
  if (document.documentElement.getAttribute('data-theme') === 'dark') return true;

  // Check computed background color of body
  const bg = window.getComputedStyle(document.body).backgroundColor;
  const rgb = bg.match(/\d+/g);
  if (rgb) {
    const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
    if (brightness < 50) return true; // Already dark
  }
  return false;
}

function applyCyberdarkStyles(settings) {
  try {
    // Accessibility & UX: font size, line height, color-blind friendly palette
    const { fontSize, lineHeight, colorBlindMode } = settings;

    let palette = { color1: settings.color1, color2: settings.color2, color3: settings.color3, color4: settings.color4 };

    // Handle legacy boolean
    let mode = colorBlindMode;
    if (mode === true) mode = 'protanopia';

    if (mode && mode !== 'none' && config.COLORBLIND_PALETTES && config.COLORBLIND_PALETTES[mode]) {
      palette = config.COLORBLIND_PALETTES[mode];
    }

    // SECURITY: Sanitize all color values to prevent XSS
    if (validate) {
      palette = validate.sanitizeColorPalette(palette, cyberdarkDefaults);
    }

    const neon1 = palette.color1;
    const neon2 = palette.color2;
    const neon3 = palette.color3;
    const neon4 = palette.color4;

    // Remove old style if present
    const target = document.head || document.documentElement;
    if (!target) return;

    const prev = target.querySelector('style[data-cyberdark="main"]');
    if (prev) prev.remove();
    const style = document.createElement('style');
    style.setAttribute('data-cyberdark', 'main');
    style.setAttribute('aria-label', 'Cyberdark enforced dark mode and accessibility styles');
    style.setAttribute('role', 'presentation');
    // CSS variables from user settings
    style.textContent = `
      :root {
        --dark-bg: #1a1a1a;
        --dark-text: #e0e0e0;
        --link-color: #4db8ff;
      }

      /* Base Dark Mode */
      html, body {
        background-color: var(--dark-bg) !important;
        color: var(--dark-text) !important;
        min-height: 100vh;
        margin: 0;
      }

      /* Natural Flow: Allow transparency where possible.
         We do NOT force background on other elements to avoid breaking layout.
         We only force text color inheritance to ensure visibility.
      */
      main, article, section, aside, nav, header, footer, div, span, p, li, td, th {
        color: inherit;
        /* No background-color override here to preserve sidebars/cards */
      }

      /* Typography */
      h1, h2, h3, h4, h5, h6 {
        color: #fff !important;
      }
      
      /* Links - Standard accessible dark mode link color */
      a, a:visited {
        color: var(--link-color) !important;
        text-decoration: none; /* Optional: keep or remove based on preference, but 'minimal' usually implies standard behavior */
      }
      a:hover {
        text-decoration: underline;
      }

      /* Inputs & Forms - Minimal Dark Styling */
      /* Only override if they don't have their own specific styling, or force a dark theme gently */
      input, textarea, select, button {
        background-color: #2b2b2b !important;
        color: #fff !important;
        border: 1px solid #444 !important;
        border-radius: 4px; /* Standard radius */
        padding: 4px 8px; /* Standard padding */
        box-shadow: none !important; /* No glow */
      }

      /* Focus states - Standard outline */
      input:focus, textarea:focus, select:focus, button:focus {
        outline: 2px solid var(--link-color) !important;
        outline-offset: 2px;
        border-color: var(--link-color) !important;
      }

      /* Buttons - Flat dark style */
      button, input[type="submit"], input[type="button"], .btn {
        background-color: #333 !important;
        cursor: pointer;
      }
      button:hover, input[type="submit"]:hover, input[type="button"]:hover, .btn:hover {
        background-color: #444 !important;
      }
      button[disabled], input[disabled], .disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* Accessibility */
      :focus {
        ${settings.focusOutline ? 'outline: 2px solid var(--link-color) !important; outline-offset: 2px;' : ''}
      }

      /* SVG Fixes - Ensure icons are visible */
      svg text {
        fill: var(--dark-text) !important;
      }
      svg path[fill="#000"], svg path[fill="black"] {
        fill: var(--dark-text) !important;
      }

      /* Scrollbars - Dark */
      ::-webkit-scrollbar {
        width: 12px;
        background: #1a1a1a;
      }
      ::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 6px;
        border: 2px solid #1a1a1a;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #555;
      }

      /* Cyberpunk search bar styling */
      /* SECURITY: Use CSS variables instead of template literals to prevent XSS */
      :root {
        --neon-color-1: ${neon1};
        --neon-color-2: ${neon2};
        --neon-color-3: ${neon3};
        --neon-color-4: ${neon4};
      }
      
      input[type="search"],
      input[type="text"],
      .search-bar,
      .search-input {
        background: linear-gradient(45deg, var(--neon-color-2), var(--neon-color-1), var(--neon-color-3), var(--neon-color-4)) !important;
        background-size: 400% 400% !important;
        animation: cyberdark-gradient 15s ease infinite !important;
        border: none !important;
        padding: 8px 12px !important;
        border-radius: 8px !important;
        color: #000 !important;
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.5) !important;
        transition: all 0.3s ease !important;
      }

      input[type="search"]:hover,
      input[type="text"]:hover,
      .search-bar:hover,
      .search-input:hover {
        box-shadow: 0 0 25px rgba(0, 255, 255, 0.7) !important;
        transform: scale(1.02) !important;
      }

      /* Gradient animation keyframes */
      @keyframes cyberdark-gradient {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }

      /* Reduced Motion */
      ${settings.reducedMotion ? '* { animation: none !important; transition: none !important; }' : ''}
    `;
    // Prevent duplicate main style injection
    if (!target.querySelector('style[data-cyberdark="main"]')) {
      target.appendChild(style);
    }
  } catch (err) {
    if (config.Logger) config.Logger.error('Failed to inject main style', err);
  }
}

// Force dark mode on all iframes with collision detection and robust error handling
function applyCyberdarkIframes() {
  const iframes = document.getElementsByTagName('iframe');
  for (const iframe of iframes) {
    if (!iframe) continue;
    let iframeDoc;
    try {
      iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
    } catch (e) {
      // Cross-origin, cannot access
      // config.Logger.debug('Cross-origin iframe, skipping');
      continue;
    }
    if (!iframeDoc || !iframeDoc.head) continue;
    // Only inject if not already injected
    if (!iframeDoc.head.querySelector('style[data-cyberdark="iframe"]')) {
      try {
        const iframeStyle = iframeDoc.createElement('style');
        iframeStyle.setAttribute('data-cyberdark', 'iframe');
        // Use minimal selector for iframes too
        iframeStyle.textContent = `
          html, body { background-color: #1a1a1a !important; color: #e0e0e0 !important; }
          a { color: #4db8ff !important; }
        `;
        iframeDoc.head.appendChild(iframeStyle);
      } catch (err) {
        if (config.Logger) config.Logger.error('Failed to inject style into iframe', err);
      }
    }
  }
}

// Deep Shadow DOM injection
function applyCyberdarkShadowDOM() {
  const style = document.head.querySelector('style[data-cyberdark="main"]');
  if (!style) return;
  document.querySelectorAll('*').forEach(el => {
    if (el.shadowRoot && !el.shadowRoot.querySelector('style[data-cyberdark="main"]')) {
      try {
        el.shadowRoot.appendChild(style.cloneNode(true));
      } catch (e) {
        if (config.Logger) config.Logger.warn('Cannot inject into shadow root', e);
      }
    }
  });
}

// === Structural dark mode overrides for headers, info bars, etc. ===
const cyberdarkStructuralCSS = `
/* Structural elements - Minimal Dark */
thead, th, .header-row, [role="columnheader"] {
  background: #2b2b2b !important;
  color: #fff !important;
  border-color: #444 !important;
}
thead *, th *, .header-row *, [role="columnheader"] * {
  background: transparent !important;
  color: inherit !important;
}
.info-bar, .status-row, .notice, .alert, [role="status"], [role="alert"] {
  background: #2b2b2b !important;
  color: #fff !important;
  border: 1px solid #444 !important;
}
:root, html, body {
  --bg-color: #1a1a1a !important;
  --background: #1a1a1a !important;
  --background-color: #1a1a1a !important;
  --header-bg: #2b2b2b !important;
  --text-color: #e0e0e0 !important;
  --primary-text: #e0e0e0 !important;
  --secondary-text: #b0b0b0 !important;
  --border-color: #444 !important;
}
`;

function injectStructuralDarkCSS() {
  const target = document.head || document.documentElement;
  if (!target) return;

  if (!target.querySelector('style[data-cyberdark-structural]')) {
    const style = document.createElement('style');
    style.setAttribute('data-cyberdark-structural', 'true');
    style.textContent = cyberdarkStructuralCSS;
    target.appendChild(style);
  }
}

function overrideStructuralInlineStyles(node) {
  if (
    node &&
    (
      node.matches?.('thead, th, .header-row, [role="columnheader"], .info-bar, .status-row, .notice, .alert, [role="status"], [role="alert"]')
    )
  ) {
    // Mark as overridden for cleanup
    node.setAttribute('data-cyberdark-override', 'true');
    node.style.setProperty('background', '#2b2b2b', 'important');
    node.style.setProperty('color', '#fff', 'important');
    node.style.setProperty('border-color', '#444', 'important');
  }
}

let structuralObserver;

function observeStructuralElements() {
  if (structuralObserver) return; // Already observing

  let timeout;
  structuralObserver = new MutationObserver(mutations => {
    // Debounce execution
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      const pending = [];
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) pending.push(node);
        }
      }
      // Batch process
      if (pending.length > 0) {
        pending.forEach(node => {
          overrideStructuralInlineStyles(node);
          // Limit querySelectorAll scope
          if (node.querySelectorAll) {
            const targets = node.querySelectorAll('thead, th, .header-row, [role="columnheader"], .info-bar, .status-row, .notice, .alert, [role="status"], [role="alert"]');
            targets.forEach(overrideStructuralInlineStyles);
          }
        });
      }
    }, 200);
  });

  if (document.body) {
    structuralObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (structuralObserver) structuralObserver.observe(document.body, { childList: true, subtree: true });
    });
  }
}

function disconnectStructuralObserver() {
  if (structuralObserver) {
    structuralObserver.disconnect();
    structuralObserver = null;
  }
}

function removeCyberdarkStyles() {
  const target = document.head || document.documentElement;
  if (!target) return;

  const main = target.querySelector('style[data-cyberdark="main"]');
  if (main) main.remove();

  const structural = target.querySelector('style[data-cyberdark-structural]');
  if (structural) structural.remove();

  // Revert structural overrides
  const overridden = document.querySelectorAll('[data-cyberdark-override="true"]');
  overridden.forEach(node => {
    node.style.removeProperty('background');
    node.style.removeProperty('background-color'); // Explicitly remove background-color
    node.style.removeProperty('color');
    node.style.removeProperty('border-color');
    node.removeAttribute('data-cyberdark-override');
  });

  disconnectStructuralObserver();
}

// Listen for settings and apply styles
function loadAndApplyCyberdark() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['cyberdarkEnabled', 'cyberdarkSettings'], (result) => {
        const enabled = result.cyberdarkEnabled === true;
        const settings = Object.assign({}, cyberdarkDefaults, result.cyberdarkSettings || {});
        const domain = window.location.hostname;
        const overrides = (settings.perSiteOverrides && settings.perSiteOverrides[domain]) || {};
        const finalSettings = Object.assign({}, settings, overrides);
        const blacklisted = config.isBlacklisted(domain, finalSettings.blacklist);

        // Scheduling Check
        let shouldApply = enabled && !blacklisted;
        if (shouldApply && finalSettings.schedule && finalSettings.schedule.enabled) {
          const now = new Date();
          const currentTime = now.getHours() * 60 + now.getMinutes();

          const [startH, startM] = finalSettings.schedule.start.split(':').map(Number);
          const [endH, endM] = finalSettings.schedule.end.split(':').map(Number);
          const startTime = startH * 60 + startM;
          const endTime = endH * 60 + endM;

          if (startTime < endTime) {
            // Normal range (e.g. 09:00 to 17:00)
            shouldApply = currentTime >= startTime && currentTime < endTime;
          } else {
            // Overnight range (e.g. 20:00 to 06:00)
            shouldApply = currentTime >= startTime || currentTime < endTime;
          }

          if (!shouldApply) {
            if (config.Logger) config.Logger.info('Scheduling: Outside of active hours', { now: currentTime, start: startTime, end: endTime });
          }
        }

        if (shouldApply) {
          // Remove emergency dark as we apply full styles (smooth transition)
          removeEmergencyDark(true);

          // Analytics: Increment pages darkened (throttled)
          // We can't write to storage directly from content script easily without permission or messaging
          // So we'll just log it for now, or send message to background if we had one listening
          if (config.Logger) config.Logger.info('Applying Cyberdark styles', { domain });

          applyCyberdarkStyles(finalSettings);
          applyCyberdarkIframes();
          applyCyberdarkShadowDOM();

          // Structural overrides
          injectStructuralDarkCSS();
          document.querySelectorAll('thead, th, .header-row, [role="columnheader"], .info-bar, .status-row, .notice, .alert, [role="status"], [role="alert"]').forEach(overrideStructuralInlineStyles);
          observeStructuralElements();

          // Mark canvas/video as ready for filter removal
          document.querySelectorAll('canvas, video').forEach(el => {
            el.setAttribute('data-cyberdark-ready', 'true');
          });

          // Observe for dynamically added canvas/video elements
          if (!mediaObserver && document.body) {
            mediaObserver = new MutationObserver(mutations => {
              mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                  if (node.nodeType === 1) {
                    if (node.tagName === 'CANVAS' || node.tagName === 'VIDEO') {
                      node.setAttribute('data-cyberdark-ready', 'true');
                    }
                    if (node.querySelectorAll) {
                      node.querySelectorAll('canvas, video').forEach(el => {
                        el.setAttribute('data-cyberdark-ready', 'true');
                      });
                    }
                  }
                });
              });
            });
            mediaObserver.observe(document.body, { childList: true, subtree: true });
          }
        } else {
          // Extension disabled or blacklisted - remove emergency dark immediately
          removeEmergencyDark(false);
          removeCyberdarkStyles();
          // Disconnect media observer when disabled
          if (mediaObserver) {
            mediaObserver.disconnect();
            mediaObserver = null;
          }
        }
      });

      // Register storage change listener ONCE (guard prevents memory leak)
      if (!storageListenerRegistered) {
        storageListenerRegistered = true;
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'sync' && (changes.cyberdarkSettings || changes.cyberdarkEnabled)) {
            chrome.storage.sync.get(['cyberdarkEnabled', 'cyberdarkSettings'], (res) => {
              const enabled = res.cyberdarkEnabled === true;
              const settings = Object.assign({}, cyberdarkDefaults, res.cyberdarkSettings || {});
              const domain = window.location.hostname;
              const overrides = (settings.perSiteOverrides && settings.perSiteOverrides[domain]) || {};
              const finalSettings = Object.assign({}, settings, overrides);
              const blacklisted = config.isBlacklisted(domain, finalSettings.blacklist);
              if (enabled && !blacklisted) {
                // Remove any lingering emergency dark
                removeEmergencyDark(true);
                applyCyberdarkStyles(finalSettings);
                applyCyberdarkIframes();
                applyCyberdarkShadowDOM();
                injectStructuralDarkCSS();
                observeStructuralElements();
              } else {
                // Extension toggled off - remove emergency dark immediately
                removeEmergencyDark(false);
                removeCyberdarkStyles();
                // Disconnect media observer when disabled
                if (mediaObserver) {
                  mediaObserver.disconnect();
                  mediaObserver = null;
                }
              }
            });
          }
        });
      }
    } else {
      // Fallback: Do NOTHING if storage is unavailable. Strict disabled logic.
      // applyCyberdarkStyles(cyberdarkDefaults); 
    }
  } catch (err) {
    if (config.Logger) config.Logger.error('Failed to apply styles', err);
  }
  // Expose a test utility for E2E/manual checks
  window.cyberdarkTest = () => {
    return {
      mainStyle: !!document.head.querySelector('style[data-cyberdark="main"]'),
      focusOutline: getComputedStyle(document.body).outlineColor,
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      allLinksVisible: Array.from(document.querySelectorAll('a')).every(a => getComputedStyle(a).color !== 'rgba(0, 0, 0, 0)'),
      modalContrast: Array.from(document.querySelectorAll('.modal,.popup,.dialog,.overlay,[role="dialog"],[role="tooltip"]')).every(e => getComputedStyle(e).color === 'rgb(255, 255, 255)'),
      svgNeon: Array.from(document.querySelectorAll('svg text')).every(t => getComputedStyle(t).fill === 'rgb(0, 255, 247)'),
    };
  };
}

// Initialize with fast-path enabled check via background worker cache
(async function initCyberdark() {
  try {
    // Fast path: query background worker cache (~0ms vs 20-100ms storage)
    // Include hostname for blacklist check
    const response = await chrome.runtime.sendMessage({
      type: 'getEnabledState',
      hostname: window.location.hostname
    });

    if (response?.enabled === false || response?.blacklisted === true) {
      // Extension disabled or site blacklisted - remove emergency dark immediately (no animation)
      removeEmergencyDark(false);
      if (response?.enabled === false) {
        return; // Don't proceed with full initialization if disabled
      }
      // If just blacklisted, still register listener for future changes
    }

    // Extension enabled or unknown - continue with full initialization
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadAndApplyCyberdark);
    } else {
      loadAndApplyCyberdark();
    }
  } catch (err) {
    // Background unavailable (service worker not ready, or extension context invalid)
    // Fall through to async storage check - emergency dark stays until we know
    if (config.Logger) config.Logger.debug('Background unavailable, falling back to storage', err);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadAndApplyCyberdark);
    } else {
      loadAndApplyCyberdark();
    }
  }
})();


// === Resource Monitoring & Warning System ===

const cyberdarkResourceCSS = `
#cyberdark-resource-warning {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #ff4444;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  z-index: 2147483647; /* Max z-index */
  font-family: system-ui, -apple-system, sans-serif;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0;
  transform: translateY(-20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none; /* Allow clicking through when hidden/fading */
}

#cyberdark-resource-warning.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

#cyberdark-resource-warning svg {
  width: 20px;
  height: 20px;
  fill: white;
}
`;

function injectResourceCSS() {
  const target = document.head || document.documentElement;
  if (!target || target.querySelector('#cyberdark-resource-style')) return;

  const style = document.createElement('style');
  style.id = 'cyberdark-resource-style';
  style.textContent = cyberdarkResourceCSS;
  target.appendChild(style);
}

function showResourceWarning(message) {
  injectResourceCSS();

  let popup = document.getElementById('cyberdark-resource-warning');

  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'cyberdark-resource-warning';

    // Construct icon safely via DOM APIs
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z');
    svg.appendChild(path);

    const span = document.createElement('span');
    popup.appendChild(svg);
    popup.appendChild(span);

    document.body.appendChild(popup);
  }

  const span = popup.querySelector('span');
  if (span) span.textContent = message;

  // Show
  requestAnimationFrame(() => {
    popup.classList.add('visible');
  });

  // Hide after 2 seconds
  if (popup.dataset.timeoutId) {
    clearTimeout(Number(popup.dataset.timeoutId));
  }

  const tid = setTimeout(() => {
    popup.classList.remove('visible');
    // Optional: remove from DOM after transition, but keeping it hidden is fine for performance
  }, 2000);

  popup.dataset.timeoutId = String(tid);
}

class ResourceMonitor {
  constructor() {
    this.checkInterval = 2000; // Check every 2 seconds
    this.memoryThreshold = 1024 * 1024 * 1024; // 1GB
    this.lastLoopTime = Date.now();
    this.monitorId = null;
    this.isRunning = false;
    this.rafId = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // CPU Lag Monitor via RequestAnimationFrame
    const loop = () => {
      if (!this.isRunning) return;

      const now = Date.now();
      const delta = now - this.lastLoopTime;

      // Expected frame time is ~16ms (60fps). If it takes > 500ms, Main Thread is blocked.
      if (delta > 500) {
        showResourceWarning(`High CPU Usage Detected! Page is lagging (${Math.round(delta)}ms delay)`);
      }

      this.lastLoopTime = now;
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);

    // Memory Monitor
    this.monitorId = setInterval(() => {
      this.checkMemory();
    }, this.checkInterval);
  }

  stop() {
    this.isRunning = false;
    if (this.monitorId) clearInterval(this.monitorId);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  checkMemory() {
    // performance.memory is a non-standard Chrome API, but valid for this extension
    if (window.performance && window.performance.memory) {
      const used = window.performance.memory.usedJSHeapSize;
      if (used > this.memoryThreshold) {
        const usedGB = (used / (1024 * 1024 * 1024)).toFixed(2);
        showResourceWarning(`Memory usage: ${usedGB}GB (exceeds 1GB)`);
      }
    }
  }

  // Helper to handle settings changes
  updateState(settings) {
    if (settings.resourceMonitorEnabled) {
      this.start();
    } else {
      this.stop();
    }
  }
}

const resourceMonitor = new ResourceMonitor();

// Initialize with settings
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
  chrome.storage.sync.get(['cyberdarkSettings'], (result) => {
    // Default to true if setting is missing (security by default)
    const settings = result.cyberdarkSettings || {};
    const enabled = settings.resourceMonitorEnabled !== false;

    if (enabled) {
      // Delay start slightly to allow page load
      setTimeout(() => resourceMonitor.start(), 2000);
    }
  });

  // Listen for changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.cyberdarkSettings) {
      const settings = changes.cyberdarkSettings.newValue || {};
      resourceMonitor.updateState({
        resourceMonitorEnabled: settings.resourceMonitorEnabled !== false
      });
    }
  });
} else {
  // Fallback for tests or no-storage env
  // resourceMonitor.start(); // Do not auto-start in tests unless explicitly requested
}


// Expose for testing
if (typeof module !== 'undefined') {
  module.exports = {
    applyCyberdarkStyles,
    applyCyberdarkIframes,
    applyCyberdarkShadowDOM,
    injectStructuralDarkCSS,
    overrideStructuralInlineStyles,
    removeCyberdarkStyles,
    loadAndApplyCyberdark,
    cyberdarkDefaults,
    ResourceMonitor,
    showResourceWarning
  };
}
