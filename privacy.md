# Privacy Policy & Health Data Disclaimer

**Last Updated:** October 5, 2026
**Effective Date:** October 5, 2026

VascFlow ("the app") is a free, open-source wellness tool by Kailash Kalidoss
(https://github.com/kailashkalidoss/vascflow, MIT License). This policy describes
in plain language what the app does — and does not do — with your information.

---

## 1. Important Medical & Legal Disclaimer

* **Not a medical device.** This app is for personal wellness tracking and
  self-reported health logging only. It is **NOT** a certified medical device,
  Software as a Medical Device (SaMD), or a diagnostic tool.
* **No medical advice.** ABI calculations, gauges, categories, and PDF reports
  do not constitute diagnosis, clinical evaluation, or treatment advice.
* **Consult a clinician.** Always seek the advice of a qualified physician or
  vascular specialist regarding leg pain, circulation concerns, or blood
  pressure readings.
* **Not covered by HIPAA.** VascFlow is a direct-to-consumer wellness app with
  no healthcare-provider relationship and no Business Associate Agreement, so
  it is not a HIPAA "Covered Entity."

---

## 2. Your data stays on your device

* **Local-only storage.** All readings, averages, session history, notes, and
  drafts are stored exclusively in your browser's `localStorage` on your own
  device. There is **no backend, no user accounts, no cloud sync, no servers**.
* **Nothing is transmitted.** The app itself never sends your measurements
  anywhere. Clearing your browser's site data permanently deletes everything.
* **PDF reports are generated locally** in your browser via the print dialog.
  Saving, printing, or sharing a report is your own action on your own device.

---

## 3. Camera / OCR is on-device

* In Automatic mode, the app uses **Tesseract.js**, an open-source OCR engine
  that runs **entirely in your browser**. Photos you capture or upload are
  processed in local browser memory to extract digits and are **never
  uploaded to any server** — by us or anyone else.
* One honest nuance: the Tesseract.js library file itself is fetched from a
  public CDN (cdn.jsdelivr.net) on first camera use, then cached by the app's
  service worker for offline use. **No measurement data is ever sent to the
  CDN** — it only serves the library code.
* In Manual mode the camera is never activated.

---

## 4. What we do NOT collect

No accounts, no analytics, no tracking pixels, no advertising, no payments.
The app code collects no IP addresses, device fingerprints, or usage
telemetry. (Standard web-server access logs of the static file host,
GitHub Pages, are outside the app's control — see GitHub's privacy
statement for those.)

---

## 5. Permissions

* **Camera** is requested only when you tap a scan button in Automatic mode,
  solely to capture the blood-pressure monitor display. You confirm every
  number the OCR suggests — nothing is accepted automatically.
* The app never requests microphone, location, or contacts access.

---

## 6. Your data rights

Your data lives in your browser, under your control:

* View all sessions in **Session History**; regenerate any session's PDF.
* Delete all history with **Clear history** in the app.
* Wipe everything via your browser's site-data / storage settings.

---

## 7. Open source — verify it yourself

Source code: https://github.com/kailashkalidoss/vascflow (MIT License).
You don't have to take this policy on faith — you can read the code and
confirm exactly what the app does.

---

## 8. Contact

Questions, feedback, or privacy requests: **me@kailashkalidoss.com**
