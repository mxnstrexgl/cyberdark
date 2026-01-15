// popup.js - Controls Cyberdark extension settings
const validate = typeof CyberdarkValidate !== 'undefined' ? CyberdarkValidate : null;

function initPopup() {
  const toggle = document.getElementById('toggle');
  const status = document.getElementById('status');
  const blacklistBtn = document.getElementById('blacklistBtn');
  const form = document.getElementById('settings-form');
  const scheduleCheckbox = document.querySelector('input[name="scheduleEnabled"]');
  const scheduleInputs = document.getElementById('scheduleInputs');

  if (!toggle || !status) return;

  function showStatus(msg, duration = 2000) {
    status.textContent = msg;
    if (duration) {
      setTimeout(() => status.textContent = '', duration);
    }
  }

  const defaultSettings = {
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
    colorBlindMode: 'none',
    blacklist: [],
    perSiteOverrides: {},
    schedule: { enabled: false, start: '20:00', end: '06:00' },
    resourceMonitorEnabled: true,
    debugMode: false
  };

  const PRESETS = {
    cyberpunk: { color1: '#00ffff', color2: '#00ff00', color3: '#ff00ff', color4: '#ff0000', textShadow: true, highContrast: true },
    minimal: { color1: '#ffffff', color2: '#cccccc', color3: '#888888', color4: '#444444', textShadow: false, highContrast: false },
    vampire: { color1: '#ff0000', color2: '#800000', color3: '#ff0055', color4: '#330000', textShadow: true, highContrast: true },
    default: { color1: '#00ffff', color2: '#00ff00', color3: '#ff00ff', color4: '#ff0000', textShadow: true, highContrast: true }
  };

  function loadSettings() {
    chrome.storage.sync.get(['cyberdarkEnabled', 'cyberdarkSettings'], (result) => {
      const enabled = result.cyberdarkEnabled === true;
      const settings = Object.assign({}, defaultSettings, result.cyberdarkSettings || {});

      toggle.checked = enabled;

      if (form) {
        form.color1.value = settings.color1;
        form.color2.value = settings.color2;
        form.color3.value = settings.color3;
        form.color4.value = settings.color4;
        form.textShadow.checked = settings.textShadow;
        form.highContrast.checked = settings.highContrast;
        form.focusOutline.checked = settings.focusOutline;
        form.reducedMotion.checked = settings.reducedMotion;
        form.fontSize.value = settings.fontSize;
        document.getElementById('fontSizeValue').textContent = settings.fontSize + 'px';
        form.colorBlindMode.value = settings.colorBlindMode || 'none';

        const schedule = settings.schedule || defaultSettings.schedule;
        form.scheduleEnabled.checked = schedule.enabled;
        form.scheduleStart.value = schedule.start;
        form.scheduleEnd.value = schedule.end;
        if (scheduleInputs) {
          scheduleInputs.classList.toggle('hidden', !schedule.enabled);
        }

        form.blacklist.value = (settings.blacklist || []).join('\n');
        form.resourceMonitorEnabled.checked = settings.resourceMonitorEnabled !== false;
        form.debugMode.checked = settings.debugMode;
      }

      checkCurrentSiteBlacklist(settings.blacklist || []);
    });
  }

  function saveSettings() {
    if (!form) return;
    const formData = new FormData(form);

    let settings = {
      color1: formData.get('color1'),
      color2: formData.get('color2'),
      color3: formData.get('color3'),
      color4: formData.get('color4'),
      textShadow: !!formData.get('textShadow'),
      highContrast: !!formData.get('highContrast'),
      focusOutline: !!formData.get('focusOutline'),
      reducedMotion: !!formData.get('reducedMotion'),
      fontSize: parseInt(formData.get('fontSize'), 10),
      lineHeight: 1.5,
      colorBlindMode: formData.get('colorBlindMode'),
      blacklist: (formData.get('blacklist') || '').toString().split(/\r?\n/).map(s => s.trim()).filter(Boolean),
      schedule: {
        enabled: !!formData.get('scheduleEnabled'),
        start: formData.get('scheduleStart'),
        end: formData.get('scheduleEnd')
      },
      resourceMonitorEnabled: !!formData.get('resourceMonitorEnabled'),
      debugMode: !!formData.get('debugMode'),
      perSiteOverrides: {}
    };

    if (validate) {
      settings = validate.validateSettingsObject(settings, defaultSettings);
    }

    chrome.storage.sync.get(['cyberdarkSettings'], (result) => {
      const existing = result.cyberdarkSettings || {};
      settings.perSiteOverrides = existing.perSiteOverrides || {};

      if (validate && !validate.fitsInSyncQuota(settings)) {
        showStatus('Settings too large!', 3000);
        return;
      }

      chrome.storage.sync.set({ cyberdarkSettings: settings }, () => {
        checkCurrentSiteBlacklist(settings.blacklist);
      });
    });
  }

  toggle.addEventListener('change', () => {
    const next = toggle.checked;
    chrome.storage.sync.set({ cyberdarkEnabled: next }, () => {
      showStatus(next ? 'Enabled' : 'Disabled');
    });
  });

  if (form) {
    form.addEventListener('input', (e) => {
      if (e.target.name === 'fontSize') {
        document.getElementById('fontSizeValue').textContent = e.target.value + 'px';
      }
      saveSettings();
    });
    form.addEventListener('change', saveSettings);
  }

  if (scheduleCheckbox) {
    scheduleCheckbox.addEventListener('change', () => {
      if (!scheduleInputs) return;
      scheduleInputs.classList.toggle('hidden', !scheduleCheckbox.checked);
    });
  }

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetName = btn.getAttribute('data-preset');
      const preset = PRESETS[presetName];
      if (preset && form) {
        form.color1.value = preset.color1;
        form.color2.value = preset.color2;
        form.color3.value = preset.color3;
        form.color4.value = preset.color4;
        form.textShadow.checked = preset.textShadow;
        form.highContrast.checked = preset.highContrast;
        saveSettings();
        showStatus(`Applied ${presetName}`);
      }
    });
  });

  function checkCurrentSiteBlacklist(blacklist) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].url) return;
      try {
        const url = new URL(tabs[0].url);
        const domain = url.hostname;
        const safeDomain = validate ? validate.sanitizeDomain(domain) : domain;
        if (!safeDomain) return;

        const isListed = (Array.isArray(blacklist) ? blacklist : []).some(d => {
          const pattern = validate ? validate.sanitizeDomain(d) : d;
          if (!pattern) return false;
          return (typeof CyberdarkConfig !== 'undefined' && CyberdarkConfig.hostMatches)
            ? CyberdarkConfig.hostMatches(safeDomain, pattern)
            : (safeDomain === pattern || safeDomain.endsWith('.' + pattern));
        });

        if (isListed) {
          blacklistBtn.textContent = 'Remove from Blacklist';
          blacklistBtn.classList.remove('btn-destructive');
          blacklistBtn.classList.add('btn-secondary');
        } else {
          blacklistBtn.textContent = 'Blacklist This Site';
          blacklistBtn.classList.add('btn-destructive');
          blacklistBtn.classList.remove('btn-secondary');
        }
      } catch (e) {}
    });
  }

  if (blacklistBtn) {
    blacklistBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].url) return;
        const url = new URL(tabs[0].url);
        const domain = url.hostname;

        chrome.storage.sync.get(['cyberdarkSettings'], (result) => {
          const settings = result.cyberdarkSettings || defaultSettings;
          let blacklist = settings.blacklist || [];
          const safeDomain = validate ? validate.sanitizeDomain(domain) : domain;
          const isListed = blacklist.some(d => {
            const pattern = validate ? validate.sanitizeDomain(d) : d;
            return safeDomain === pattern || safeDomain.endsWith('.' + pattern);
          });

          if (isListed) {
            blacklist = blacklist.filter(d => {
              const pattern = validate ? validate.sanitizeDomain(d) : d;
              return !(safeDomain === pattern || safeDomain.endsWith('.' + pattern));
            });
            showStatus('Removed from blacklist');
          } else {
            blacklist.push(safeDomain);
            showStatus('Added to blacklist');
          }

          settings.blacklist = blacklist;

          if (form) {
            form.blacklist.value = blacklist.join('\n');
          }

          chrome.storage.sync.set({ cyberdarkSettings: settings }, () => {
            checkCurrentSiteBlacklist(blacklist);
            chrome.tabs.reload(tabs[0].id);
          });
        });
      });
    });
  }

  const exportBtn = document.getElementById('exportSettings');
  const importBtn = document.getElementById('importSettings');
  const importFile = document.getElementById('importFile');

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      chrome.storage.sync.get(['cyberdarkSettings'], async (result) => {
        const settings = result.cyberdarkSettings || defaultSettings;
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
          let settings = imported;
          if (validate) {
            const verified = await validate.verifySettings(imported);
            if (verified === null) {
              showStatus('Invalid signature!', 5000);
              return;
            }
            settings = validate.validateSettingsObject(verified, defaultSettings);
          }
          chrome.storage.sync.set({ cyberdarkSettings: settings }, () => {
            loadSettings();
            showStatus('Settings Imported');
          });
        } catch (err) {
          showStatus('Invalid JSON');
        }
      };
      reader.readAsText(file);
    });
  }

  const resetBtn = document.getElementById('reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all settings to default?')) {
        chrome.storage.sync.set({ cyberdarkSettings: defaultSettings }, () => {
          loadSettings();
          showStatus('Reset Complete');
        });
      }
    });
  }

  loadSettings();
}

document.addEventListener('DOMContentLoaded', initPopup);

if (typeof module !== 'undefined') {
  module.exports = { initPopup };
}
