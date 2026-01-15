// validate.js - Security validation utilities for Cyberdark
// Centralized input sanitization to prevent XSS and injection attacks

(function (global) {
    'use strict';

    // ============================================================================
    // Color Validation
    // ============================================================================

    /**
     * Validates and sanitizes hex color strings
     * @param {string} color - Color value to validate
     * @param {string} fallback - Fallback color if invalid
     * @returns {string} Valid hex color or fallback
     */
    function sanitizeHexColor(color, fallback = '#000000') {
        if (typeof color !== 'string') return fallback;

        // Strict hex color regex: #RGB or #RRGGBB
        const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

        if (hexRegex.test(color)) {
            return color.toLowerCase();
        }

        return fallback;
    }

    /**
     * Validates a palette of colors
     * @param {Object} palette - Object with color1, color2, color3, color4
     * @param {Object} defaults - Default palette
     * @returns {Object} Sanitized palette
     */
    function sanitizeColorPalette(palette, defaults) {
        return {
            color1: sanitizeHexColor(palette?.color1, defaults.color1),
            color2: sanitizeHexColor(palette?.color2, defaults.color2),
            color3: sanitizeHexColor(palette?.color3, defaults.color3),
            color4: sanitizeHexColor(palette?.color4, defaults.color4)
        };
    }

    // ============================================================================
    // Numeric Validation
    // ============================================================================

    /**
     * Validates and clamps numeric values to a range
     * @param {any} value - Value to validate
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @param {number} defaultValue - Default if invalid
     * @returns {number} Valid number in range
     */
    function sanitizeNumericRange(value, min, max, defaultValue) {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }
        const num = Number(value);

        if (isNaN(num) || !isFinite(num)) {
            return defaultValue;
        }

        return Math.max(min, Math.min(max, num));
    }

    /**
     * Validates font size
     * @param {any} fontSize - Font size value
     * @returns {number} Valid font size (12-24)
     */
    function sanitizeFontSize(fontSize) {
        return sanitizeNumericRange(fontSize, 12, 24, 16);
    }

    /**
     * Validates line height
     * @param {any} lineHeight - Line height value
     * @returns {number} Valid line height (1.0-2.2)
     */
    function sanitizeLineHeight(lineHeight) {
        return sanitizeNumericRange(lineHeight, 1.0, 2.2, 1.5);
    }

    // ============================================================================
    // Domain Validation
    // ============================================================================

    /**
     * Validates and sanitizes a domain name
     * @param {string} domain - Domain to validate
     * @returns {string|null} Valid domain or null
     */
    function sanitizeDomain(domain) {
        if (typeof domain !== 'string') return null;

        // Trim whitespace
        domain = domain.trim().toLowerCase();

        // Empty string
        if (!domain) return null;

        // Max length check (253 chars for domain)
        if (domain.length > 253) return null;

        // Basic domain regex (allows subdomains, not full URL validation)
        // Allows: example.com, sub.example.com, localhost
        const domainRegex = /^([a-z0-9-]+\.)*[a-z0-9-]+\.[a-z]{2,}$|^localhost$/i;

        if (domainRegex.test(domain)) {
            return domain;
        }

        return null;
    }

    /**
     * Validates and sanitizes an array of domains
     * @param {Array|string} domains - Array or newline-separated string of domains
     * @returns {Array} Array of valid domains
     */
    function sanitizeDomainList(domains) {
        let domainArray = [];

        if (typeof domains === 'string') {
            domainArray = domains.split(/\r?\n/);
        } else if (Array.isArray(domains)) {
            domainArray = domains;
        } else {
            return [];
        }

        return domainArray
            .map(d => sanitizeDomain(d))
            .filter(d => d !== null)
            .slice(0, 1000); // Max 1000 domains to prevent DoS
    }

    // ============================================================================
    // Time Validation
    // ============================================================================

    /**
     * Validates time string in HH:MM format
     * @param {string} time - Time string
     * @param {string} fallback - Fallback time
     * @returns {string} Valid time string
     */
    function sanitizeTimeString(time, fallback = '00:00') {
        if (typeof time !== 'string') return fallback;

        // HH:MM format (00:00 to 23:59)
        const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;

        if (timeRegex.test(time)) {
            return time;
        }

        return fallback;
    }

    // ============================================================================
    // Settings Object Validation
    // ============================================================================

    /**
     * Validates colorBlindMode setting
     * @param {any} mode - Color blind mode value
     * @returns {string} Valid mode or 'none'
     */
    function sanitizeColorBlindMode(mode) {
        const validModes = ['none', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];

        // Handle legacy boolean
        if (mode === true) return 'protanopia';
        if (mode === false) return 'none';

        if (typeof mode === 'string' && validModes.includes(mode)) {
            return mode;
        }

        return 'none';
    }

    /**
     * Validates and sanitizes per-site overrides JSON
     * SECURITY: Prevents prototype pollution
     * @param {string|Object} overrides - Per-site overrides
     * @returns {Object} Safe overrides object
     */
    function sanitizePerSiteOverrides(overrides) {
        let parsed = {};

        // Parse if string
        if (typeof overrides === 'string') {
            try {
                parsed = JSON.parse(overrides);
            } catch (e) {
                return Object.create(null);
            }
        } else if (typeof overrides === 'object' && overrides !== null) {
            parsed = overrides;
        } else {
            return Object.create(null);
        }

        // Create clean object without prototype
        const safe = Object.create(null);

        // Validate each domain and its settings
        for (const key in parsed) {
            if (!parsed.hasOwnProperty(key)) continue;

            // Skip prototype pollution attempts
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                continue;
            }

            const domain = sanitizeDomain(key);
            if (!domain) continue;

            // Validate settings object for this domain
            const domainSettings = parsed[key];
            if (typeof domainSettings !== 'object' || domainSettings === null) {
                continue;
            }

            safe[domain] = Object.create(null);

            // Validate individual properties
            if (domainSettings.color1) safe[domain].color1 = sanitizeHexColor(domainSettings.color1, '#00ffff');
            if (domainSettings.color2) safe[domain].color2 = sanitizeHexColor(domainSettings.color2, '#00ff00');
            if (domainSettings.color3) safe[domain].color3 = sanitizeHexColor(domainSettings.color3, '#ff00ff');
            if (domainSettings.color4) safe[domain].color4 = sanitizeHexColor(domainSettings.color4, '#ff0000');

            if (domainSettings.textShadow !== undefined) safe[domain].textShadow = Boolean(domainSettings.textShadow);
            if (domainSettings.highContrast !== undefined) safe[domain].highContrast = Boolean(domainSettings.highContrast);
            if (domainSettings.focusOutline !== undefined) safe[domain].focusOutline = Boolean(domainSettings.focusOutline);
            if (domainSettings.reducedMotion !== undefined) safe[domain].reducedMotion = Boolean(domainSettings.reducedMotion);

            if (domainSettings.fontSize) safe[domain].fontSize = sanitizeFontSize(domainSettings.fontSize);
            if (domainSettings.lineHeight) safe[domain].lineHeight = sanitizeLineHeight(domainSettings.lineHeight);
            if (domainSettings.colorBlindMode) safe[domain].colorBlindMode = sanitizeColorBlindMode(domainSettings.colorBlindMode);
        }

        // Limit total number of overrides (prevent storage DoS)
        const domains = Object.keys(safe);
        if (domains.length > 100) {
            const limited = Object.create(null);
            domains.slice(0, 100).forEach(d => {
                limited[d] = safe[d];
            });
            return limited;
        }

        return safe;
    }

    /**
     * Validates complete settings object
     * @param {Object} settings - Settings object to validate
     * @param {Object} defaults - Default settings
     * @returns {Object} Validated settings
     */
    function validateSettingsObject(settings, defaults) {
        if (!settings || typeof settings !== 'object') {
            return Object.assign({}, defaults);
        }

        const validated = {
            color1: sanitizeHexColor(settings.color1, defaults.color1),
            color2: sanitizeHexColor(settings.color2, defaults.color2),
            color3: sanitizeHexColor(settings.color3, defaults.color3),
            color4: sanitizeHexColor(settings.color4, defaults.color4),
            textShadow: Boolean(settings.textShadow),
            highContrast: Boolean(settings.highContrast),
            focusOutline: Boolean(settings.focusOutline),
            reducedMotion: Boolean(settings.reducedMotion),
            fontSize: sanitizeFontSize(settings.fontSize),
            lineHeight: sanitizeLineHeight(settings.lineHeight),
            colorBlindMode: sanitizeColorBlindMode(settings.colorBlindMode),
            blacklist: sanitizeDomainList(settings.blacklist || []),
            perSiteOverrides: sanitizePerSiteOverrides(settings.perSiteOverrides || {}),
            debugMode: Boolean(settings.debugMode)
        };

        // Schedule validation
        if (settings.schedule && typeof settings.schedule === 'object') {
            validated.schedule = {
                enabled: Boolean(settings.schedule.enabled),
                start: sanitizeTimeString(settings.schedule.start, '20:00'),
                end: sanitizeTimeString(settings.schedule.end, '06:00')
            };
        } else {
            validated.schedule = defaults.schedule || { enabled: false, start: '20:00', end: '06:00' };
        }

        return validated;
    }

    // ============================================================================
    // Storage Helpers
    // ============================================================================

    /**
     * Calculates approximate size of object in bytes
     * @param {any} obj - Object to measure
     * @returns {number} Approximate size in bytes
     */
    function calculateObjectSize(obj) {
        const str = JSON.stringify(obj);
        return new Blob([str]).size;
    }

    /**
     * Checks if object fits in Chrome sync storage quota
     * Quota: 100KB total, 8KB per item
     * @param {Object} obj - Object to check
     * @returns {boolean} True if fits in quota
     */
    function fitsInSyncQuota(obj) {
        const size = calculateObjectSize(obj);
        return size < 8000; // 8KB limit with some margin
    }

    // ============================================================================
    // HMAC Signing (Future Enhancement)
    // ============================================================================

    /**
     * Simple hash function for settings integrity
     * NOTE: This is NOT cryptographically secure, just a checksum
     * For production, use Web Crypto API
     * @param {Object} data - Data to hash
     * @returns {string} Hash string
     */
    async function calculateChecksum(data) {
        const str = JSON.stringify(data);

        // Use SubtleCrypto if available
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        // Fallback: simple checksum (not secure)
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    /**
     * Signs settings object for export
     * @param {Object} settings - Settings to sign
     * @returns {Promise<Object>} Signed object with checksum
     */
    async function signSettings(settings) {
        const checksum = await calculateChecksum(settings);
        return {
            version: '1.0',
            checksum: checksum,
            data: settings
        };
    }

    /**
     * Verifies signed settings
     * @param {Object} signedSettings - Signed settings object
     * @returns {Promise<Object|null>} Settings if valid, null if invalid
     */
    async function verifySettings(signedSettings) {
        if (!signedSettings || typeof signedSettings !== 'object') {
            return null;
        }

        // Legacy format (no signature)
        if (!signedSettings.version && !signedSettings.checksum) {
            return signedSettings; // Return as-is with warning
        }

        const { checksum, data } = signedSettings;
        if (!data) return null;

        const calculatedChecksum = await calculateChecksum(data);

        if (checksum === calculatedChecksum) {
            return data;
        }

        return null; // Checksum mismatch
    }

    // ============================================================================
    // Bookmark Validation (Smart Bookmarks Feature)
    // SECURITY: All web content is treated as potentially malicious
    // ============================================================================

    /**
     * Maximum lengths for bookmark fields
     * SECURITY: Prevents storage exhaustion and buffer-based attacks
     */
    const BOOKMARK_LIMITS = Object.freeze({
        TITLE_MAX: 500,
        EXCERPT_MAX: 1000,
        TEXT_MAX: 100000,        // 100KB max per bookmark
        URL_MAX: 2048,
        SITE_NAME_MAX: 100,
        WORD_COUNT_MAX: 1000000,
        MAX_BOOKMARKS: 1000,
        EMBEDDING_DIM: 384      // MiniLM output dimension
    });

    /**
     * Sanitize text extracted from web pages
     * SECURITY: Removes HTML tags, control characters, and enforces length limits
     * @param {any} text - Raw extracted text (untrusted)
     * @param {number} maxLength - Maximum allowed length
     * @returns {string} - Safe plain text
     */
    function sanitizeExtractedText(text, maxLength = BOOKMARK_LIMITS.TEXT_MAX) {
        // Type check - reject non-strings
        if (typeof text !== 'string') {
            return '';
        }

        let safe = text;

        // Strip any HTML tags (defense in depth - Readability should do this)
        // SECURITY: Prevents XSS via stored content
        safe = safe.replace(/<[^>]*>/g, '');

        // Remove null bytes - can cause truncation attacks
        safe = safe.replace(/\0/g, '');

        // Remove control characters except newlines and tabs
        // Range: \x00-\x08 (before tab), \x0b-\x0c (vertical tab, form feed),
        //        \x0e-\x1f (before space), \x7f (DEL)
        safe = safe.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');

        // Normalize multiple whitespace to single space (preserve newlines)
        safe = safe.replace(/[^\S\n]+/g, ' ');

        // Remove excessive newlines (max 2 consecutive)
        safe = safe.replace(/\n{3,}/g, '\n\n');

        // Trim leading/trailing whitespace
        safe = safe.trim();

        // Enforce maximum length
        // SECURITY: Prevents storage exhaustion
        if (safe.length > maxLength) {
            safe = safe.substring(0, maxLength);
        }

        return safe;
    }

    /**
     * Validate and sanitize bookmark URL
     * SECURITY: Only allows http/https, rejects dangerous URL schemes
     * @param {any} url - URL to validate (untrusted)
     * @returns {string|null} - Valid URL or null
     */
    function sanitizeBookmarkUrl(url) {
        if (typeof url !== 'string') {
            return null;
        }

        // Trim whitespace
        url = url.trim();

        // Empty check
        if (!url) {
            return null;
        }

        // Length check
        if (url.length > BOOKMARK_LIMITS.URL_MAX) {
            return null;
        }

        try {
            const parsed = new URL(url);

            // SECURITY: Only allow http and https protocols
            // Blocks: javascript:, data:, file:, chrome:, about:, etc.
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return null;
            }

            // SECURITY: Double-check for javascript: injection attempts
            // Some browsers may normalize URLs in unexpected ways
            const lowercaseHref = parsed.href.toLowerCase();
            if (lowercaseHref.includes('javascript:') ||
                lowercaseHref.includes('data:') ||
                lowercaseHref.includes('vbscript:')) {
                return null;
            }

            // Return the normalized URL
            return parsed.href;
        } catch (e) {
            // Invalid URL
            return null;
        }
    }

    /**
     * Sanitize complete bookmark metadata object
     * SECURITY: Validates all fields, uses Object.create(null) to prevent prototype pollution
     * @param {any} metadata - Raw metadata object (untrusted)
     * @returns {Object} - Safe metadata object
     */
    function sanitizeBookmarkMetadata(metadata) {
        // Create object without prototype chain
        // SECURITY: Prevents prototype pollution attacks
        const safe = Object.create(null);

        // Handle null/undefined/non-object input
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
            safe.title = 'Untitled';
            safe.excerpt = '';
            safe.url = '';
            safe.siteName = '';
            safe.wordCount = 0;
            safe.extractedAt = Date.now();
            return safe;
        }

        // Sanitize title
        safe.title = sanitizeExtractedText(metadata.title, BOOKMARK_LIMITS.TITLE_MAX) || 'Untitled';

        // Sanitize excerpt
        safe.excerpt = sanitizeExtractedText(metadata.excerpt, BOOKMARK_LIMITS.EXCERPT_MAX) || '';

        // Sanitize URL
        safe.url = sanitizeBookmarkUrl(metadata.url) || '';

        // Sanitize site name
        safe.siteName = sanitizeExtractedText(metadata.siteName, BOOKMARK_LIMITS.SITE_NAME_MAX) || '';

        // Sanitize word count (positive integer, max 1M)
        safe.wordCount = sanitizeNumericRange(
            metadata.wordCount,
            0,
            BOOKMARK_LIMITS.WORD_COUNT_MAX,
            0
        );

        // Sanitize timestamp (must be valid Unix timestamp, not in far future)
        const now = Date.now();
        const maxFutureTime = now + 86400000; // 1 day in future max (clock skew tolerance)
        const minPastTime = 0; // Unix epoch
        safe.extractedAt = sanitizeNumericRange(
            metadata.extractedAt,
            minPastTime,
            maxFutureTime,
            now
        );

        return safe;
    }

    /**
     * Validate embedding vector
     * SECURITY: Ensures correct dimensions and no NaN/Infinity values (DoS prevention)
     * @param {any} vector - Embedding vector to validate (untrusted)
     * @returns {Float32Array|null} - Valid embedding or null
     */
    function sanitizeEmbeddingVector(vector) {
        // Must be Float32Array
        if (!(vector instanceof Float32Array)) {
            // Try to convert from regular array
            if (Array.isArray(vector)) {
                try {
                    vector = new Float32Array(vector);
                } catch (e) {
                    return null;
                }
            } else {
                return null;
            }
        }

        // Check dimensions
        if (vector.length !== BOOKMARK_LIMITS.EMBEDDING_DIM) {
            return null;
        }

        // SECURITY: Check for NaN and Infinity values
        // These could cause issues in vector similarity calculations
        for (let i = 0; i < vector.length; i++) {
            if (!Number.isFinite(vector[i])) {
                return null;
            }
        }

        return vector;
    }

    /**
     * Validate bookmark message structure
     * SECURITY: Validates all message fields before processing
     * @param {any} message - Message to validate (untrusted)
     * @param {Array<string>} allowedActions - List of allowed action types
     * @returns {boolean} - True if valid
     */
    function validateBookmarkMessage(message, allowedActions) {
        // Must be object
        if (!message || typeof message !== 'object' || Array.isArray(message)) {
            return false;
        }

        // Must have action field
        if (typeof message.action !== 'string') {
            return false;
        }

        // Action must be in allowed list
        if (!allowedActions.includes(message.action)) {
            return false;
        }

        return true;
    }

    /**
     * Validate message sender
     * SECURITY: Ensures message is from this extension only
     * @param {Object} sender - Chrome message sender object
     * @param {string} extensionId - Expected extension ID
     * @returns {boolean} - True if valid sender
     */
    function validateMessageSender(sender, extensionId) {
        // Must be object
        if (!sender || typeof sender !== 'object') {
            return false;
        }

        // Must match extension ID
        if (sender.id !== extensionId) {
            return false;
        }

        // If from tab, tab ID must be valid integer
        if (sender.tab !== undefined) {
            if (!sender.tab || typeof sender.tab.id !== 'number' ||
                !Number.isInteger(sender.tab.id) || sender.tab.id < 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * Generate secure bookmark ID
     * Uses crypto.randomUUID if available, falls back to secure random
     * @returns {string} - UUID v4 string
     */
    function generateBookmarkId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        // Fallback using crypto.getRandomValues
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);

        // Set version (4) and variant (RFC 4122)
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        // Convert to hex string with dashes
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    /**
     * Validate complete bookmark object for storage
     * SECURITY: Final validation before persisting to IndexedDB
     * @param {any} bookmark - Bookmark to validate (untrusted)
     * @returns {Object} - Validated bookmark
     * @throws {Error} - If validation fails
     */
    function validateBookmarkForStorage(bookmark) {
        if (!bookmark || typeof bookmark !== 'object') {
            throw new Error('Invalid bookmark: must be an object');
        }

        // Sanitize metadata
        const metadata = sanitizeBookmarkMetadata(bookmark);

        // URL is required
        if (!metadata.url) {
            throw new Error('Invalid bookmark: URL is required');
        }

        // Create validated bookmark object
        const validated = Object.create(null);

        // Copy sanitized metadata
        validated.id = bookmark.id && typeof bookmark.id === 'string'
            ? bookmark.id.substring(0, 36)
            : generateBookmarkId();
        validated.title = metadata.title;
        validated.excerpt = metadata.excerpt;
        validated.url = metadata.url;
        validated.siteName = metadata.siteName;
        validated.wordCount = metadata.wordCount;
        validated.extractedAt = metadata.extractedAt;

        // Validate embedding if present
        if (bookmark.embedding !== undefined && bookmark.embedding !== null) {
            const validEmbedding = sanitizeEmbeddingVector(bookmark.embedding);
            if (!validEmbedding) {
                throw new Error('Invalid bookmark: embedding has wrong dimensions or contains invalid values');
            }
            validated.embedding = validEmbedding;
        }

        // Validate compressed text if present
        if (bookmark.compressedText !== undefined && bookmark.compressedText !== null) {
            if (!(bookmark.compressedText instanceof Blob)) {
                throw new Error('Invalid bookmark: compressedText must be a Blob');
            }
            // Size check (max 100KB compressed)
            if (bookmark.compressedText.size > BOOKMARK_LIMITS.TEXT_MAX) {
                throw new Error('Invalid bookmark: compressedText exceeds maximum size');
            }
            validated.compressedText = bookmark.compressedText;
        }

        // Add sync timestamp
        validated.syncedAt = Date.now();

        return validated;
    }

    // ============================================================================
    // Export
    // ============================================================================

    // Attach to global scope
    const CyberdarkValidate = {
        // Existing exports
        sanitizeHexColor,
        sanitizeColorPalette,
        sanitizeNumericRange,
        sanitizeFontSize,
        sanitizeLineHeight,
        sanitizeDomain,
        sanitizeDomainList,
        sanitizeTimeString,
        sanitizeColorBlindMode,
        sanitizePerSiteOverrides,
        validateSettingsObject,
        calculateObjectSize,
        fitsInSyncQuota,
        calculateChecksum,
        signSettings,
        verifySettings,
        // Bookmark exports (new)
        BOOKMARK_LIMITS,
        sanitizeExtractedText,
        sanitizeBookmarkUrl,
        sanitizeBookmarkMetadata,
        sanitizeEmbeddingVector,
        validateBookmarkMessage,
        validateMessageSender,
        generateBookmarkId,
        validateBookmarkForStorage
    };

    global.CyberdarkValidate = CyberdarkValidate;

    // Node.js export for testing
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CyberdarkValidate;
    }

})(typeof window !== 'undefined' ? window : this);
