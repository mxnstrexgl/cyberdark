// config.js - Centralized configuration for Cyberdark
// Attached to global scope for access by other scripts without bundler

(function (global) {
    const DEFAULT_SETTINGS = {
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
        colorBlindMode: 'none', // Changed from boolean to string enum
        blacklist: [],
        perSiteOverrides: {},
        enabled: true, // Global toggle
        // New Features
        schedule: { enabled: false, start: '20:00', end: '06:00' },
        resourceMonitorEnabled: true,
        debugMode: false
    };

    const SITE_PROFILES = {
        // Example profiles for specific sites
    };

    const PROBLEMATIC_SITES = [
        'docs.google.com',
        'sheets.google.com',
        'slides.google.com',
        'figma.com',
        'chrome.google.com'
    ];

    const PRESETS = {
        cyberpunk: {
            color1: '#00ffff',
            color2: '#00ff00',
            color3: '#ff00ff',
            color4: '#ff0000',
            textShadow: true,
            highContrast: true
        },
        minimal: {
            color1: '#ffffff',
            color2: '#cccccc',
            color3: '#aaaaaa',
            color4: '#888888',
            textShadow: false,
            highContrast: false,
            reducedMotion: true
        },
        vampire: {
            color1: '#ff0000',
            color2: '#880000',
            color3: '#ff0000',
            color4: '#440000',
            textShadow: true,
            highContrast: true
        }
    };

    const COLORBLIND_PALETTES = {
        protanopia: { // Red-blind
            color1: '#0072ce', // Blue
            color2: '#f0e442', // Yellow
            color3: '#56b4e9', // Sky Blue
            color4: '#e69f00'  // Orange
        },
        deuteranopia: { // Green-blind
            color1: '#0072ce',
            color2: '#f0e442',
            color3: '#56b4e9',
            color4: '#d55e00'
        },
        tritanopia: { // Blue-blind
            color1: '#d55e00', // Vermilion
            color2: '#009e73', // Bluish Green
            color3: '#f0e442', // Yellow
            color4: '#cc79a7'  // Reddish Purple
        },
        achromatopsia: { // Monochromacy
            color1: '#ffffff',
            color2: '#aaaaaa',
            color3: '#888888',
            color4: '#444444'
        }
    };

    // Precise hostname matching: exact or subdomain of pattern
    function hostMatches(hostname, pattern) {
        if (!hostname || !pattern) return false;
        const h = String(hostname).toLowerCase();
        const p = String(pattern).toLowerCase();
        return h === p || h.endsWith('.' + p);
    }

    // Helper to check if a domain is blacklisted
    function isBlacklisted(domain, blacklist = []) {
        try {
            return (
                Array.isArray(blacklist) && blacklist.some(d => hostMatches(domain, d))
            ) || PROBLEMATIC_SITES.some(d => hostMatches(domain, d));
        } catch (_) {
            return false;
        }
    }

    // Logger Mechanism
    const Logger = {
        logs: [],
        MAX_LOGS: 100,

        _add(level, message, data = null) {
            const entry = {
                timestamp: new Date().toISOString(),
                level,
                message,
                data: data ? JSON.stringify(data) : null
            };

            this.logs.unshift(entry);
            if (this.logs.length > this.MAX_LOGS) this.logs.pop();

            // SECURITY: Only log to console in debug mode to prevent info leakage
            if (typeof window !== 'undefined' && window.cyberdarkDebugMode) {
                if (level === 'ERROR' || level === 'WARN') {
                    console[level.toLowerCase()](`[Cyberdark] ${message}`, data || '');
                }
            }
        },

        info(msg, data) { this._add('INFO', msg, data); },
        warn(msg, data) { this._add('WARN', msg, data); },
        error(msg, data) { this._add('ERROR', msg, data); },
        debug(msg, data) { this._add('DEBUG', msg, data); },

        getLogs() { return this.logs; },
        clearLogs() { this.logs = []; }
    };

    global.CyberdarkConfig = {
        DEFAULT_SETTINGS,
        SITE_PROFILES,
        PROBLEMATIC_SITES,
        PRESETS,
        COLORBLIND_PALETTES,
        isBlacklisted,
        Logger,
        hostMatches
    };

})(typeof window !== 'undefined' ? window : this);
