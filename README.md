# VascFlow — Ankle-Brachial Index Wellness Log

> ⚠️ **Wellness tracking only — NOT a medical device.** Do not use for diagnosis or
> treatment decisions. The person being measured should be supine, rested & calm.
> Consult a qualified clinician for vascular concerns.

VascFlow is a free, open-source, offline-first Progressive Web App (PWA) for
at-home personal wellness tracking of arm and ankle systolic pressures, with ABI
calculation, session history, and PDF report export.

**License:** MIT — see [LICENSE](LICENSE).

## How it works

1. **Setup** — choose Automatic (Omron/similar, camera scanning enabled) or
   Manual (sphygmomanometer, camera scanning disabled). Neither is pre-selected.
2. **Arms** — 3 systolic readings per arm; the **average** is used (a reading
   more than 30% off the median is discarded and shown struck through).
3. **Right / Left ankle** — consolidated cuff placement just above the malleoli
   (no Doppler, no DP/PT split), 3 systolic readings per leg, average used.
4. **Results** — `ABI = average ankle ÷ higher arm average`, color-coded gauges
   (Reduced flow <0.90 · Borderline 0.90–0.99 · Normal 1.00–1.40 · High/stiff >1.40),
   save sessions locally, export a PDF report.

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
| `index.html` | 6-screen wizard UI (setup, 4 measurement screens, results) |
| `app.js` | Calculation, scanner/OCR, history, PDF export |
| `styles.css` | Clinical Clarity design system |
| `manifest.json`, `sw.js`, `icon.svg` | PWA install + offline support |
| `privacy.md` | Privacy policy & health-data disclaimer |
| `SPEC.md` | Full app specification (v1.0.1) |
| `LICENSE` | MIT License |
