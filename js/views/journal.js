/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — views/journal.js
   Diario unificado: Ideas 24/7 + Reflexión opcional
   ═══════════════════════════════════════════════ */

import {
  tasks, thoughts, journals, selMood,
  todayStr,
  setReflToday, esc,
  MOODS, DN, MN,
} from '../state.js';

const upSvg = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="7" y1="12" x2="7" y2="2" stroke="white" stroke-width="1.8" stroke-linecap="round"/><polyline points="3,6 7,2 11,6" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function renderJournal() {
  const el       = document.getElementById('view-journal');
  const today    = todayStr();
  const existing = journals.find(j => j.date === today) || null;
  const past     = journals.filter(j => j.date !== today).slice(0, 7);
  const todayTasks = tasks.filter(t => t.date === today);
  const todayDone  = todayTasks.filter(t => t.done).length;
  const todayTotal = todayTasks.length;
  const pct        = todayTotal ? Math.round(todayDone / todayTotal * 100) : 0;
  const todayTh    = thoughts.filter(t => t.date === today);

  setReflToday(existing || null);

  let h = `<div class="page-header pe"><div class="page-title">Diario</div><div class="page-sub">Captura ideas y cierra el día.</div></div>`;

  /* ── IDEAS DE HOY — siempre visible, 24/7 ── */
  h += `
    <div class="section-label pe pe1">Ideas de hoy</div>
    <div class="ideas-wrap pe pe1">
      <div class="ideas-ta-row">
        <textarea class="ideas-ta" id="journal-cap-ta" placeholder="Anota cualquier idea..." rows="1"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';document.getElementById('journal-cap-send').classList.toggle('ready',this.value.trim().length>0)"></textarea>
        <button class="ideas-send" id="journal-cap-send" onclick="kedo._saveThought()">${upSvg}</button>
      </div>
      <div class="thought-chips" id="journal-thought-chips">
        ${todayTh.map(th => `
          <div class="thought-chip" data-thid="${th.id}">
            <span class="thought-chip-txt">${esc(th.text)}</span>
            <span class="thought-chip-x" onclick="kedo._delThought('${th.id}')">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <line x1="1.5" y1="1.5" x2="6.5" y2="6.5" stroke="var(--text3)" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="6.5" y1="1.5" x2="1.5" y2="6.5" stroke="var(--text3)" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </span>
          </div>`).join('')}
      </div>
    </div>`;

  /* ── REFLEXIÓN — siempre visible, opcional ── */
  const btnHtml = existing
    ? `<button class="gen-btn is-view pe pe4" id="gen-btn" onclick="kedo.openReflModal(kedo._reflToday)">Ver reflexión</button>`
    : `<button class="gen-btn pe pe4" id="gen-btn" onclick="kedo._generateRefl()" ${selMood ? '' : 'disabled'}>Generar reflexión</button>`;

  h += `
    <div class="section-label pe pe2" style="margin-top:18px">¿Cómo estuvo el día?</div>
    <div class="mood-grid pe pe2">
      ${MOODS.map(m => `<div class="mood-btn${selMood===m.id?' sel':''}" data-mood="${m.id}" onclick="kedo._pickMood('${m.id}')"><span class="mood-face">${m.face}</span><span class="mood-word">${m.word}</span></div>`).join('')}
    </div>
    <div class="section-label pe pe3">Journal libre</div>
    <div class="journal-field-wrap pe pe3">
      <textarea class="journal-field" id="journal-text" placeholder="¿Qué pesó? ¿Qué fluyó? Sin filtros.">${existing?.journalText || ''}</textarea>
    </div>
    <div class="journal-field-wrap pe pe3" style="margin-bottom:10px">
      <textarea class="journal-field" id="dream-text" placeholder="¿Qué sueños o metas tienes en mente?" style="min-height:64px">${existing?.dreamText || ''}</textarea>
    </div>
    <div class="task-summary pe pe4">
      <span class="task-summary-lbl">Tareas completadas hoy</span>
      <span class="task-summary-val">${todayDone}/${todayTotal} · ${pct}%</span>
    </div>
    ${btnHtml}`;

  if (past.length) {
    h += `
    <div class="section-label pe pe4" style="margin-top:16px">Entradas anteriores</div>
    <div class="card pe pe5"><div class="card-inner">
      ${past.map(j => {
        const m   = MOODS.find(x => x.id === j.mood) || MOODS[1];
        const d   = new Date(j.date + 'T12:00:00');
        const prv = j.reflection ? j.reflection.slice(0, 80) + '…' : j.journalText?.slice(0, 80) || '';
        return `<div class="past-entry" data-jid="${j.id}" onclick="kedo._openPastRefl('${j.id}')" style="cursor:pointer">
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
  if (existing) {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('sel', b.dataset.mood === existing.mood));
  }

  /* actualizar _reflToday en el namespace para que "Ver reflexión" use la entrada de hoy */
  window.kedo._reflToday = journals.find(j => j.date === todayStr()) || null;
}
