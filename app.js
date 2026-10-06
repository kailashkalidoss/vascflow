/* VascFlow — ABI wellness app (vanilla PWA, localStorage only) */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const LS_SESSIONS = 'vascflow.sessions.v1';
const LS_DRAFT = 'vascflow.draft.v2'; // v2: no default method — stale v1 auto-default drafts are ignored
const APP_VERSION = '1.0.2';

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
const FIELD_SCREEN = { armR1: 1, armR2: 1, armR3: 1, armL1: 2, armL2: 2, armL3: 2, ankR1: 3, ankR2: 3, ankR3: 3, ankL1: 4, ankL2: 4, ankL3: 4 };

let method = null; // 'auto' (OCR on) | 'manual' (OCR off) | null (not yet selected)

/* ---------- helpers ---------- */
function load(k, fb) { try { const v = JSON.parse(localStorage.getItem(k)); return (v === null || v === undefined) ? fb : v; } catch (e) { return fb; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('storage unavailable', e); } }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
function num(id) { const el = $('#' + id); if (!el) return null; const v = parseFloat(el.value); return Number.isFinite(v) ? v : null; }
function validPressure(v) { return v !== null && v >= 40 && v <= 300; }
function siteReadings(site) { return SITES[site].map(num); }
/* (siteStats is the single source of truth for completeness + consistency) */
/* Site value = average of the 3 readings (rounded to 2dp).
   Outlier rule: a reading >30% off the median is discarded and the other 2
   are averaged. If 2+ readings are >30% off, the set is inconsistent. */
const OUTLIER_PCT = 0.30;
function siteStats(site) {
  const rs = siteReadings(site);
  if (!rs.every(validPressure)) return { ok: false, reason: 'incomplete', values: rs };
  const med = [...rs].sort((a, b) => a - b)[1];
  const bad = rs.map((v, i) => (Math.abs(v - med) / med > OUTLIER_PCT ? i : -1)).filter(i => i >= 0);
  if (bad.length >= 2) return { ok: false, reason: 'inconsistent', values: rs, bad };
  if (bad.length === 1) {
    const kept = rs.filter((_, i) => i !== bad[0]);
    return { ok: true, avg: Math.round((kept[0] + kept[1]) / 2 * 100) / 100, values: rs, dropped: { index: bad[0], value: rs[bad[0]] } };
  }
  return { ok: true, avg: Math.round(rs.reduce((a, b) => a + b, 0) / rs.length * 100) / 100, values: rs, dropped: null };
}
function siteAvg(site) { const s = siteStats(site); return s.ok ? s.avg : null; }
function fmtAvg(v) { return String(Math.round(v * 10) / 10); }

/* ---------- audible beeps (rest timer) ---------- */
function beep(freq = 880, dur = 0.25, when = 0) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.frequency.value = freq;
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) {}
}
function beep5() { for (let i = 0; i < 5; i++) beep(880, 0.25, i * 0.45); }

/* ---------- 10-minute supine rest timer (Screen 0) ---------- */
const REST_SECONDS = 600;
let restEndAt = 0, restHandle = null; // timestamp-based: immune to background-tab throttling
function fmtClock(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function startRestTimer() {
  if (!method) { toast('Select Automatic or Manual first'); return; }
  stopRestTimer();
  restEndAt = Date.now() + REST_SECONDS * 1000;
  $('#restTimerBox').hidden = false;
  $('#startRestBtn').disabled = true;
  $('#restClock').textContent = fmtClock(REST_SECONDS);
  $('#restStatus').textContent = 'Timer running — stay flat and still. You will auto-advance when it reaches zero.';
  restHandle = setInterval(() => {
    const restLeft = Math.max(0, Math.round((restEndAt - Date.now()) / 1000));
    $('#restClock').textContent = fmtClock(restLeft);
    if (restLeft <= 0) {
      stopRestTimer();
      $('#restStatus').textContent = 'Rest complete — 10 minutes supine. Moving to Arm Pressures.';
      $('#startRestBtn').disabled = false;
      beep5(); toast('10 minutes up ✓ — starting Arm Pressures');
      if (currentScreen === 0) setTimeout(() => gotoScreen(1), 1500);
    }
  }, 250);
}
function stopRestTimer() { if (restHandle) { clearInterval(restHandle); restHandle = null; } }

/* ---------- method mode ---------- */
function setMethod(m, silent) {
  if (m !== 'manual' && m !== 'auto') {
    // Nothing selected yet — neutral state, scanning unavailable
    method = null;
    $$('input[name="method"]').forEach(r => r.checked = false);
    const pill0 = $('#methodPill');
    pill0.textContent = 'Select method';
    pill0.classList.remove('manual');
    $('#manualBanner').hidden = true;
    $('#manualWarnBox').hidden = true;
    $$('[data-scan]').forEach(b => {
      b.disabled = true;
      b.title = 'Select Automatic or Manual first';
      b.style.opacity = '.45';
    });
    $('#startRestBtn').disabled = true;
    return;
  }
  method = m;
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
  if (!silent) { persistDraft(); }
  // (Re)selecting a method arms the timer — it only runs after Start Measurement is pressed
  stopRestTimer();
  $('#restTimerBox').hidden = false;
  $('#restClock').textContent = fmtClock(REST_SECONDS);
  $('#restStatus').textContent = 'Ready — lie flat, then press Start Measurement.';
  $('#startRestBtn').disabled = false;
  if (!silent) { toast(method === 'manual' ? 'Manual mode — camera scanning disabled. Press Start Measurement when ready.' : 'Automatic mode — camera scanning enabled. Press Start Measurement when ready.'); }
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
  if (n === 5) renderResults();
  if (n === 6) renderTrends();
  persistDraft();
}
$$('[data-goto-btn]').forEach(b => b.addEventListener('click', () => gotoScreen(+b.dataset.gotoBtn)));
$$('.wizard-steps .step').forEach(st => st.addEventListener('click', () => {
  const target = +st.dataset.goto;
  if (target === 6) { gotoScreen(6); return; } // Trends need no inputs — always viewable
  if (target > 0 && currentScreen === 0 && !method) { toast('Select Automatic or Manual first'); showErr('err0', 'Please select Automatic or Manual first — this starts your 10-minute rest timer.'); return; }
  if (target <= currentScreen || validateUpTo(currentScreen)) gotoScreen(target);
}));

function showErr(id, msg) {
  const el = $('#' + id);
  if (!msg) { el.hidden = true; el.textContent = ''; return true; }
  el.hidden = false; el.textContent = msg; return false;
}
function siteErrMsg(site) {
  const rs = siteReadings(site);
  if (rs.some(v => v === null)) return `Please enter all 3 ${SITE_LABELS[site]} systolic readings (average of valid readings is used).`;
  if (!rs.every(validPressure)) return `${SITE_LABELS[site]} values look off — expected 40–300 mmHg systolic.`;
  const st = siteStats(site);
  if (!st.ok && st.reason === 'inconsistent')
    return `${SITE_LABELS[site]} readings differ too much (more than 30% apart: ${rs.join(', ')}) — please discard them and collect all 3 readings again.`;
  return null;
}
function validateUpTo(screen) {
  if (screen >= 1 && siteErrMsg('armR')) return false;
  if (screen >= 2 && siteErrMsg('armL')) return false;
  if (screen >= 3 && siteErrMsg('ankR')) return false;
  return true;
}

$('#toScreen1').addEventListener('click', () => {
  if (!method) return showErr('err0', 'Please select Automatic or Manual first — this starts your 10-minute rest timer.');
  showErr('err0', null); persistDraft(); gotoScreen(1);
});
$('#toScreen2').addEventListener('click', () => {
  const e = siteErrMsg('armR');
  if (e) return showErr('err1', e);
  showErr('err1', null); gotoScreen(2);
});
$('#toScreen3').addEventListener('click', () => {
  const e = siteErrMsg('armL');
  if (e) return showErr('err2', e);
  showErr('err2', null); gotoScreen(3);
});
$('#toScreen4').addEventListener('click', () => {
  const e = siteErrMsg('ankR');
  if (e) return showErr('err3', e);
  showErr('err3', null); gotoScreen(4);
});
$('#toResults').addEventListener('click', () => {
  const e = siteErrMsg('ankL');
  if (e) return showErr('err4', e);
  showErr('err4', null); gotoScreen(5);
});

/* live max badges */
const AVG_BADGE = { armR: 'avgArmR', armL: 'avgArmL', ankR: 'avgAnkR', ankL: 'avgAnkL' };
function refreshAvgBadges() {
  Object.keys(SITES).forEach(site => {
    const st = siteStats(site);
    const el = document.getElementById(AVG_BADGE[site]);
    if (!el) return;
    if (!st.ok && st.reason === 'incomplete') { el.textContent = 'avg —'; return; }
    if (!st.ok) { el.textContent = '⚠ >30% apart — retake'; return; }
    el.textContent = st.dropped ? `avg ${fmtAvg(st.avg)} · dropped ${st.dropped.value}` : `avg ${fmtAvg(st.avg)} mmHg`;
  });
}
FIELDS.forEach(id => {
  $('#' + id).addEventListener('input', () => { refreshAvgBadges(); persistDraft(); });
});

function persistDraft() {
  const d = { method }; FIELDS.forEach(f => d[f] = $('#' + f).value);
  d.notes = $('#notes').value;
  const sp = $('#samePatient'); if (sp) d.samePatient = sp.checked;
  save(LS_DRAFT, d);
}
function restoreDraft() {
  const d = load(LS_DRAFT, null);
  if (d) {
    if (d.method) method = d.method;
    FIELDS.forEach(f => { if (d[f] !== undefined) $('#' + f).value = d[f]; });
    if (d.notes) $('#notes').value = d.notes;
    if (d.samePatient) $('#samePatient').checked = true;
  }
  setMethod(method, true); refreshAvgBadges();
}
$('#notes').addEventListener('input', persistDraft);

/* ---------- ABI calculation (average of 3 per site) ---------- */
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
  const st = { armR: siteStats('armR'), armL: siteStats('armL'), ankR: siteStats('ankR'), ankL: siteStats('ankL') };
  if (!st.armR.ok || !st.armL.ok || !st.ankR.ok || !st.ankL.ok) return null;
  const armR = st.armR.avg, armL = st.armL.avg;
  const ankR = st.ankR.avg, ankL = st.ankL.avg;
  const refArm = Math.max(armR, armL);
  const refArmSide = armR >= armL ? 'Right Arm' : 'Left Arm';
  return {
    armR, armL, ankR, ankL, refArm, refArmSide,
    rABI: ankR / refArm, lABI: ankL / refArm,
    raw: { armR: siteReadings('armR'), armL: siteReadings('armL'), ankR: siteReadings('ankR'), ankL: siteReadings('ankL') },
    dropped: { armR: st.armR.dropped, armL: st.armL.dropped, ankR: st.ankR.dropped, ankL: st.ankL.dropped },
  };
}
function gaugePos(abi) { return Math.max(0, Math.min(abi, 1.6)) / 1.6 * 100; }
function methodName() { return method === 'manual' ? 'Manual (sphygmomanometer)' : 'Automatic (Omron/similar)'; }

function renderResults() {
  const c = computeABI();
  $('#methodRecap').textContent = 'Method: ' + methodName() + ' · supine, rested & calm';
  if (!c) {
    $('#refArmBox').textContent = 'Enter 3 readings per site to calculate ABI (average of each trio is used).';
    $('#breakdownBox').innerHTML = '';
    return c;
  }
  $('#refArmBox').innerHTML = `<strong>Reference arm: ${c.refArmSide} — ${fmtAvg(c.refArm)} mmHg</strong> (higher of the two arm averages: R ${fmtAvg(c.armR)} / L ${fmtAvg(c.armL)}). Formula: ABI = average ankle ÷ higher arm average.`;
  const rC = categorize(c.rABI), lC = categorize(c.lABI);
  const sR = $('#scoreR'); sR.textContent = c.rABI.toFixed(2); sR.style.color = rC.color;
  const sL = $('#scoreL'); sL.textContent = c.lABI.toFixed(2); sL.style.color = lC.color;
  const bR = $('#badgeR'); bR.textContent = rC.label; bR.className = 'badge ' + rC.cls;
  const bL = $('#badgeL'); bL.textContent = lC.label; bL.className = 'badge ' + lC.cls;
  $('#detailR').textContent = `Right ankle avg ${fmtAvg(c.ankR)} ÷ ${fmtAvg(c.refArm)} (ref arm)`;
  $('#detailL').textContent = `Left ankle avg ${fmtAvg(c.ankL)} ÷ ${fmtAvg(c.refArm)} (ref arm)`;
  const pR = $('#ptrR'); pR.style.left = gaugePos(c.rABI) + '%'; pR.style.background = rC.color;
  const pL = $('#ptrL'); pL.style.left = gaugePos(c.lABI) + '%'; pL.style.background = lC.color;
  $('#breakdownBox').innerHTML =
    `<strong>Site breakdown (average of valid readings — a reading &gt;30% off is dropped):</strong><br>` +
    `Right Arm: ${showVals('armR')} → <strong>${fmtAvg(c.armR)}</strong> &nbsp;|&nbsp; ` +
    `Left Arm: ${showVals('armL')} → <strong>${fmtAvg(c.armL)}</strong><br>` +
    `Right Ankle (above malleoli): ${showVals('ankR')} → <strong>${fmtAvg(c.ankR)}</strong> &nbsp;|&nbsp; ` +
    `Left Ankle (above malleoli): ${showVals('ankL')} → <strong>${fmtAvg(c.ankL)}</strong>`;
  function showVals(key) {
    return c.raw[key].map((v, i) =>
      (c.dropped[key] && c.dropped[key].index === i) ? `<s>${v} dropped</s>` : v).join(' · ');
  }
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
  const itemHtml = (s, full) =>
    `<li><span>📅 ${s.date}${full ? ` · ${s.method || ''}` : ''}<br>R <strong>${s.rABI}</strong> (${s.rCat}) · L <strong>${s.lABI}</strong> (${s.lCat})` +
    (full ? `<br><span class="muted">Arms R${s.armR}/L${s.armL} · Ankles R${s.ankR}/L${s.ankL} · ref ${s.refArm}</span>` : '') +
    `</span><span class="hist-side"><span class="muted">${s.id}</span><button class="btn secondary small" data-pdf="${s.id}">📄 PDF</button></span></li>`;
  $('#historyList').innerHTML = list.length ? [...list].reverse().slice(0, 5).map(s => itemHtml(s, false)).join('') : '<li class="muted">No saved sessions yet — calculate, then Save Session.</li>';
  $('#historyListFull').innerHTML = list.length ? [...list].reverse().map(s => itemHtml(s, true)).join('') : '<li class="muted">Nothing saved yet.</li>';
}
function openSessionPdf(id) {
  const s = getSessions().find(x => x.id === id);
  if (!s) return toast('Session not found');
  const d = s.ts ? new Date(s.ts) : null;
  const raw = s.raw || { armR: [s.armR], armL: [s.armL], ankR: [s.ankR], ankL: [s.ankL] };
  openPdfReport({
    armR: s.armR, armL: s.armL, ankR: s.ankR, ankL: s.ankL,
    raw, dropped: s.dropped || null, refArm: s.refArm, refArmSide: s.refArmSide,
    rABI: parseFloat(s.rABI), lABI: parseFloat(s.lABI),
    method: s.method || '—',
    dateStr: d ? d.toLocaleDateString() : s.date, timeStr: d ? d.toLocaleTimeString() : '',
    generatedStr: new Date().toLocaleString(),
    sessionId: s.id, notes: escNotes(s.notes),
  });
}
[$('#historyList'), $('#historyListFull')].forEach(ul => ul.addEventListener('click', (e) => {
  const b = e.target.closest('[data-pdf]');
  if (b) openSessionPdf(b.dataset.pdf);
}));
$('#saveSessionBtn').addEventListener('click', () => {
  const c = computeABI();
  if (!c) return toast('Enter all 3 readings per site before saving');
  const list = getSessions();
  const id = sessionIdFor(list);
  list.push({
    id, date: new Date().toLocaleString(), method: methodName(),
    armR: c.armR, armL: c.armL, ankR: c.ankR, ankL: c.ankL,
    raw: c.raw, refArm: c.refArm, refArmSide: c.refArmSide,
    dropped: c.dropped || null, ts: Date.now(),
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
  $('#notes').value = ''; refreshAvgBadges(); persistDraft();
}
$('#resetAllBtn').addEventListener('click', () => {
  if (!confirm('Clear all readings and notes? (Method selection is kept.)')) return;
  clearInputs(); gotoScreen(0); toast('Cleared');
});
$('#newCalcBtn').addEventListener('click', () => { clearInputs(); gotoScreen(0); });
$('#toTrendsBtn').addEventListener('click', () => gotoScreen(6));
$('#trendsHistBtn').addEventListener('click', () => { renderHistory(); $('#historyOverlay').hidden = false; });
$('#samePatient').addEventListener('change', () => { persistDraft(); renderTrends(); });

/* ---------- Trends: animated ABI-over-time graphs ---------- */
const trendRaf = {};
function shortDate(t) {
  const d = new Date(t);
  return isNaN(d) ? '?' : (d.getMonth() + 1) + '/' + d.getDate();
}
function trendPoints(key) {
  return getSessions()
    .map((s, i) => ({ t: s.ts || Date.parse(s.date) || i, v: parseFloat(s[key]), id: s.id }))
    .filter(p => Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t);
}
function renderTrends() {
  const ptsR = trendPoints('rABI'), ptsL = trendPoints('lABI');
  const body = $('#trendsBody'), msg = $('#trendsMsg');
  if (!$('#samePatient').checked) {
    body.hidden = true;
    msg.textContent = 'Confirm above that the saved sessions are for the same person to unlock the graphs.';
    return;
  }
  if (!ptsR.length) {
    body.hidden = true;
    msg.textContent = 'No saved sessions yet — finish a calculation on the Results screen, then Save Session.';
    return;
  }
  body.hidden = false;
  msg.textContent = ptsR.length < 2
    ? 'Only one session so far — save more sessions to grow the trend lines.'
    : `${ptsR.length} sessions · ${shortDate(ptsR[0].t)} → ${shortDate(ptsR[ptsR.length - 1].t)} (x-axis auto-scaled)`;
  drawTrend($('#trendR'), ptsR, '#2563EB');
  drawTrend($('#trendL'), ptsL, '#2563EB');
}
function drawTrend(canvas, pts, lineColor) {
  if (trendRaf[canvas.id]) cancelAnimationFrame(trendRaf[canvas.id]);
  const dpr = window.devicePixelRatio || 1;
  const W = Math.max(280, canvas.clientWidth || (canvas.parentElement && canvas.parentElement.clientWidth) || 600);
  const H = 220, L = 38, R = 10, T = 12, B = 26;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  const vals = pts.map(p => p.v);
  const lo = Math.max(0, Math.min(0.85, ...vals.map(v => v - 0.12)));
  const hi = Math.max(1.55, ...vals.map(v => v + 0.06));
  let t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  if (!(t1 > t0)) { t0 -= 86400000; t1 += 86400000; }
  const X = t => L + (t - t0) / (t1 - t0) * (W - L - R);
  const Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const BANDS = [
    { a: lo, b: 0.90, c: 'rgba(244,63,94,0.10)' },
    { a: 0.90, b: 1.00, c: 'rgba(245,158,11,0.16)' },
    { a: 1.00, b: 1.40, c: 'rgba(16,185,129,0.10)' },
    { a: 1.40, b: hi, c: 'rgba(37,99,235,0.10)' },
  ];
  const tStart = performance.now(), DUR = 900, total = pts.length - 1;
  const frame = (now) => {
    const p = Math.min(1, (now - tStart) / DUR);
    const e = 1 - Math.pow(1 - p, 3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    BANDS.forEach(bd => {
      const yA = Y(Math.min(bd.b, hi)), yB = Y(Math.max(bd.a, lo));
      if (yB > yA + 0.5) { ctx.fillStyle = bd.c; ctx.fillRect(L, yA, W - L - R, yB - yA); }
    });
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    [0.90, 1.00, 1.40].forEach(v => {
      if (v <= lo || v >= hi) return;
      const y = Y(v);
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - R, y); ctx.stroke();
      ctx.fillText(v.toFixed(2), 4, y + 3);
    });
    ctx.setLineDash([]);
    ctx.fillText(hi.toFixed(2), 4, T + 8);
    ctx.fillText(lo.toFixed(2), 4, H - B + 2);
    ctx.textAlign = 'center';
    const picks = pts.length === 1 ? [0] : [...new Set([0, Math.floor(total / 3), Math.floor(2 * total / 3), total])];
    picks.forEach(i => ctx.fillText(shortDate(pts[i].t), Math.min(Math.max(X(pts[i].t), L + 16), W - R - 16), H - 8));
    ctx.textAlign = 'left';
    const f = e * total;
    if (total > 0) {
      ctx.strokeStyle = lineColor; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(pts[0].t), Y(pts[0].v));
      const k = Math.floor(f);
      for (let i = 1; i <= Math.min(k, total); i++) ctx.lineTo(X(pts[i].t), Y(pts[i].v));
      if (k < total) {
        const frac = f - k;
        ctx.lineTo(X(pts[k].t) + (X(pts[k + 1].t) - X(pts[k].t)) * frac,
                   Y(pts[k].v) + (Y(pts[k + 1].v) - Y(pts[k].v)) * frac);
      }
      ctx.stroke();
    }
    pts.forEach((pt, i) => {
      if (i - 1e-6 > f) return;
      ctx.beginPath(); ctx.arc(X(pt.t), Y(pt.v), 4.5, 0, 7);
      ctx.fillStyle = categorize(pt.v).color; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      if (i === 0 || i === pts.length - 1) {
        ctx.fillStyle = '#0F172A'; ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(pt.v.toFixed(2), Math.min(X(pt.t) + 8, W - 34), Y(pt.v) - 7);
      }
    });
    if (p < 1) trendRaf[canvas.id] = requestAnimationFrame(frame);
  };
  trendRaf[canvas.id] = requestAnimationFrame(frame);
}

/* ---------- rest timer restart + about screen ---------- */
$('#restRestartBtn').addEventListener('click', () => { startRestTimer(); toast('Rest timer restarted — 10:00'); });
$('#startRestBtn').addEventListener('click', () => { startRestTimer(); toast('Rest timer started — stay flat and still'); });
function openAbout() { $('#aboutOverlay').hidden = false; }
$('#aboutBtnTop').addEventListener('click', openAbout);
$('#aboutLink').addEventListener('click', (e) => { e.preventDefault(); openAbout(); });
$('#aboutCloseBtn').addEventListener('click', () => $('#aboutOverlay').hidden = true);

/* ---------- privacy policy + FAQ screens ---------- */
$('#privacyOpenBtn').addEventListener('click', () => $('#privacyOverlay').hidden = false);
$('#privacyCloseBtn').addEventListener('click', () => $('#privacyOverlay').hidden = true);
function openFaq() { $('#faqOverlay').hidden = false; }
$('#faqOpenBtn').addEventListener('click', openFaq);
$('#faqLink').addEventListener('click', (e) => { e.preventDefault(); openFaq(); });
$('#faqCloseBtn').addEventListener('click', () => $('#faqOverlay').hidden = true);

/* ---------- PDF export (print window, works offline) ---------- */
const DISCLAIMER_LONG = 'MANDATORY NOTICE: This summary is generated for personal wellness tracking and self-reported health logging ONLY. This document is NOT a medical diagnosis or official vascular evaluation. Values are computed from user-entered or camera-scanned systolic data. The person measured should have been supine and rested a full 10 minutes. Consult a qualified clinician for any health decisions.';
function escNotes(t) { return (t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function openPdfReport(rep) {
  const rC = categorize(rep.rABI), lC = categorize(rep.lABI);
  const showPdfVals = (key) => rep.raw[key].map((v, i) =>
    (rep.dropped && rep.dropped[key] && rep.dropped[key].index === i) ? `<s>${v} (dropped &gt;30% off)</s>` : v).join(' · ');
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) { toast('Popup blocked — allow popups to export PDF'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>VascFlow Report ${rep.sessionId}</title>
  <style>body{font-family:Arial,sans-serif;color:#111;margin:0;padding:24px}header.banner{background:#0b1c30;color:#eaf1ff;padding:12px 14px;border-radius:8px;font-size:13px}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{border:1px solid #999;padding:8px;font-size:14px;text-align:left}.res{background:#ECFDF5;border:2px solid #10B981;border-radius:8px;padding:12px;margin:14px 0}footer{margin-top:18px;font-size:11px;color:#555;border-top:1px solid #999;padding-top:8px}.sig{margin-top:28px;display:flex;gap:32px}.sig div{flex:1;border-top:1px solid #111;padding-top:4px;font-size:12px}</style></head><body>
  <header class="banner"><strong>${DISCLAIMER_LONG}</strong></header>
  <h1>VascFlow — ABI Wellness Tracking Report</h1>
  <p><strong>Date:</strong> ${rep.dateStr} &nbsp; <strong>Time:</strong> ${rep.timeStr} &nbsp; <strong>Session ID:</strong> ${rep.sessionId}<br><strong>Method:</strong> ${rep.method} &nbsp;·&nbsp; <strong>Position:</strong> supine, rested a full 10 minutes (at-home setup)</p>
  <h2>Data Summary (systolic mmHg — average of valid readings; a reading &gt;30% off is dropped)</h2>
  <table><tr><th>Site</th><th>Readings 1 · 2 · 3</th><th>Site avg</th></tr>
  <tr><td>Right Arm</td><td>${showPdfVals('armR')}</td><td><strong>${rep.armR}</strong>${rep.refArmSide === 'Right Arm' ? ' ★ REFERENCE' : ''}</td></tr>
  <tr><td>Left Arm</td><td>${showPdfVals('armL')}</td><td><strong>${rep.armL}</strong>${rep.refArmSide === 'Left Arm' ? ' ★ REFERENCE' : ''}</td></tr>
  <tr><td>Right Ankle (cuff just above malleoli, consolidated)</td><td>${showPdfVals('ankR')}</td><td><strong>${rep.ankR}</strong></td></tr>
  <tr><td>Left Ankle (cuff just above malleoli, consolidated)</td><td>${showPdfVals('ankL')}</td><td><strong>${rep.ankL}</strong></td></tr></table>
  <div class="res"><h2>ABI Calculated Results</h2>
  <p><strong>Formula:</strong> ABI = average ankle systolic ÷ average arm systolic (${rep.refArm} mmHg)</p>
  <p><strong>Right Leg ABI: ${rep.rABI.toFixed(2)}</strong> — wellness category: <strong>${rC.label}</strong></p>
  <p><strong>Left Leg ABI: ${rep.lABI.toFixed(2)}</strong> — wellness category: <strong>${lC.label}</strong></p>
  <p style="font-size:12px">Labels: Reduced Flow (&lt;0.90) · Borderline (0.90–0.99) · Normal (1.00–1.40) · High/Stiff (&gt;1.40). Self-tracking labels only.</p></div>
  <h2>Notes</h2><p>${rep.notes || '<em>No notes recorded.</em>'}</p>
  <div class="sig"><div>Personal wellness observations / signature</div><div>Date</div></div>
  <footer>${DISCLAIMER_LONG}<br>Generated by VascFlow v${APP_VERSION} PWA · ${rep.generatedStr}</footer>
  <script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
  toast('Report opened — use Print → Save as PDF');
}
$('#exportPdfBtn').addEventListener('click', () => {
  const c = computeABI();
  if (!c) return toast('Enter all readings before exporting');
  const now = new Date();
  openPdfReport({
    armR: c.armR, armL: c.armL, ankR: c.ankR, ankL: c.ankL,
    raw: c.raw, dropped: c.dropped, refArm: c.refArm, refArmSide: c.refArmSide,
    rABI: c.rABI, lABI: c.lABI, method: methodName(),
    dateStr: now.toLocaleDateString(), timeStr: now.toLocaleTimeString(),
    generatedStr: now.toLocaleString(),
    sessionId: sessionIdFor(getSessions()), notes: escNotes($('#notes').value),
  });
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
  $('#scanTarget').textContent = `Target: ${SITE_LABELS[site]} — ${fieldId.replace(/[^0-9]/g, '')} of 3 (systolic only; average of the 3 is used).`;
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
  refreshAvgBadges(); persistDraft();
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
