/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — views/journal.js
   ═══════════════════════════════════════════════ */

import {
  tasks, journals, selMood,
  hour, blockId, todayStr,
  setReflToday, esc,
  MOODS, DN, MN, LDN, LMN,
} from '../state.js';
import { pickMood, generateReflection, openReflModal, openPastRefl } from '../actions.js';

export function renderJournal() {
  const el      = document.getElementById('view-journal');
  const isNight = blockId(hour()) === 'night';
  const today   = todayStr();
  const existing = journals.find(j => j.date === today) || null;
  const past     = journals.filter(j => j.date !== today).slice(0, 7);
  const todayTasks = tasks.filter(t => t.date === today);
  const todayDone  = todayTasks.filter(t => t.done).length;
  const todayTotal = todayTasks.length;
  const pct        = todayTotal ? Math.round(todayDone / todayTotal * 100) : 0;

  setReflToday(existing || null);

  let h = `<div class="page-header pe"><div class="page-title">Diario</div><div class="page-sub">Cierra el día con honestidad.</div></div>`;

  if (isNight) {
    const btnHtml = existing
      ? `<button class="gen-btn is-view pe pe4" id="gen-btn" onclick="openReflModal(window._reflToday)">Ver reflexión</button>`
      : `<button class="gen-btn pe pe4" id="gen-btn" onclick="window._generateRefl()" ${selMood ? '' : 'disabled'}>Generar reflexión</button>`;

    h += `
    <div class="section-label pe pe1">¿Cómo estuvo el día?</div>
    <div class="mood-grid pe pe1">
      ${MOODS.map(m => `<div class="mood-btn${selMood===m.id?' sel':''}" data-mood="${m.id}" onclick="window._pickMood('${m.id}')"><span class="mood-face">${m.face}</span><span class="mood-word">${m.word}</span></div>`).join('')}
    </div>
    <div class="section-label pe pe2">Journal libre</div>
    <div class="journal-field-wrap pe pe2">
      <textarea class="journal-field" id="journal-text" placeholder="¿Qué pesó? ¿Qué fluyó? Sin filtros.">${existing?.journalText || ''}</textarea>
    </div>
    <div class="journal-field-wrap pe pe3" style="margin-bottom:10px">
      <textarea class="journal-field" id="dream-text" placeholder="¿Qué sueños o metas tienes en mente?" style="min-height:64px">${existing?.dreamText || ''}</textarea>
    </div>
    <div class="task-summary pe pe3">
      <span class="task-summary-lbl">Tareas completadas hoy</span>
      <span class="task-summary-val">${todayDone}/${todayTotal} · ${pct}%</span>
    </div>
    ${btnHtml}`;
  } else {
    h += `<div class="readonly-note pe pe1" style="margin:0 14px 16px"><p>El diario se activa en la noche — tu ritual de cierre antes de dormir.</p></div>`;
    if (existing) {
      h += `<button class="gen-btn is-view pe pe2" style="margin-bottom:8px" onclick="openReflModal(window._reflToday)">Ver reflexión de hoy</button>`;
    }
  }

  if (past.length) {
    h += `
    <div class="section-label pe pe4" style="${isNight ? 'margin-top:16px' : ''}">Entradas anteriores</div>
    <div class="card pe pe5"><div class="card-inner">
      ${past.map(j => {
        const m   = MOODS.find(x => x.id === j.mood) || MOODS[1];
        const d   = new Date(j.date + 'T12:00:00');
        const prv = j.reflection ? j.reflection.slice(0, 80) + '…' : j.journalText?.slice(0, 80) || '';
        return `<div class="past-entry" data-jid="${j.id}" onclick="window._openPastRefl('${j.id}')" style="cursor:pointer">
          <span class="past-face">${m.face}</span>
          <div class="past-body">
            <div class="past-date">${DN[d.getDay()]} ${d.getDate()} ${MN[d.getMonth()]} · ${j.tasksCompleted||0}/${j.tasksTotal||0}</div>
            <div class="past-preview">${esc(prv)}</div>
          </div>
        </div>`;
      }).join('')}
    </div></div>`;
  }

  h += `<div style="height:24px"></div>`;
  el.innerHTML = h;

  /* restaurar mood si ya existe entrada de hoy */
  if (existing && isNight) {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('sel', b.dataset.mood === existing.mood));
  }

  /* exponer openReflModal globalmente para inline handlers */
  window.openReflModal  = openReflModal;
  window._reflToday     = journals.find(j => j.date === todayStr()) || null;
}
