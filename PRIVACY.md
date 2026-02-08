# Cyberdark Privacy Policy

**Last updated:** February 8, 2026

## Overview

Cyberdark is a browser extension that applies dark mode styling to web pages. We are committed to protecting your privacy and being transparent about our data practices.

## Data Collection

**Cyberdark does NOT collect, transmit, or share any user data.**

We do not:
- Track your browsing history
- Collect personal information
- Send analytics or telemetry
- Share data with third parties
- Use cookies for tracking

## Local Storage Only

All your settings and preferences are stored locally in your browser using Chrome's sync storage API. This includes:

- Color preferences
- Site blacklist
- Schedule settings
- Accessibility options
- Per-site overrides

This data:
- **Never leaves your device** (except via Chrome's built-in sync if you have that enabled in your browser settings)
- **Is not accessible** to Cyberdark developers
- **Is not sold or shared** with any third parties

## Permissions Explained

Cyberdark requests the following permissions:

| Permission | Why We Need It |
|------------|----------------|
| `activeTab` | Apply dark mode styling to the current page you're viewing |
| `storage` | Save your preferences locally so they persist between sessions |
| `<all_urls>` | Required to inject dark mode CSS on any website you visit |

### Why "<all_urls>"?

This permission sounds broad, but it's necessary for a dark mode extension to work. Without it, we couldn't apply dark styling to web pages. We only use this permission to inject CSS styles - we never read page content, form data, or any personal information.

## No Analytics

Cyberdark contains:
- No tracking scripts
- No analytics services (Google Analytics, Mixpanel, etc.)
- No telemetry or usage reporting
- No crash reporting services

## No Remote Code

Cyberdark does not:
- Load or execute remote code
- Make network requests to external servers
- Fetch updates outside of the Chrome Web Store update mechanism

All code runs locally in your browser.

## Open Source

Cyberdark is open source. You can review our code to verify these privacy claims:
https://github.com/mxnstrexgl/cyberdark

## Data Deletion

To remove all Cyberdark data:
1. Right-click the Cyberdark icon
2. Select "Remove from Chrome"
3. All local data is automatically deleted

Alternatively, you can clear extension data via Chrome Settings > Privacy and Security > Clear browsing data.

## Children's Privacy

Cyberdark does not knowingly collect any information from children under 13 years of age, as we do not collect any information from anyone.

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last updated" date at the top of this document.

## Contact

If you have questions about this privacy policy or Cyberdark's data practices:

- **GitHub Issues:** https://github.com/mxnstrexgl/cyberdark/issues
- **Email:** [Add your contact email if desired]

---

**Summary:** Cyberdark is a privacy-respecting dark mode extension. We don't collect data, we don't track you, and we don't phone home. Your settings stay on your device.
