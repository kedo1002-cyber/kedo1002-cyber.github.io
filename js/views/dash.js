/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — views/dash.js
   ═══════════════════════════════════════════════ */

import {
  tasks, history, events, journals, habits, habitLog,
  todayStr, pad, getArea, esc, fmtShort,
  AREAS, DN, MN,
} from '../state.js';
import { STREAK_THRESHOLDS } from '../habits.js';
import { getHabitStreak, getHabitHistory7 } from '../state.js';

export function renderDash() {
  const el    = document.getElementById('view-dash');
  const today = todayStr();
  const allDone = [...history, ...tasks.filter(t => t.done)];
  const todayDone  = tasks.filter(t => t.done  && t.date === today).length;
  const todayTotal = tasks.filter(t => t.date === today).length;
  const pct  = todayTotal ? Math.round(todayDone / todayTotal * 100) : 0;

  const doneByDay = {};
  allDone.forEach(t => { const d = t.date || t.archivedAt || today; doneByDay[d] = (doneByDay[d] || 0) + 1; });

  /* streak de tareas */
  let streak = 0;
  const cd = new Date();
  for (let i = 0; i < 90; i++) {
    const ds = `${cd.getFullYear()}-${pad(cd.getMonth()+1)}-${pad(cd.getDate())}`;
    if (doneByDay[ds]) { streak++; cd.setDate(cd.getDate() - 1); } else break;
  }

  const areaStats = AREAS.map(a => {
    const tot = [...tasks, ...history].filter(t => t.area === a.id).length;
    const dn  = [...tasks.filter(t => t.done), ...history].filter(t => t.area === a.id).length;
    return { ...a, tot, dn, pct: tot ? Math.round(dn / tot * 100) : 0 };
  });

  /* semana actual L→D */
  const last7  = [];
  const _today = new Date(), _dow = _today.getDay();
  const _mon   = new Date(_today); _mon.setDate(_today.getDate() - (_dow === 0 ? 6 : _dow - 1));
  const _todayDs = todayStr();
  for (let i = 0; i < 7; i++) {
    const d  = new Date(_mon); d.setDate(_mon.getDate() + i);
    const ds = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const isFut = ds > _todayDs, isNow = ds === _todayDs;
    last7.push({ lbl: ['L','M','M','J','V','S','D'][i], has: !isFut && !!doneByDay[ds], isToday: isNow, isFut });
  }

  const recent = [...history].sort((a,b) => (b.archivedAt||b.date||'') > (a.archivedAt||a.date||'') ? 1 : -1).slice(0, 8);
  const sc = streak >= 5 ? 'var(--green)' : streak >= 3 ? 'var(--amber)' : 'var(--text3)';
  const sh = streak >= 5 ? 'Imparable' : streak >= 3 ? 'En fuego' : streak >= 1 ? 'Sigue así' : 'Empieza hoy';

  /* hábitos en dash */
  const habitsStatsHTML = habits.length ? `
    <div class="section-label pe pe4">Hábitos — rachas</div>
    <div class="card pe pe4"><div class="card-inner">
      ${habits.map(h => {
        const streak = getHabitStreak(h.id);
        const level  = STREAK_THRESHOLDS.find(t => streak >= t.days) || null;
        const hist7  = getHabitHistory7(h.id);
        const dotsBg = hist7.map(d => {
          if (d.isFuture) return `<span class="h-dot future" style="opacity:0.25;background:var(--bg3)"></span>`;
          if (d.done)     return `<span class="h-dot done" style="background:${h.color}"></span>`;
          return `<span class="h-dot" style="background:var(--bg3)"></span>`;
        }).join('');
        return `<div class="habit-stat-row">
          <div class="habit-stat-icono">${h.icono}</div>
          <div class="habit-stat-body">
            <div class="habit-stat-name">${h.nombre}</div>
            <div class="habit-dots">${dotsBg}</div>
          </div>
          <div class="habit-stat-streak" style="color:${level?.color || 'var(--text3)'}">
            ${streak}<span style="font-size:9px;margin-left:1px">d</span>
          </div>
        </div>`;
      }).join('')}
    </div></div>` : '';

  el.innerHTML = `
    <div class="page-header pe"><div class="page-title">Progreso</div><div class="page-sub">Tu impacto acumulado.</div></div>
    <div class="metrics-grid pe pe1">
      <div class="metric-card">
        <div class="metric-num">${todayDone}<span style="font-size:18px;color:var(--text3)">/${todayTotal}</span></div>
        <div class="metric-lbl">Tareas hoy</div>
        <div class="metric-hint" style="color:${pct>=100?'var(--green)':pct>=50?'var(--amber)':'var(--text3)'}">${pct}% completado</div>
      </div>
      <div class="metric-card">
        <div class="metric-num">${allDone.length}</div>
        <div class="metric-lbl">Total completadas</div>
        <div class="metric-hint" style="color:var(--text3)">histórico</div>
      </div>
      <div class="metric-card">
        <div class="metric-num" style="color:${sc}">${streak}</div>
        <div class="metric-lbl">Días en racha</div>
        <div class="metric-hint" style="color:${sc}">${sh}</div>
      </div>
      <div class="metric-card">
        <div class="metric-num">${events.length}</div>
        <div class="metric-lbl">Eventos próximos</div>
        <div class="metric-hint" style="color:var(--text3)">${events.length ? 'en agenda' : 'sin eventos'}</div>
      </div>
    </div>
    <div class="section-label pe pe2">Esta semana</div>
    <div class="streak-dots pe pe2" style="padding:2px 20px 14px">
      ${last7.map(d => `<div class="streak-dot${d.has?' active':''}${d.isToday?' today':''}${d.isFut?' future':''}"><div class="s-pip"></div><div class="s-lbl">${d.lbl}</div></div>`).join('')}
    </div>
    <div class="section-label pe pe3">Por área</div>
    <div class="card pe pe3"><div class="card-inner">
      ${areaStats.map(a => `<div class="area-row"><div class="area-pip-sm" style="background:${a.color}"></div><span class="area-name">${a.label}</span><div class="area-bar-track"><div class="area-bar-fill" style="width:${a.pct}%;background:${a.color}"></div></div><span class="area-pct-lbl">${a.pct}%</span></div>`).join('')}
    </div></div>
    <button class="areas-edit-btn pe pe3" onclick="kedo._openAreasDrawer()">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M8.5 1.5a1.5 1.5 0 012.12 2.12L4 10.25l-2.5.5.5-2.5L8.5 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Editar áreas
    </button>
    ${habitsStatsHTML}
    <div class="section-label pe pe5">Completadas recientemente</div>
    ${recent.length ? `<div class="card pe pe5"><div class="card-inner">
      ${recent.map(t => { const a = getArea(t.area); return `<div class="hist-row"><div class="hist-pip" style="background:${a.color}"></div><span class="hist-txt">${esc(t.text)}</span><div class="hist-meta">${esc(a.label)}<br>${t.date && t.date !== 'undefined' ? fmtShort(t.date || t.archivedAt) : ''}</div></div>`; }).join('')}
    </div></div>` :
    `<div style="padding:16px 20px;font-size:14px;color:var(--text3)">Completa tareas para ver el historial.</div>`}
    <div style="height:24px"></div>`;
}
