# VascFlow — Revision History

## v1.0.1 — 2026-10-03
Second release. Wizard flow, measurement rules, guides, reporting, and legal screens.

**Setup & rest timer (Screen 0)**
- Neither Automatic nor Manual is pre-selected; the user must choose to proceed.
- New **Start Measurement** button, enabled only after a method is chosen.
- Choosing a method arms a **10:00 → 00:00 rest countdown**; on expiry the app **beeps 5×** and auto-advances to Screen 1 (manual Next + Restart 10:00 retained).
- Positioning checklist requires lying **completely flat (supine), 10 full minutes**, ankles and heart level; animated `supine.gif` illustrates the position.

**Measurement rules**
- Every site: **3 systolic readings, average used** (was: highest reading).
- **Outlier rule:** a reading **>30% off** the median is discarded and the other 2 averaged (shown struck through); if **2+ readings are >30% off**, the set is rejected and must be recollected.
- Reference = **higher of the two arm averages**; stated explicitly on Results and PDF.

**Guides (Screens 1–3)**
- Cuff-placement guides moved **above** the inputs; full-limb animated GIFs replace diagrams: `arm.gif` (upper-arm cuff, fingers + thumb) and `ankle.gif` (cuff above malleoli, toes), consolidated ankle sites, no Doppler.
- ABI formula removed from the arm screen; "Screen x of y" counters removed (wizard pills show progress).

**Results (Screen 4/5)**
- Gauge scale: exact threshold stops (56.25% / 62.5% / 87.5%), ticks at true positions with raised 0.90 tick; scores and pointers tinted by category color.
- History notes local-only storage; **each saved session has its own 📄 PDF button** regenerating its report.

**About / Privacy / FAQ / Legal**
- New **About** screen (v1.0.1, Kailash Kalidoss + site link, © 2026), in-app **Privacy Policy** screen (from `privacy.md`), and **FAQ** (incl. outlier rule, reprinting old reports; "health care provider" wording).
- "© 2026 Kailash Kalidoss" in footer and About.

## v1.0.0 — 2026-09-19
Initial release. VascFlow ABI wellness PWA: 4-screen wizard (arms, right/left DP+PT ankles, results), highest-of-readings, camera OCR scanning, gauges, local history, PDF export, offline service worker.
