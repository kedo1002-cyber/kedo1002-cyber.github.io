/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — router.js
   Navegación + Timer Pomodoro
   ═══════════════════════════════════════════════ */

import { VIEWS, curView, curIdx, setCurView, setCurIdx, simHour, setSimHour, fmtT, pad, purgeExpiredEvents } from './state.js';
import { renderHome }    from './views/home.js';
import { renderAgenda }  from './views/agenda.js';
import { renderJournal } from './views/journal.js';
import { renderDash }    from './views/dash.js';

/* ── RENDER VIEW ── */
export function renderView(v) {
  if (v === 'home')    renderHome();
  else if (v === 'agenda')  renderAgenda();
  else if (v === 'journal') renderJournal();
  else if (v === 'dash')    renderDash();
}

/* ── NAVIGATION ── */
export function go(name, idx) {
  if (name === curView) return;
  const fromIdx  = curIdx;
  const goRight  = idx > fromIdx;
  const fromName = VIEWS[fromIdx];

  setCurView(name); setCurIdx(idx);

  const fromEl = document.getElementById('view-' + fromName);
  fromEl.classList.remove('is-active','is-left','is-right');
  fromEl.classList.add(goRight ? 'is-left' : 'is-right');

  VIEWS.forEach((v, i) => {
    if (v === name || v === fromName) return;
    const el = document.getElementById('view-' + v);
    el.classList.remove('is-active','is-left','is-right');
    el.classList.add(i < idx ? 'is-left' : 'is-right');
  });

  const toEl = document.getElementById('view-' + name);
  toEl.classList.remove('is-left','is-right');
  toEl.classList.add('is-active');

  VIEWS.forEach(v => document.getElementById('nav-' + v)?.classList.toggle('active', v === name));
  renderView(name);
}

/* ── SIM HOUR (dev) ── */
export function sim(h) {
  setSimHour(h);
  const info = document.getElementById('dev-info');
  if (info) info.textContent = h < 12 ? 'mañana' : h < 19 ? 'tarde' : 'noche';
  renderView(curView);
}

/* ── TIMER POMODORO ── */
let tSec = 25 * 60, tRem = 25 * 60, tOn = false, tIv = null, tMode = 'Enfoque', tChipId = 'tc-25';
let _hiddenAt = null; /* timestamp cuando la app va a background con timer activo */

export function updateTimerDisplay() {
  const d = document.getElementById('t-display'); if (d) d.textContent = fmtT(tRem);
  const b = document.getElementById('t-toggle');  if (b) b.textContent = tOn ? 'Pausar' : 'Iniciar';
}
export function toggleTimer() {
  if (tOn) { clearInterval(tIv); tOn = false; }
  else {
    tOn = true;
    tIv = setInterval(() => {
      if (tRem <= 0) { clearInterval(tIv); tOn = false; updateTimerDisplay(); notifyTimerEnd(); return; }
      tRem--; updateTimerDisplay();
    }, 1000);
  }
  updateTimerDisplay();
}
export function resetTimer() { clearInterval(tIv); tOn = false; tRem = tSec; updateTimerDisplay(); }
export function setTimerMode(m, lbl, chipId) {
  clearInterval(tIv); tOn = false; tSec = m * 60; tRem = m * 60; tMode = lbl; tChipId = chipId;
  ['tc-25','tc-10','tc-5'].forEach(id => document.getElementById(id)?.classList.toggle('on', id === chipId));
  const ml = document.getElementById('t-mode'); if (ml) ml.textContent = lbl;
  updateTimerDisplay();
}

function notifyTimerEnd() {
  navigator.vibrate && navigator.vibrate([100, 50, 100, 50, 200]);
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('KEDO Brain', { body: `${tMode} terminado. ¡Buen trabajo!`, icon: 'icon-512.png' });
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (tOn) {
      clearInterval(tIv); tOn = false;
      _hiddenAt = Date.now();
      updateTimerDisplay();
    }
  } else if (_hiddenAt !== null) {
    /* app vuelve al foreground: ajustar tiempo real transcurrido */
    const elapsed = Math.floor((Date.now() - _hiddenAt) / 1000);
    _hiddenAt = null;
    tRem = Math.max(0, tRem - elapsed);
    if (tRem > 0) {
      /* reanudar automáticamente */
      tOn = true;
      tIv = setInterval(() => {
        if (tRem <= 0) { clearInterval(tIv); tOn = false; updateTimerDisplay(); notifyTimerEnd(); return; }
        tRem--; updateTimerDisplay();
      }, 1000);
    } else {
      notifyTimerEnd();
    }
    updateTimerDisplay();
    /* al volver al foreground, purgar eventos vencidos */
    if (purgeExpiredEvents()) renderView(curView);
  }
});

/* ── AUTO-PURGE EVENTOS POR HORA (cada 60 s) ── */
setInterval(() => {
  if (purgeExpiredEvents()) renderView(curView);
}, 60000);

/* ── EXPOSE GLOBALS ── */
export function exposeRouterGlobals(setRenderViewFn) {
  window.go           = go;
  window.sim          = sim;
  window.toggleTimer  = toggleTimer;
  window.resetTimer   = resetTimer;
  window.setTimerMode = setTimerMode;
  // Inject renderView into actions.js to break circular dependency
  if (setRenderViewFn) setRenderViewFn(renderView);
}
