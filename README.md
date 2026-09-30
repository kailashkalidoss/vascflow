# VascFlow — Ankle-Brachial Index Wellness Log

> ⚠️ **Wellness tracking only — NOT a medical device.** Do not use for diagnosis or
> treatment decisions. The person being measured should be supine, rested & calm.
> Consult a qualified clinician for vascular concerns.

VascFlow is an offline-first Progressive Web App (PWA) for at-home personal
wellness tracking of arm and ankle systolic pressures, with ABI calculation,
session history, and PDF report export.

## How it works

1. **Setup** — choose Automatic (Omron/similar, camera scanning enabled) or
   Manual (sphygmomanometer, camera scanning disabled).
2. **Arms** — 3 systolic readings per arm; the highest of each trio is kept.
3. **Right / Left ankle** — consolidated cuff placement just above the malleoli
   (no Doppler, no DP/PT split), 3 systolic readings per leg, highest kept.
4. **Results** — `ABI = highest ankle ÷ highest arm`, color-coded gauges
   (Reduced flow <0.90 · Borderline 0.90–0.99 · Normal 1.00–1.40 · High/stiff >1.40),
   save sessions locally, export a PDF report.

Automatic-mode OCR reads the monitor display and keeps the higher (systolic) number.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000 (HTTP is required — not file://)
```

No build step, no backend. Data stays in the browser (`localStorage`).

## Files

| File | Purpose |
| ---- | ------- |
| `index.html` | 5-screen wizard UI |
| `app.js` | Calculation, scanner/OCR, history, PDF export |
| `styles.css` | Clinical Clarity design system |
| `manifest.json`, `sw.js`, `icon.svg` | PWA install + offline support |
