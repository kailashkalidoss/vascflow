# VascFlow — Ankle-Brachial Index (ABI) Multi-Screen Wellness App Specification
**Version: v1.0.1**

## 1. Executive Summary & Disclaimer Architecture
**App name: VascFlow.** This application is designed solely for personal wellness tracking, physical exercise monitoring, and self-reported health logging in an **at-home setup**. It is **NOT** a certified medical device and must **NOT** be used for clinical diagnosis, risk assessment, or treatment decisions.

**Measurement posture (all screens):** the person being measured must lie **completely flat (supine)** and rest a **full 10 minutes** before the first BP reading. **Do not sit up** — stay flat so the **ankles and heart are at the same level**. Remain calm and quiet; no talking or moving during readings.

### Prominent Disclaimers
* **Global Header / Top Banner:** Persistent notice on all screens indicating the tool's non-diagnostic status.
* **Exported PDF Disclaimer:** Mandatory header and footer disclosures on all exported records explaining that results are computed from user-entered or camera-scanned data for tracking purposes only.

---

## 2. Setup: Measurement Method + Rest Timer (separate screen, Screen 0)

Before any readings, the user selects one of two device methods on a dedicated setup screen (neither is pre-selected — the user must choose to start the timer):

1. **Automatic (e.g. Omron or similar oscillometric monitor)** — camera/OCR scanning of the monitor display is **enabled**. OCR accepts **systolic values only (the higher of the two displayed numbers)**.
2. **Manual (sphygmomanometer + stethoscope)** — camera/OCR scanning is **disabled app-wide**. A persistent warning is displayed: *"Manual method selected — camera scanning is disabled. Enter all systolic values by hand from your sphygmomanometer dial."*

The selected method is stored, shown on every screen, included in saved sessions, and printed on the PDF report.

### 10-minute rest countdown
* Neither method is pre-selected. Selecting one arms the **Start Measurement** button (disabled until then).
* Pressing **Start Measurement** begins a **10:00 → 00:00 countdown timer** on Screen 0.
* On expiry the app **beeps 5 times** and **auto-navigates to Screen 1** (only if still on Screen 0).
* A manual **"Next: Arm Pressures"** button is always retained, plus a **Restart 10:00** button.

### Positioning guide
* The at-home positioning checklist sits beside an animated **`supine.gif`** illustrating a person lying completely flat with heart and ankles at the same level.

---

## 3. Information Architecture & Screen Flow

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌──────────────┐
│  SCREEN 0   │──>│  SCREEN 1   │──>│  SCREEN 2   │──>│  SCREEN 3   │──>│  SCREEN 4   │──>│   SCREEN 5   │
│Setup+Timer  │   │ Right Arm   │   │ Left Arm    │   │Right Ankle  │   │ Left Ankle  │   │Results & PDF │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └──────────────┘
```
Plus an **About screen** (overlay, reachable from header/footer): app name, logo, version, developer credit + website, **© 2026 Kailash Kalidoss**, privacy language, ABI learn-more link. A **FAQ screen** (footer + About links) answers anticipated questions: what ABI is, why 10-min supine rest, why 3-reading averages, why the higher arm is the reference, automatic vs manual, cuff placement, category meanings, privacy/offline behavior, and PDF sharing. No "Screen x of y" counters are shown; wizard pills indicate progress.

**Reading rule (all sites):** every site is measured **3 times** and the **average** is used, with outlier handling — a reading **more than 30% off** the median is **discarded** and the remaining 2 are averaged (shown struck through). If **all 3 readings differ by more than 30%**, the set is rejected and the user must **recollect all 3 readings**.

---

## 4. Detailed Screen Breakdown

### Screen 0: Setup — Device Method, Rest Timer & Positioning
* **Purpose:** Choose the measurement method, enforce the 10-minute supine rest, and confirm at-home positioning.
* **Fields & Actions:**
  * **Method selector (radio cards):** Automatic (Omron/similar) vs Manual (sphygmomanometer).
  * **Rest timer box:** 10:00 countdown, status line, Restart button.
  * **Manual-mode warning banner:** Visible only when Manual is selected — OCR disabled.
  * **Positioning checklist + supine GIF:** lie completely flat, rest a full 10 min, do not sit up, ankles & heart level, correct cuff sizes, 3 readings per site (average used).
* **Navigation:** `Next: Arm Pressures →` (manual) + timer auto-advance.

### Screen 1: Right Arm Pressure (Brachial Artery)
* **Purpose:** Collect right-arm systolic values — **3 readings, average used**. No ABI formula is shown on this screen. The **higher of the two arm averages** is used as the reference for the ABI calculation.
* **Layout:** The cuff-placement guide (animated full-arm GIF `arm.gif` showing the entire limb) appears **above** the reading inputs.
* **Fields & Actions:**
  * **Right Arm Systolic (mmHg) × 3** (auto average badge).
  * **AI Vision Button (per reading, Automatic mode only):** webcam/upload scanner; OCR captures the **systolic (higher) number only**. Disabled with warning in Manual mode.
* **Navigation:** `← Back: Setup` | `Next: Left Arm →`

---

### Screen 2: Left Arm Pressure (Brachial Artery)
* **Purpose:** Collect left-arm systolic values — **3 readings, average used**. No ABI formula is shown on this screen.
* **Layout:** The cuff-placement guide (animated full-arm GIF `arm.gif`) appears **above** the reading inputs.
* **Fields & Actions:**
  * **Left Arm Systolic (mmHg) × 3** (auto average badge).
  * **AI Vision Button (per reading, Automatic mode only):** webcam/upload scanner; OCR captures the **systolic (higher) number only**. Disabled with warning in Manual mode.
* **Navigation:** `← Back: Right Arm` | `Next: Right Ankle →`

---

### Screen 3: Right Ankle Pressure (consolidated)
* **Purpose:** Single consolidated right ankle systolic series — cuff on the lower leg **just above the malleoli**. **No hand-held Doppler; DP and posterior tibial are NOT measured separately.** Average of 3 used.
* **Layout:** Animated full-leg GIF (`ankle.gif`, entire limb with cuff above the ankle) appears **above** the reading inputs.
* **Fields & Actions:**
  * **Right Ankle Systolic (mmHg) × 3** (auto average badge).
  * **AI Vision Button (Automatic mode only):** camera/upload modal, systolic-only OCR.
* **Navigation:** `← Back: Left Arm` | `Next: Left Ankle →`

---

### Screen 4: Left Ankle Pressure (consolidated)
* **Purpose:** Same consolidated protocol for the left leg — cuff **just above the malleoli**, no Doppler, no DP/PT split. Average of 3 used.
* **Layout:** Animated full-leg GIF (`ankle.gif`) appears **above** the reading inputs.
* **Fields & Actions:**
  * **Left Ankle Systolic (mmHg) × 3** (auto average badge).
  * **AI Vision Button (Automatic mode only):** camera/upload modal, systolic-only OCR.
* **Navigation:** `← Back: Right Ankle` | `Calculate & View Results →`

---

### Screen 5: Dedicated Results & Analysis Screen
* **Purpose:** Display calculated Right and Left ABI scores, interactive gauge visualizers, and export options.
* **Computation rule:** every site uses its **average of 3 readings**; reference = higher arm average. ($\text{ABI} = \frac{\text{Average Ankle Systolic}}{\text{Average Arm Systolic}}$).
* **Key Components:**
  * **Method & posture recap:** shows Automatic/Manual method used.
  * **Reference Arm Display:** Identifies the higher arm average used as the common denominator.
  * **Dual ABI Score Cards:** Right/Left ABI with category badge (*Normal*, *Borderline*, *Reduced Flow*, *High/Stiff*); score numerals and gauge pointers tinted in the category color.
  * **Spectrum Gauge Visualizer:** 0.00–1.60 scale, exact stops — Coral 0–0.90, Amber 0.90–1.00, Emerald 1.00–1.40, Cobalt 1.40–1.60+. The 0.90 tick sits on a raised tier so 0.90 and 1.00 never overlap.
  * **Session History Log (local only):** saved to `localStorage`; each entry carries its own **📄 PDF button** regenerating that session's report (original date/ID/notes). The UI states sessions live **only in this browser on this device** — nothing is uploaded, no servers/accounts/cloud.
  * **PDF Export Action:** prominent printable-report button.
* **Navigation:** `← Edit Input Values` | `Start New Calculation`

### About Screen
* App name + logo, **version v1.0.1**, developer credit **Kailash Kalidoss** with link to **https://kailashkalidoss.com**, short privacy summary plus an in-app **full Privacy Policy screen** (content from `privacy.md`), and **Learn more about ABI → https://pmc.ncbi.nlm.nih.gov/articles/PMC10506545/** (NIH/PMC).

---

## 5. PDF Export Specifications

1. **Header Disclaimer Banner:** mandatory non-diagnosis notice.
2. **Metadata:** Date, time, session log ID, **measurement method**, positioning note (supine, rested a full 10 minutes), app version.
3. **Data Summary Table:** per site — readings 1·2·3 plus **site average** (Right/Left Arm with Reference identified; Right/Left Ankle consolidated above malleoli).
4. **ABI Results Box:** Right/Left ABI + wellness category (`ABI = average ankle ÷ average arm`).
5. **Notes & Signature Field:** personal wellness observations.

---

## 6. UI Design System — Clinical Clarity (`design.md`)
* **Font:** Plus Jakarta Sans; tabular numerals for metrics.
* **Canvas:** ice-blue gradient `#F1F6FD → #F8FAFC`; white `#FFFFFF` cards, 1px `#E2E8F0` borders, `rounded-2xl`, soft ambient shadows.
* **Primary:** Cobalt `#2563EB` (hover `#1D4ED8`); inputs/buttons `rounded-lg`; focus ring `0 0 0 3px rgba(37,99,235,.15)`.
* **Scale colors:** Reduced Coral `#F43F5E` / Borderline Amber `#F59E0B` / Normal Emerald `#10B981` / High Cobalt `#2563EB` — shared by gauge, badges, legend, scores, pointers.
* **Text:** `#0F172A` / `#475569` / `#64748B`.

## 7. Implementation Notes
Multi-screen PWA (HTML/JS/CSS), offline-first (`localStorage` + service worker), PDF via printable report window. OCR (Automatic mode only) via on-device Tesseract.js keeps the higher displayed number (systolic). Rest timer uses Web Audio beeps.
