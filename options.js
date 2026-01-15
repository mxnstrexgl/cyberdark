// Import validation utilities
const validate = typeof CyberdarkValidate !== 'undefined' ? CyberdarkValidate : null;

// Use global config if available
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
    perSiteOverrides: {}
  },
  PRESETS: {}
};

const defaultSettings = config.DEFAULT_SETTINGS;

// Parse per-site overrides JSON safely
// SECURITY: Prevent prototype pollution
function parsePerSiteOverrides(input) {
  if (!validate) {
    // Fallback without validation
    try {
      const obj = JSON.parse(input || '{}');
      return typeof obj === 'object' && obj !== null ? obj : {};
    } catch (err) {
      console.error('[Cyberdark] parsePerSiteOverrides error:', err);
      return {};
    }
  }

  // Use secure validation
  return validate.sanitizePerSiteOverrides(input);
}

// Validate hex color strings
function isHexColor(str) {
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(str);
}

function saveSettings(e) {
  e.preventDefault();
  const form = document.getElementById('settings-form');
  const data = new FormData(form);

  // SECURITY: Validate and sanitize all inputs
  const rawColor1 = data.get('color1');
  const rawColor2 = data.get('color2');
  const rawColor3 = data.get('color3');
  const rawColor4 = data.get('color4');

  let settings = {
    color1: validate ? validate.sanitizeHexColor(rawColor1, defaultSettings.color1) : (isHexColor(rawColor1) ? rawColor1 : defaultSettings.color1),
    color2: validate ? validate.sanitizeHexColor(rawColor2, defaultSettings.color2) : (isHexColor(rawColor2) ? rawColor2 : defaultSettings.color2),
    color3: validate ? validate.sanitizeHexColor(rawColor3, defaultSettings.color3) : (isHexColor(rawColor3) ? rawColor3 : defaultSettings.color3),
    color4: validate ? validate.sanitizeHexColor(rawColor4, defaultSettings.color4) : (isHexColor(rawColor4) ? rawColor4 : defaultSettings.color4),
    textShadow: !!data.get('textShadow'),
    highContrast: !!data.get('highContrast'),
    focusOutline: !!data.get('focusOutline'),
    reducedMotion: !!data.get('reducedMotion'),
    fontSize: validate ? validate.sanitizeFontSize(data.get('fontSize')) : parseInt(data.get('fontSize'), 10),
    lineHeight: validate ? validate.sanitizeLineHeight(data.get('lineHeight')) : parseFloat(data.get('lineHeight')),
    colorBlindMode: validate ? validate.sanitizeColorBlindMode(data.get('colorBlindMode')) : data.get('colorBlindMode'),
    blacklist: validate ? validate.sanitizeDomainList(data.get('blacklist') || '') : (data.get('blacklist') || '').toString().split(/\r?\n/).map(s => s.trim()).filter(Boolean),
    perSiteOverrides: parsePerSiteOverrides(data.get('perSiteOverrides')),
    schedule: {
      enabled: !!data.get('scheduleEnabled'),
      start: validate ? validate.sanitizeTimeString(data.get('scheduleStart'), '20:00') : (data.get('scheduleStart') || '20:00'),
      end: validate ? validate.sanitizeTimeString(data.get('scheduleEnd'), '06:00') : (data.get('scheduleEnd') || '06:00')
    },
    debugMode: !!data.get('debugMode')
  };

  // Use full validation if available
  if (validate) {
    settings = validate.validateSettingsObject(settings, defaultSettings);
  }

  // SECURITY: Check storage quota before saving
  if (validate && !validate.fitsInSyncQuota(settings)) {
    document.getElementById('status').textContent = 'Settings too large! Reduce blacklist or overrides.';
    setTimeout(() => document.getElementById('status').textContent = '', 3000);
    return;
  }

  chrome.storage.sync.set({ cyberdarkSettings: settings }, () => {
    document.getElementById('status').textContent = 'Settings saved!';
    setTimeout(() => document.getElementById('status').textContent = '', 1200);
  });
}

function restoreSettings() {
  chrome.storage.sync.get(['cyberdarkSettings'], (result) => {
    const settings = result.cyberdarkSettings || defaultSettings;
    document.querySelector('input[name="color1"]').value = settings.color1;
    document.querySelector('input[name="color2"]').value = settings.color2;
    document.querySelector('input[name="color3"]').value = settings.color3;
    document.querySelector('input[name="color4"]').value = settings.color4;
    document.querySelector('input[name="textShadow"]').checked = settings.textShadow;
    document.querySelector('input[name="highContrast"]').checked = settings.highContrast;
    document.querySelector('input[name="focusOutline"]').checked = settings.focusOutline;
    document.querySelector('input[name="reducedMotion"]').checked = settings.reducedMotion;
    document.querySelector('input[name="fontSize"]').value = settings.fontSize;
    document.getElementById('fontSizeValue').textContent = settings.fontSize + 'px';
    document.querySelector('input[name="lineHeight"]').value = settings.lineHeight;
    document.getElementById('lineHeightValue').textContent = settings.lineHeight;

    // Handle legacy boolean or new string
    let cbMode = settings.colorBlindMode;
    if (cbMode === true) cbMode = 'protanopia'; // Default legacy mapping
    if (cbMode === false) cbMode = 'none';
    document.querySelector('select[name="colorBlindMode"]').value = cbMode || 'none';

    document.querySelector('textarea[name="blacklist"]').value = (settings.blacklist || []).join('\n');
    document.querySelector('textarea[name="perSiteOverrides"]').value = JSON.stringify(settings.perSiteOverrides, null, 2);

    // Scheduling
    const schedule = settings.schedule || defaultSettings.schedule || {};
    document.querySelector('input[name="scheduleEnabled"]').checked = schedule.enabled;
    document.querySelector('input[name="scheduleStart"]').value = schedule.start || '20:00';
    document.querySelector('input[name="scheduleEnd"]').value = schedule.end || '06:00';

    // Debug & Analytics
    document.querySelector('input[name="debugMode"]').checked = settings.debugMode;
    const analytics = settings.analytics || { pagesDarkened: 0 };
    document.getElementById('analyticsPages').textContent = analytics.pagesDarkened;

    updateLivePreview();
  });
}

function updateLivePreview() {
  const form = document.getElementById('settings-form');
  const data = new FormData(form);
  const size = parseInt(data.get('fontSize'), 10);
  const lh = parseFloat(data.get('lineHeight'));
  const cb = !!data.get('colorBlindMode');
  const preview = document.getElementById('previewBox');
  if (preview) {
    preview.style.fontSize = size + 'px';
    preview.style.lineHeight = lh;
    if (cb) preview.classList.add('color-blind'); else preview.classList.remove('color-blind');
  }
  document.getElementById('fontSizeValue').textContent = size + 'px';
  document.getElementById('lineHeightValue').textContent = lh;
}

// Attach event listeners after DOM loads to avoid null refs
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  if (form) {
    form.addEventListener('submit', saveSettings);
    form.addEventListener('input', updateLivePreview);
  }
  const resetBtn = document.getElementById('reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      chrome.storage.sync.set({ cyberdarkSettings: defaultSettings }, restoreSettings);
    });
  }

  // Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetName = btn.getAttribute('data-preset');
      const preset = config.PRESETS[presetName];
      if (preset) {
        // Apply preset values to form inputs
        if (preset.color1) document.querySelector('input[name="color1"]').value = preset.color1;
        if (preset.color2) document.querySelector('input[name="color2"]').value = preset.color2;
        if (preset.color3) document.querySelector('input[name="color3"]').value = preset.color3;
        if (preset.color4) document.querySelector('input[name="color4"]').value = preset.color4;

        if (typeof preset.textShadow !== 'undefined') document.querySelector('input[name="textShadow"]').checked = preset.textShadow;
        if (typeof preset.highContrast !== 'undefined') document.querySelector('input[name="highContrast"]').checked = preset.highContrast;
        if (typeof preset.reducedMotion !== 'undefined') document.querySelector('input[name="reducedMotion"]').checked = preset.reducedMotion;

        // Update preview immediately
        updateLivePreview();

        // Show feedback
        const status = document.getElementById('status');
        status.textContent = `Applied ${presetName} preset (Save to persist)`;
        setTimeout(() => status.textContent = '', 2000);
      }
    });
  });


  // Log Viewer
  const viewLogsBtn = document.getElementById('viewLogsBtn');
  const logViewer = document.getElementById('logViewer');
  if (viewLogsBtn && logViewer) {
    viewLogsBtn.addEventListener('click', () => {
      const logs = config.Logger.getLogs();
      logViewer.value = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message} ${l.data || ''}`).join('\n');
      logViewer.style.display = logViewer.style.display === 'none' ? 'block' : 'none';
    });
  }

  restoreSettings();
});

// Export/Import functionality
const exportBtn = document.getElementById('exportSettings');
const importBtn = document.getElementById('importSettings');
const importFile = document.getElementById('importFile'); // FIX: Properly declare variable

if (exportBtn) {
  exportBtn.addEventListener('click', async () => {
    chrome.storage.sync.get(['cyberdarkSettings'], async (result) => {
      const settings = result.cyberdarkSettings || defaultSettings;

      // SECURITY: Sign settings for integrity
      let exportData = settings;
      if (validate) {
        exportData = await validate.signSettings(settings);
      }

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cyberdark-settings.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  });
}

if (importBtn && importFile) {
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imported = JSON.parse(reader.result);

        // SECURITY: Verify signature if present
        let settings = imported;
        if (validate) {
          const verified = await validate.verifySettings(imported);
          if (verified === null) {
            const status = document.getElementById('status');
            status.textContent = 'Invalid signature! Settings may be tampered.';
            setTimeout(() => status.textContent = '', 3000);
            return;
          }
          settings = verified;

          // Validate all settings
          settings = validate.validateSettingsObject(settings, defaultSettings);
        }

        chrome.storage.sync.set({ cyberdarkSettings: settings }, restoreSettings);
      } catch (err) {
        console.error('[Cyberdark] importSettings error:', err);
        document.getElementById('status').textContent = 'Invalid JSON';
      }
    };
    reader.readAsText(file);
  });
}

// Expose for testing
if (typeof module !== 'undefined') {
  module.exports = { parsePerSiteOverrides, updateLivePreview, defaultSettings, saveSettings, restoreSettings };
}
