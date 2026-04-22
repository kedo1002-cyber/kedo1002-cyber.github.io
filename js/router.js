/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — router.js
   Navegación + auto-purge de eventos
   ═══════════════════════════════════════════════ */

import { VIEWS, curView, curIdx, setCurView, setCurIdx, setSimHour, purgeExpiredEvents } from './state.js';
import { renderHome }    from './views/home.js';
import { renderAgenda }  from './views/agenda.js';
import { renderJournal } from './views/journal.js';
import { renderDash }    from './views/dash.js';

/* ── RENDER VIEW ── */
export function renderView(v) {
  if (v === 'home')         renderHome();
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

/* ── AUTO-PURGE EVENTOS AL VOLVER AL FOREGROUND ── */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    if (purgeExpiredEvents()) renderView(curView);
  }
});

/* ── AUTO-PURGE EVENTOS POR HORA (cada 60 s) ── */
setInterval(() => {
  if (purgeExpiredEvents()) renderView(curView);
}, 60000);

/* ── EXPOSE GLOBALS ── */
export function exposeRouterGlobals(setRenderViewFn) {
  window.go  = go;
  window.sim = sim;
  // Inject renderView into actions.js to break circular dependency
  if (setRenderViewFn) setRenderViewFn(renderView);
}
