# CD-001: Set It and Forget It

**Priority:** P0 (Core Value)

**As a** person who spends hours in front of screens
**I want** my browser to automatically protect my eyes without me thinking about it
**So that** I can focus on work, not extension settings

## Story: Zero-Friciton Eye Protection

### The Ideal Experience

```
First-time install:
┌─────────────────────────────────────────────────────────────┐
│  CyberDark installed!                                      │
│                                                             │
│  Let's set you up for maximum comfort.                     │
│                                                             │
│  Your typical work hours:                                  │
│    ○  6 AM   ○  8 AM   ●  9 AM   ○ 10 AM   ○ 11 AM       │
│    ○ 12 PM   ○  1 PM   ●  5 PM   ○  6 PM   ○  7 PM       │
│                                                             │
│  [Auto-detect from my calendar]  [Customize]               │
│                                                             │
│  Preferred theme:                                          │
│    ● Cyberpunk (default)   ○ Minimal   ○ Warm             │
│                                                             │
│  That's it! CyberDark will activate automatically.         │
│  You can always adjust settings.                           │
│                      [Done →]                               │
└─────────────────────────────────────────────────────────────┘
```

### Acceptance Criteria

- [ ] One-time setup, then fully automatic
- [ ] Activates during work hours (user-configurable)
- [ ] Smooths transitions: no jarring white→black flashes
- [ ] Respects per-site preferences (some sites have their own dark mode)
- [ ] Keyboard shortcut: Ctrl+Shift+D to toggle anytime
- [ ] Status indicator shows it's working (subtle)

### Theme Presets

| Theme | Vibe | Use Case |
|-------|------|----------|
| Cyberpunk | Neon, matrix green, terminal fonts | Developers, late-night work |
| Minimal | Clean grays, sans-serif, no effects | Reading, meetings |
| Warm | Amber tones, reduced blue | Evening, eye comfort |
| Vampire | Deep reds, gothic aesthetic | Designers, creatives |

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| User works late | "Still working? I'll stay on too" (no nag) |
| Site already has dark mode | Detect, don't double-apply (or offer override) |
| Video call | Temporarily disable (WebRTC detection) |
| Screenshot mode | Quick toggle to light mode for sharing |
| Colorblind user | Alternative palettes available |

### Security & Privacy

- **Minimal permissions:** Only `activeTab` for styling
- **No data collection:** Don't track which sites users visit
- **Local storage:** Preferences never leave device
- **Open source:** Code auditable at github.com/lilbusiness/cyberdark

### A/B Testing

| Test | Variant A | Variant B | Metric |
|------|-----------|-----------|--------|
| Time detection | Ask user | Detect from system time zone | Setup completion rate |
| Default theme | Cyberpunk | Minimal | Long-term retention |
| Sunset reminder | None | "Sunset soon, enable dark mode?" | Evening activation rate |

### Success Metrics

- **Setup completion:** % who finish first-time setup
- **Retention:** % still using after 30 days
- **Activation rate:** % with auto-activation enabled
- **Toggle rate:** How often users manually toggle (low = automatic is working)

### Related Stories

- CD-002: Per-site customization
- CD-003: Work hour scheduling
- XP-001: Integration with calendar apps
