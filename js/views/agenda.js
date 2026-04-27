/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — views/agenda.js
   ═══════════════════════════════════════════════ */

import {
  events, tasks, hour, blockId, todayStr, getArea,
  daysUntil, urgColor, esc, fmtLong, fmtShort, fmtEvTime,
  AREAS, selEventArea,
} from '../state.js';
import { renderEventForm } from '../actions.js';
import { attachSwipeReveal } from '../gestures.js';

/* SVGs reutilizables */
const CHECK_SVG = `<svg width="12" height="9" viewBox="0 0 12 9" fill="none"><polyline points="1,4.5 4.5,8 11,1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SWIPE_BACK = `<div class="event-swipe-back"><span class="event-swipe-lbl">Completado</span><div class="event-swipe-icon">${CHECK_SVG}</div></div>`;

export function renderAgenda() {
  const el     = document.getElementById('view-agenda');
  const today  = todayStr();
  const sorted = [...events].sort((a,b) => a.date > b.date ? 1 : -1).filter(e => e.date >= today);
  const next   = sorted[0] || null;

  let h = `<div class="page-header pe"><div class="page-title">Agenda</div><div class="page-sub">Próximos eventos por urgencia.</div></div>`;

  if (next) {
    const d = daysUntil(next.date), a = getArea(next.area), c = urgColor(d);
    const upct = Math.max(0, Math.min(100, Math.round((1 - d / 60) * 100)));
    h += `<div class="event-swipe-wrap pe pe1" data-eid="${next.id}">
      ${SWIPE_BACK}
      <div class="next-card">
        <div class="next-tag">Más próximo</div>
        <div class="next-days" style="color:${c}">${d === 0 ? '0' : d}</div>
        <div class="next-unit" style="color:${c}">${d===0?'¡Es hoy!':d===1?'día restante':'días restantes'}</div>
        <div class="next-title">${esc(next.title)}</div>
        <div class="next-meta"><div class="next-pip" style="background:${a.color}"></div><span class="next-date-str">${esc(a.label)} · ${fmtLong(next.date)}</span></div>
        ${next.startTime ? `<div class="next-ev-time">${fmtEvTime(next.startTime, next.endTime)}</div>` : ''}
        <div class="urgency-track"><div class="urgency-fill" style="width:${upct}%;background:${c}"></div></div>
      </div>
    </div>`;
  }

  if (sorted.length > 1) {
    h += `<div class="section-label pe pe2">En camino</div>`;
    sorted.slice(1).forEach((e, i) => {
      const d = daysUntil(e.date), a = getArea(e.area), c = urgColor(d);
      const upct = Math.max(0, Math.min(100, Math.round((1 - d / 60) * 100)));
      h += `<div class="event-swipe-wrap pe pe${Math.min(i+3,5)}" data-eid="${e.id}">
        ${SWIPE_BACK}
        <div class="event-card">
          <div class="event-countdown"><div class="event-count-num" style="color:${c}">${d}</div><div class="event-count-lbl">${d===1?'día':'días'}</div></div>
          <div class="event-sep"></div>
          <div class="event-info">
            <div class="event-name">${esc(e.title)}</div>
            <div class="event-sub"><div class="event-area-pip" style="background:${a.color}"></div><span class="event-date-lbl">${esc(a.label)} · ${fmtShort(e.date)}${e.startTime ? ` · ${fmtEvTime(e.startTime, e.endTime)}` : ''}</span></div>
            <div class="event-ubar"><div class="event-ufill" style="width:${upct}%;background:${c}"></div></div>
          </div>
        </div>
      </div>`;
    });
  }

  if (!sorted.length) {
    h += `<div class="empty"><div class="empty-ring"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--text3)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="14" rx="3"/><path d="M3 9h14M8 2v4M13 2v4"/></svg></div><div class="empty-title">Sin eventos próximos</div><div class="empty-sub">Agrega exámenes, reuniones<br>o fechas importantes.</div></div>`;
  }

  h += `<div class="section-label pe pe3">${sorted.length ? 'Agregar evento' : 'Nuevo evento'}</div>
  <div class="event-form-wrap pe pe3" id="event-form-inner"></div>
  <div style="height:24px"></div>`;

  el.innerHTML = h;
  renderEventForm();
  setTimeout(initEventSwipes, 0);
}

/* ── SWIPE-TO-COMPLETE en agenda ── */
function _attachEventSwipe(wrap) {
  const eid = wrap.dataset.eid;
  if (!eid) return;
  attachSwipeReveal(wrap, {
    cardSelector: '.next-card, .event-card',
    backSelector: '.event-swipe-back',
    iconSelector: '.event-swipe-icon',
    vibrate: [8, 40, 12],
    onConfirm: () => window.kedo._delEvent(eid),
  });
}

function initEventSwipes() {
  document.querySelectorAll('#view-agenda .event-swipe-wrap[data-eid]').forEach(_attachEventSwipe);
}
