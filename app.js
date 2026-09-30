/* VascFlow — ABI wellness app (vanilla PWA, localStorage only) */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const LS_SESSIONS = 'vascflow.sessions.v1';
const LS_DRAFT = 'vascflow.draft.v1';

/* Migrate legacy ABI Tracker keys once */
try {
  if (!localStorage.getItem(LS_SESSIONS) && localStorage.getItem('abi.sessions.v1'))
    localStorage.setItem(LS_SESSIONS, localStorage.getItem('abi.sessions.v1'));
} catch (e) {}

const SITES = {
  armR: ['armR1', 'armR2', 'armR3'],
  armL: ['armL1', 'armL2', 'armL3'],
  ankR: ['ankR1', 'ankR2', 'ankR3'],
  ankL: ['ankL1', 'ankL2', 'ankL3'],
};
const FIELDS = Object.values(SITES).flat();
const SITE_LABELS = { armR: 'Right Arm', armL: 'Left Arm', ankR: 'Right Ankle', ankL: 'Left Ankle' };
const FIELD_SITE = {};
Object.entries(SITES).forEach(([site, ids]) => ids.forEach(id => FIELD_SITE[id] = site));
const FIELD_SCREEN = { armR1: 1, armR2: 1, armR3: 1, armL1: 1, armL2: 1, armL3: 1, ankR1: 2, ankR2: 2, ankR3: 2, ankL1: 3, ankL2: 3, ankL3: 3 };

let method = 'auto'; // 'auto' (Omron/similar, OCR on) | 'manual' (sphygmomanometer, OCR off)

/* ---------- helpers ---------- */
function load(k, fb) { try { const v = JSON.parse(localStorage.getItem(k)); return (v === null || v === undefined) ? fb : v; } catch (e) { return fb; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('storage unavailable', e); } }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
function num(id) { const el = $('#' + id); if (!el) return null; const v = parseFloat(el.value); return Number.isFinite(v) ? v : null; }
function validPressure(v) { return v !== null && v >= 40 && v <= 300; }
function siteReadings(site) { return SITES[site].map(num); }
function siteComplete(site) { return siteReadings(site).every(validPressure); }
function siteMax(site) { const rs = siteReadings(site).filter(v => v !== null); return rs.length ? Math.max(...rs) : null; }

/* ---------- method mode ---------- */
function setMethod(m, silent) {
  method = (m === 'manual') ? 'manual' : 'auto';
  $$('input[name="method"]').forEach(r => r.checked = (r.value === method));
  const pill = $('#methodPill');
  pill.textContent = method === 'manual' ? 'Manual' : 'Automatic';
  pill.classList.toggle('manual', method === 'manual');
  $('#manualBanner').hidden = (method !== 'manual');
  $('#manualWarnBox').hidden = (method !== 'manual');
  // Gate all scan buttons
  $$('[data-scan]').forEach(b => {
    b.disabled = (method === 'manual');
    b.title = method === 'manual' ? 'Disabled in Manual mode — enter values by hand' : 'Scan monitor (systolic only)';
    b.style.opacity = method === 'manual' ? '.45' : '';
  });
  if (!silent) { persistDraft(); toast(method === 'manual' ? 'Manual mode — camera scanning disabled' : 'Automatic mode — camera scanning enabled'); }
}
$$('input[name="method"]').forEach(r => r.addEventListener('change', () => setMethod(r.value)));

/* ---------- navigation (5 screens: 0..4) ---------- */
let currentScreen = 0;
function gotoScreen(n) {
  currentScreen = n;
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#screen-' + n).classList.add('active');
  $$('.wizard-steps .step').forEach(st => {
    const g = +st.dataset.goto;
    st.classList.toggle('active', g === n);
    st.classList.toggle('done', g < n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (n === 4) renderResults();
  persistDraft();
}
$$('[data-goto-btn]').forEach(b => b.addEventListener('click', () => gotoScreen(+b.dataset.gotoBtn)));
$$('.wizard-steps .step').forEach(st => st.addEventListener('click', () => {
  const target = +st.dataset.goto;
  if (target <= currentScreen || validateUpTo(currentScreen)) gotoScreen(target);
}));

function showErr(id, msg) {
  const el = $('#' + id);
  if (!msg) { el.hidden = true; el.textContent = ''; return true; }
  el.hidden = false; el.textContent = msg; return false;
}
function siteErrMsg(site) {
  const rs = siteReadings(site);
  if (rs.some(v => v === null)) return `Please enter all 3 ${SITE_LABELS[site]} systolic readings (highest of the 3 is used).`;
  if (!rs.every(validPressure)) return `${SITE_LABELS[site]} values look off — expected 40–300 mmHg systolic.`;
  return null;
}
function validateUpTo(screen) {
  if (screen >= 1 && (siteErrMsg('armR') || siteErrMsg('armL'))) return false;
  if (screen >= 2 && siteErrMsg('ankR')) return false;
  return true;
}

$('#toScreen1').addEventListener('click', () => { persistDraft(); gotoScreen(1); });
$('#toScreen2').addEventListener('click', () => {
  const e = siteErrMsg('armR') || siteErrMsg('armL');
  if (e) return showErr('err1', e);
  showErr('err1', null); gotoScreen(2);
});
$('#toScreen3').addEventListener('click', () => {
  const e = siteErrMsg('ankR');
  if (e) return showErr('err2', e);
  showErr('err2', null); gotoScreen(3);
});
$('#toResults').addEventListener('click', () => {
  const e = siteErrMsg('ankL');
  if (e) return showErr('err3', e);
  showErr('err3', null); gotoScreen(4);
});

/* live max badges */
const MAX_BADGE = { armR: 'maxArmR', armL: 'maxArmL', ankR: 'maxAnkR', ankL: 'maxAnkL' };
function refreshMaxBadges() {
  Object.keys(SITES).forEach(site => {
    const m = siteMax(site);
    const el = document.getElementById(MAX_BADGE[site]);
    if (el) el.textContent = m === null ? 'max —' : `max ${m} mmHg`;
  });
}
FIELDS.forEach(id => {
  $('#' + id).addEventListener('input', () => { refreshMaxBadges(); persistDraft(); });
});

function persistDraft() {
  const d = { method }; FIELDS.forEach(f => d[f] = $('#' + f).value);
  d.notes = $('#notes').value; save(LS_DRAFT, d);
}
function restoreDraft() {
  const d = load(LS_DRAFT, null);
  if (d) {
    if (d.method) method = d.method;
    FIELDS.forEach(f => { if (d[f] !== undefined) $('#' + f).value = d[f]; });
    if (d.notes) $('#notes').value = d.notes;
  }
  setMethod(method, true); refreshMaxBadges();
}
$('#notes').addEventListener('input', persistDraft);

/* ---------- ABI calculation (highest of 3 per site) ---------- */
/* Scale color codes (Clinical Clarity) — single source of truth for gauge, badges, scores, pointers */
const ABI_COLORS = { reduced: '#F43F5E', borderline: '#F59E0B', normal: '#10B981', high: '#2563EB' };
function categorize(abi) {
  if (!Number.isFinite(abi)) return { label: '—', cls: '', color: '#64748B' };
  if (abi < 0.90) return { label: 'Reduced Flow', cls: 'reduced', color: ABI_COLORS.reduced };
  if (abi < 1.00) return { label: 'Borderline', cls: 'borderline', color: ABI_COLORS.borderline };
  if (abi <= 1.40) return { label: 'Normal', cls: 'normal', color: ABI_COLORS.normal };
  return { label: 'High / Stiff', cls: 'high', color: ABI_COLORS.high };
}
function computeABI() {
  if (!siteComplete('armR') || !siteComplete('armL') || !siteComplete('ankR') || !siteComplete('ankL')) return null;
  const armR = siteMax('armR'), armL = siteMax('armL');
  const ankR = siteMax('ankR'), ankL = siteMax('ankL');
  const refArm = Math.max(armR, armL);
  const refArmSide = armR >= armL ? 'Right Arm' : 'Left Arm';
  return {
    armR, armL, ankR, ankL, refArm, refArmSide,
    rABI: ankR / refArm, lABI: ankL / refArm,
    raw: { armR: siteReadings('armR'), armL: siteReadings('armL'), ankR: siteReadings('ankR'), ankL: siteReadings('ankL') },
  };
}
function gaugePos(abi) { return Math.max(0, Math.min(abi, 1.6)) / 1.6 * 100; }
function methodName() { return method === 'manual' ? 'Manual (sphygmomanometer)' : 'Automatic (Omron/similar)'; }

function renderResults() {
  const c = computeABI();
  $('#methodRecap').textContent = 'Method: ' + methodName() + ' · supine, rested & calm';
  if (!c) {
    $('#refArmBox').textContent = 'Enter 3 readings per site to calculate ABI (highest of each trio is used).';
    $('#breakdownBox').innerHTML = '';
    return c;
  }
  $('#refArmBox').innerHTML = `<strong>Reference arm: ${c.refArmSide} — ${c.refArm} mmHg</strong> (max of R ${c.armR} / L ${c.armL}). Formula: ABI = highest ankle (max of 3) ÷ ${c.refArm}.`;
  const rC = categorize(c.rABI), lC = categorize(c.lABI);
  const sR = $('#scoreR'); sR.textContent = c.rABI.toFixed(2); sR.style.color = rC.color;
  const sL = $('#scoreL'); sL.textContent = c.lABI.toFixed(2); sL.style.color = lC.color;
  const bR = $('#badgeR'); bR.textContent = rC.label; bR.className = 'badge ' + rC.cls;
  const bL = $('#badgeL'); bL.textContent = lC.label; bL.className = 'badge ' + lC.cls;
  $('#detailR').textContent = `Right ankle max ${c.ankR} ÷ ${c.refArm} (ref arm)`;
  $('#detailL').textContent = `Left ankle max ${c.ankL} ÷ ${c.refArm} (ref arm)`;
  const pR = $('#ptrR'); pR.style.left = gaugePos(c.rABI) + '%'; pR.style.background = rC.color;
  const pL = $('#ptrL'); pL.style.left = gaugePos(c.lABI) + '%'; pL.style.background = lC.color;
  $('#breakdownBox').innerHTML =
    `<strong>Site breakdown (highest of 3 in bold):</strong><br>` +
    `Right Arm: ${c.raw.armR.join(' · ')} → <strong>${c.armR}</strong> &nbsp;|&nbsp; ` +
    `Left Arm: ${c.raw.armL.join(' · ')} → <strong>${c.armL}</strong><br>` +
    `Right Ankle (above malleoli): ${c.raw.ankR.join(' · ')} → <strong>${c.ankR}</strong> &nbsp;|&nbsp; ` +
    `Left Ankle (above malleoli): ${c.raw.ankL.join(' · ')} → <strong>${c.ankL}</strong>`;
  renderHistory();
  return c;
}

/* ---------- history ---------- */
function getSessions() { return load(LS_SESSIONS, []); }
function sessionIdFor(list) {
  const now = new Date();
  return 'VF-' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + String(list.length + 1).padStart(3, '0');
}
function renderHistory() {
  const list = getSessions();
  $('#historyList').innerHTML = list.length ? [...list].reverse().slice(0, 5).map(s =>
    `<li><span>📅 ${s.date} · R <strong>${s.rABI}</strong> (${s.rCat}) · L <strong>${s.lABI}</strong> (${s.lCat})</span><span class="muted">${s.id}</span></li>`
  ).join('') : '<li class="muted">No saved sessions yet — calculate, then Save Session.</li>';
  $('#historyListFull').innerHTML = list.length ? [...list].reverse().map(s =>
    `<li><span>📅 ${s.date} · ${s.method || ''}<br>R ${s.rABI} (${s.rCat}) · L ${s.lABI} (${s.lCat})<br><span class="muted">Arms R${s.armR}/L${s.armL} · Ankles R${s.ankR}/L${s.ankL} · ref ${s.refArm}</span></span><span class="muted">${s.id}</span></li>`
  ).join('') : '<li class="muted">Nothing saved yet.</li>';
}
$('#saveSessionBtn').addEventListener('click', () => {
  const c = computeABI();
  if (!c) return toast('Enter all 3 readings per site before saving');
  const list = getSessions();
  const id = sessionIdFor(list);
  list.push({
    id, date: new Date().toLocaleString(), method: methodName(),
    armR: c.armR, armL: c.armL, ankR: c.ankR, ankL: c.ankL,
    raw: c.raw, refArm: c.refArm, refArmSide: c.refArmSide,
    rABI: c.rABI.toFixed(2), lABI: c.lABI.toFixed(2),
    rCat: categorize(c.rABI).label, lCat: categorize(c.lABI).label,
    notes: $('#notes').value || '',
  });
  save(LS_SESSIONS, list); renderHistory(); toast('Session saved ✓ ' + id);
});
$('#historyBtnTop').addEventListener('click', () => { renderHistory(); $('#historyOverlay').hidden = false; });
$('#historyCloseBtn').addEventListener('click', () => $('#historyOverlay').hidden = true);
$('#clearHistoryBtn').addEventListener('click', () => { if (confirm('Delete all saved VascFlow sessions?')) { save(LS_SESSIONS, []); renderHistory(); } });
function clearInputs() {
  FIELDS.forEach(f => { $('#' + f).value = ''; });
  $('#notes').value = ''; refreshMaxBadges(); persistDraft();
}
$('#resetAllBtn').addEventListener('click', () => {
  if (!confirm('Clear all readings and notes? (Method selection is kept.)')) return;
  clearInputs(); gotoScreen(0); toast('Cleared');
});
$('#newCalcBtn').addEventListener('click', () => { clearInputs(); gotoScreen(0); });

/* ---------- PDF export (print window, works offline) ---------- */
const DISCLAIMER_LONG = 'MANDATORY NOTICE: This summary is generated for personal wellness tracking and self-reported health logging ONLY. This document is NOT a medical diagnosis or official vascular evaluation. Values are computed from user-entered or camera-scanned systolic data. The person measured should have been supine, rested and calm. Consult a qualified clinician for any health decisions.';
$('#exportPdfBtn').addEventListener('click', () => {
  const c = computeABI();
  if (!c) return toast('Enter all readings before exporting');
  const now = new Date();
  const sessionId = sessionIdFor(getSessions());
  const rC = categorize(c.rABI), lC = categorize(c.lABI);
  const notes = ($('#notes').value || '').replace(/</g, '&lt;');
  const tri = (arr, mx) => arr.map(v => v === mx ? `<strong>${v}</strong>` : v).join(' , ');
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return toast('Popup blocked — allow popups to export PDF');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>VascFlow Report ${sessionId}</title>
  <style>body{font-family:Arial,sans-serif;color:#111;margin:0;padding:24px}header.banner{background:#0b1c30;color:#eaf1ff;padding:12px 14px;border-radius:8px;font-size:13px}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{border:1px solid #999;padding:8px;font-size:14px;text-align:left}.res{background:#ECFDF5;border:2px solid #10B981;border-radius:8px;padding:12px;margin:14px 0}footer{margin-top:18px;font-size:11px;color:#555;border-top:1px solid #999;padding-top:8px}.sig{margin-top:28px;display:flex;gap:32px}.sig div{flex:1;border-top:1px solid #111;padding-top:4px;font-size:12px}</style></head><body>
  <header class="banner"><strong>${DISCLAIMER_LONG}</strong></header>
  <h1>VascFlow — ABI Wellness Tracking Report</h1>
  <p><strong>Date:</strong> ${now.toLocaleDateString()} &nbsp; <strong>Time:</strong> ${now.toLocaleTimeString()} &nbsp; <strong>Session ID:</strong> ${sessionId}<br><strong>Method:</strong> ${methodName()} &nbsp;·&nbsp; <strong>Position:</strong> supine, rested &amp; calm (at-home setup)</p>
  <h2>Data Summary (systolic mmHg — highest of 3 in bold)</h2>
  <table><tr><th>Site</th><th>Readings 1 · 2 · 3</th><th>Site max</th></tr>
  <tr><td>Right Arm</td><td>${tri(c.raw.armR, c.armR)}</td><td>${c.armR}${c.refArmSide === 'Right Arm' ? ' ★ REFERENCE' : ''}</td></tr>
  <tr><td>Left Arm</td><td>${tri(c.raw.armL, c.armL)}</td><td>${c.armL}${c.refArmSide === 'Left Arm' ? ' ★ REFERENCE' : ''}</td></tr>
  <tr><td>Right Ankle (cuff just above malleoli, consolidated)</td><td>${tri(c.raw.ankR, c.ankR)}</td><td>${c.ankR}</td></tr>
  <tr><td>Left Ankle (cuff just above malleoli, consolidated)</td><td>${tri(c.raw.ankL, c.ankL)}</td><td>${c.ankL}</td></tr></table>
  <div class="res"><h2>ABI Calculated Results</h2>
  <p><strong>Formula:</strong> ABI = highest ankle systolic (max of 3) ÷ highest arm systolic (${c.refArm} mmHg)</p>
  <p><strong>Right Leg ABI: ${c.rABI.toFixed(2)}</strong> — wellness category: <strong>${rC.label}</strong></p>
  <p><strong>Left Leg ABI: ${c.lABI.toFixed(2)}</strong> — wellness category: <strong>${lC.label}</strong></p>
  <p style="font-size:12px">Labels: Reduced Flow (&lt;0.90) · Borderline (0.90–0.99) · Normal (1.00–1.40) · High/Stiff (&gt;1.40). Self-tracking labels only.</p></div>
  <h2>Notes</h2><p>${notes || '<em>No notes recorded.</em>'}</p>
  <div class="sig"><div>Personal wellness observations / signature</div><div>Date</div></div>
  <footer>${DISCLAIMER_LONG}<br>Generated by VascFlow PWA · ${now.toLocaleString()}</footer>
  <script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
  toast('Report opened — use Print → Save as PDF');
});

/* ---------- Scanner modal (Automatic mode only, systolic-only OCR) ---------- */
let scanTarget = null, stream = null;
const scanModal = $('#scanModal');

$$('[data-scan]').forEach(b => b.addEventListener('click', () => openScan(b.dataset.scan)));
function openScan(fieldId) {
  if (method === 'manual') {
    toast('Manual mode — camera scanning is disabled. Type the dial value by hand.');
    return;
  }
  scanTarget = fieldId;
  const site = FIELD_SITE[fieldId];
  $('#scanTarget').textContent = `Target: ${SITE_LABELS[site]} — ${fieldId.replace(/[^0-9]/g, '')} of 3 (systolic only; highest reading wins).`;
  $('#ocrChips').innerHTML = ''; $('#ocrStatus').textContent = '';
  $('#scanManual').value = $('#' + fieldId).value || '';
  const pv = $('#scanPreview'); pv.hidden = true; pv.removeAttribute('src');
  scanModal.hidden = false;
}
$('#scanCloseBtn').addEventListener('click', closeScan);
function closeScan() { scanModal.hidden = true; stopCam(); }
async function startCam() {
  try {
    stopCam();
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const v = $('#scanVideo'); v.srcObject = stream; await v.play();
    $('#captureBtn').disabled = false; $('#ocrStatus').textContent = 'Camera live — point at the monitor, then Capture. We keep the HIGHER (SYS) number.';
  } catch (e) { $('#ocrStatus').textContent = 'Camera unavailable: ' + e.message + '. Use photo upload instead.'; }
}
function stopCam() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } const cb = $('#captureBtn'); if (cb) cb.disabled = true; }
$('#startCamBtn').addEventListener('click', startCam);
$('#captureBtn').addEventListener('click', () => {
  const v = $('#scanVideo'), cv = $('#scanCanvas');
  if (!v.videoWidth) return toast('No camera frame yet');
  cv.width = v.videoWidth; cv.height = v.videoHeight;
  cv.getContext('2d').drawImage(v, 0, 0);
  const url = cv.toDataURL('image/png');
  const pv = $('#scanPreview'); pv.src = url; pv.hidden = false;
  runOCR(url);
});
$('#scanFile').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  const url = URL.createObjectURL(f);
  const pv = $('#scanPreview'); pv.src = url; pv.hidden = false;
  runOCR(url);
});
/* Systolic-only: candidates sorted highest-first; the top chip is the presumed SYS value */
function extractSystolicCandidates(text) {
  const nums = (text.match(/\d{2,3}(?:\.\d)?/g) || []).map(Number).filter(n => n >= 40 && n <= 300);
  return [...new Set(nums)].sort((a, b) => b - a).slice(0, 6);
}
async function runOCR(imageSrc) {
  $('#ocrStatus').textContent = 'Reading systolic digits… (on-device OCR)';
  $('#ocrChips').innerHTML = '';
  try {
    if (!window.Tesseract) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    const { data } = await window.Tesseract.recognize(imageSrc, 'eng');
    const cands = extractSystolicCandidates(data.text || '');
    if (!cands.length) { $('#ocrStatus').textContent = 'No clear 40–300 reading found. Read the TOP (SYS) number and enter it manually.'; return; }
    $('#ocrStatus').textContent = `Systolic candidates (highest first — tap the TOP/SYS number, suggested: ${cands[0]}):`;
    $('#ocrChips').innerHTML = cands.map((n, i) => `<button data-v="${n}">${n}${i === 0 ? ' ★ SYS?' : ''}</button>`).join('');
    $$('#ocrChips button').forEach(b => b.addEventListener('click', () => applyScanValue(b.dataset.v)));
  } catch (e) {
    $('#ocrStatus').textContent = 'OCR unavailable offline (' + e.message + '). Enter the systolic digits manually below.';
  }
}
function applyScanValue(v) {
  if (!scanTarget) return;
  $('#' + scanTarget).value = v;
  refreshMaxBadges(); persistDraft();
  toast(`${SITE_LABELS[FIELD_SITE[scanTarget]]} reading set to ${v} systolic ✓`);
  closeScan();
  gotoScreen(FIELD_SCREEN[scanTarget] || currentScreen);
}
$('#scanApplyBtn').addEventListener('click', () => {
  const v = parseFloat($('#scanManual').value);
  if (!validPressure(v)) return toast('Enter 40–300 mmHg systolic');
  applyScanValue(v);
});

/* ---------- init ---------- */
try {
  restoreDraft();
  renderHistory();
  renderResults();
  gotoScreen(0);
  window.__vascBooted = true;
  console.log('%cVascFlow loaded ✓', 'color:#2563EB;font-weight:bold');
} catch (err) {
  console.error('VascFlow init failed:', err);
  try { toast('App failed to start: ' + err.message); } catch (e) {}
}
