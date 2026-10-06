# VascFlow — Ankle-Brachial Index Wellness Log

> ⚠️ **Wellness tracking only — NOT a medical device.** Do not use for diagnosis or
> treatment decisions. The person being measured should be supine, rested & calm.
> Consult a qualified clinician for vascular concerns.

VascFlow is a free, open-source, offline-first Progressive Web App (PWA) for
at-home personal wellness tracking of arm and ankle systolic pressures, with ABI
calculation, trend graphs, session history, and PDF report export.

**License:** MIT — see [LICENSE](LICENSE). **Current version:** v1.0.2.

## How it works

1. **Setup** — choose Automatic (Omron/similar, camera scanning enabled) or
   Manual (sphygmomanometer, camera scanning disabled). Neither is pre-selected;
   picking one arms the **Start Measurement** button, which begins the **10:00
   supine rest countdown** (5 beeps + auto-advance at zero).
2. **Right Arm → Left Arm** — separate screens, 3 systolic readings each; the
   **average** is used and the **higher arm average** becomes the calculation
   reference. A reading more than 30% off the median is discarded (struck
   through); if 2+ readings are >30% off, the set must be recollected.
3. **Right / Left ankle** — consolidated cuff placement just above the malleoli
   (no Doppler, no DP/PT split), 3 systolic readings per leg, same average and
   outlier rules.
4. **Results** — `ABI = average ankle ÷ higher arm average`, color-coded gauges
   (Reduced flow <0.90 · Borderline 0.90–0.99 · Normal 1.00–1.40 · High/stiff >1.40),
   save sessions locally, export a PDF report (current values or any saved session).
5. **Trends** — same-patient-gated animated ABI-over-time line graphs per leg,
   auto-scaled x-axis, visual range bands.
6. **About / Privacy / FAQ** — version info, © 2026 Kailash Kalidoss, full
   privacy policy, and anticipated-questions answered in-app.

Automatic-mode OCR (on-device Tesseract.js) reads the monitor display and
suggests the systolic (higher) number — you confirm every value by tapping it.
Nothing is ever accepted automatically.

## Privacy: nothing leaves your device

No backend, no accounts, no analytics, no cloud. All data lives in your
browser's `localStorage`; camera images are processed in local memory and never
uploaded. See [privacy.md](privacy.md) for the full policy.

## Offline behavior

The app shell works fully offline via service worker. One nuance: the OCR
engine (Tesseract.js) is fetched from a CDN on first camera use, then cached —
after that, scanning works offline too.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000 (HTTP is required — not file://)
```

No build step, no backend.

## Files

| File | Purpose |
| ---- | ------- |
| `index.html` | 7-screen wizard UI (setup, 4 measurement screens, results, trends) + About/Privacy/FAQ overlays |
| `app.js` | Calculation, rest timer, scanner/OCR, history + per-session PDF, trend graphs |
| `styles.css` | Clinical Clarity design system |
| `manifest.json`, `sw.js`, `icon.svg` | PWA install + offline support |
| `supine.gif`, `arm.gif`, `arm_left.gif`, `ankle.gif` | Animated placement guides |
| `privacy.md` | Privacy policy & health-data disclaimer |
| `SPEC.md` | Full app specification (v1.0.2) |
| `CHANGELOG.md` | Revision history |
| `LICENSE` | MIT License |
