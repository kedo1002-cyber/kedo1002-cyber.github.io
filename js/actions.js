/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — actions.js
   Lógica de negocio + event handlers
   ═══════════════════════════════════════════════ */

import {
  tasks, thoughts, history, events, journals,
  setTasks, setThoughts, setHistory, setEvents, setJournals,
  selArea, selBlock, selEventArea, selMood,
  setSelArea, setSelBlock, setSelEventArea, setSelMood,
  _nightArea, _nightBlock, setNightArea, setNightBlock,
  setReflToday,
  save, todayStr, pad, hour, blockId, getArea,
  CHK, AREAS, BLOCKS, MOODS, LDN, LMN,
} from './state.js';
import { fireBurst } from './particles.js';
import { buildReflection } from './reflection.js';
import { getHabitsSummary } from './habits.js';
// renderView se inyecta desde app.js para evitar import circular (router→views→actions→router)
let _renderView = () => {};
export function setRenderViewFn(fn) { _renderView = fn; }

const _togglingIds = new Set();

/* ── TASK TOGGLE ── */
export function toggleTask(id) {
  if (_togglingIds.has(id)) return;
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const completing = !t.done;
  t.done = !t.done;
  save();

  if (completing) {
    _togglingIds.add(id);
    const el = document.querySelector(`[data-tid="${id}"]`);
    if (el) {
      const chk = el.querySelector('.check');
      if (chk) {
        chk.classList.add('done'); chk.innerHTML = CHK; chk.classList.add('popping');
        chk.addEventListener('animationend', () => chk.classList.remove('popping'), { once: true });
      }
      const r = el.getBoundingClientRect();
      fireBurst(r.left + r.width / 2, r.top + r.height / 2, 'task');
      el.classList.add('burning');
      el.addEventListener('animationend', () => {
        el.classList.remove('burning');
        el.classList.add('done');
        const tBl = t.block; /* bloque de la tarea, no del horario actual */
        const bt  = tasks.filter(tt => tt.block === tBl && tt.date === todayStr());
        const dn  = bt.filter(tt => tt.done).length;
        const tot = bt.length;
        const pct = tot ? Math.round(dn / tot * 100) : 0;
        const progFill = document.querySelector(`#view-home .progress-wrap[data-block="${tBl}"] .prog-fill`);
        const progTxt  = document.querySelector(`#view-home .progress-wrap[data-block="${tBl}"] .prog-txt`);
        if (progFill) progFill.style.width = pct + '%';
        if (progTxt)  progTxt.textContent  = dn + '/' + tot;
        if (!progFill) {
          const vh = document.getElementById('view-home');
          const sy = vh ? vh.scrollTop : 0;
          _renderView('home');
          if (vh) vh.scrollTop = sy;
        }
        _togglingIds.delete(id);
      }, { once: true });
      return;
    }
    _togglingIds.delete(id);
  }
  /* Un-toggle (desmarcar): actualización quirúrgica sin re-render completo */
  const taskEl = document.querySelector(`[data-tid="${id}"]`);
  if (taskEl) {
    taskEl.classList.remove('done');
    const chk = taskEl.querySelector('.check');
    if (chk) { chk.classList.remove('done'); chk.innerHTML = ''; }
    const tBl2 = t.block; /* bloque de la tarea */
    const bt2  = tasks.filter(tt => tt.block === tBl2 && tt.date === todayStr());
    const dn2  = bt2.filter(tt => tt.done).length;
    const tot2 = bt2.length;
    const pct2 = tot2 ? Math.round(dn2 / tot2 * 100) : 0;
    const progFill2 = document.querySelector(`#view-home .progress-wrap[data-block="${tBl2}"] .prog-fill`);
    const progTxt2  = document.querySelector(`#view-home .progress-wrap[data-block="${tBl2}"] .prog-txt`);
    if (progFill2) progFill2.style.width = pct2 + '%';
    if (progTxt2)  progTxt2.textContent  = dn2 + '/' + tot2;
  } else {
    /* fallback: el elemento no está en el DOM (edge case) */
    const vh = document.getElementById('view-home');
    const sy = vh ? vh.scrollTop : 0;
    _renderView('home');
    if (vh) requestAnimationFrame(() => { vh.scrollTop = sy; });
  }
}

/* ── TASK SWIPE DELETE ── */
export function deleteTaskById(id) {
  setTasks(tasks.filter(t => t.id !== id));
  save();
  const vh = document.getElementById('view-home');
  const sy = vh ? vh.scrollTop : 0;
  _renderView('home');
  if (vh) vh.scrollTop = sy;
}

/* ── EDIT TASK ── */
export function editTaskText(id, newText) {
  const t = tasks.find(x => x.id === id);
  if (!t || !newText.trim()) return;
  t.text = newText.trim();
  save();
  const vh = document.getElementById('view-home');
  const sy = vh ? vh.scrollTop : 0;
  _renderView('home');
  if (vh) vh.scrollTop = sy;
}

/* ── ADD TASK ── */
export function addTask() {
  const inp = document.getElementById('nti');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  setTasks([...tasks, { id: Date.now() + '', text, area: selArea, block: selBlock, done: false, date: todayStr() }]);
  save();
  _renderView('home');
}

/* ── THOUGHTS ── */
export function saveThought() {
  const inp = document.getElementById('cap-ta');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  setThoughts([...thoughts, { id: Date.now() + '', text, date: todayStr() }]);
  inp.value = '';
  save();
  _renderView('home');
}

export function delThought(id) {
  setThoughts(thoughts.filter(t => t.id !== id));
  save();
  _renderView('home');
}

/* ── AREA / BLOCK SELECTORS ── */
export function pickArea(id) {
  setSelArea(id);
  const form = document.getElementById('task-form');
  if (!form) { renderTaskForm(); return; }
  form.querySelectorAll('.pill[data-aid]').forEach(pill => {
    const a = getArea(pill.dataset.aid);
    const sel = pill.dataset.aid === id;
    pill.style.background  = sel ? a.bg    : '';
    pill.style.borderColor = sel ? a.color : '';
    pill.style.color       = sel ? a.tc    : '';
    pill.style.fontWeight  = sel ? '500'   : '';
  });
}
export function pickBlock(id) {
  setSelBlock(id);
  const form = document.getElementById('task-form');
  if (!form) { renderTaskForm(); return; }
  form.querySelectorAll('.pill[data-bid]').forEach(pill => {
    pill.classList.toggle('sel-block', pill.dataset.bid === id);
  });
}

/* ── NIGHT PLANNER ── */
export function pickNightArea(id) {
  setNightArea(id);
  document.querySelectorAll('.area-chip').forEach(c => {
    const a = getArea(c.dataset.aid);
    const isSel = c.dataset.aid === id;
    c.classList.toggle('sel', isSel);
    c.style.background   = isSel ? a.bg   : '';
    c.style.color        = isSel ? a.tc   : '';
    c.style.borderColor  = isSel ? a.color : '';
  });
}
export function pickNightBlock(id) {
  setNightBlock(id);
  document.querySelectorAll('.block-seg').forEach(s => s.classList.toggle('sel', s.dataset.bid === id));
}
/* Fecha de planificación nocturna: si ya pasó la medianoche (0–5h), "mañana" = hoy */
function nightPlanDs() {
  const now = new Date(), tm = new Date(now);
  if (now.getHours() >= 6) tm.setDate(tm.getDate() + 1);
  return `${tm.getFullYear()}-${pad(tm.getMonth()+1)}-${pad(tm.getDate())}`;
}
export function addNightTask() {
  const inp = document.getElementById('plan-inp');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  const ds = nightPlanDs();
  setTasks([...tasks, { id: 't' + Date.now(), text, area: _nightArea, block: _nightBlock, done: false, date: ds }]);
  inp.value = '';
  save();
  updatePlannedList();
  navigator.vibrate && navigator.vibrate(12);
}
export function updatePlannedList() {
  const el = document.getElementById('planned-list');
  if (!el) return;
  const ds = nightPlanDs();
  const planned = tasks.filter(t => t.date === ds);
  if (!planned.length) { el.innerHTML = ''; return; }
  el.innerHTML = planned.map(t => {
    const a = getArea(t.area);
    const bLbl = ({ morning:'Mañana', afternoon:'Tarde', night:'Noche' })[t.block] || t.block;
    return `<div class="planned-item" data-pid="${t.id}">
      <div class="planned-item-pip" style="background:${a.color}"></div>
      <span class="planned-item-txt">${t.text}</span>
      <span class="planned-item-block">${bLbl}</span>
      <span class="planned-item-del" onclick="window._delPlanned('${t.id}',this)">×</span>
    </div>`;
  }).join('');
}
export function delPlanned(id, btn) {
  const item = btn?.closest('.planned-item');
  if (item) {
    if (item.dataset.deleting) return;
    item.dataset.deleting = '1';
    item.style.transition = 'opacity 0.18s,transform 0.18s';
    item.style.opacity = '0'; item.style.transform = 'scale(0.94)';
    setTimeout(() => { setTasks(tasks.filter(t => t.id !== id)); save(); updatePlannedList(); }, 200);
  } else { setTasks(tasks.filter(t => t.id !== id)); save(); updatePlannedList(); }
}

export function saveCapture2() {
  const inp = document.getElementById('ideas-ta');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  setThoughts([...thoughts, { id: 'th' + Date.now(), text, date: todayStr() }]);
  inp.value = ''; inp.style.height = '';
  const btn = document.getElementById('ideas-send');
  if (btn) btn.classList.remove('ready');
  save(); updateThoughtsList();
}
export function updateThoughtsList() {
  const el = document.getElementById('thought-chips');
  if (!el) return;
  const today = todayStr();
  const ts = thoughts.filter(t => t.date === today);
  if (!ts.length) { el.innerHTML = ''; return; }
  el.innerHTML = ts.map(th => `
    <div class="thought-chip" data-thid="${th.id}">
      <span class="thought-chip-txt">${th.text}</span>
      <span class="thought-chip-x" onclick="window._delThought2('${th.id}',this)">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <line x1="1.5" y1="1.5" x2="6.5" y2="6.5" stroke="var(--text3)" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="6.5" y1="1.5" x2="1.5" y2="6.5" stroke="var(--text3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </span>
    </div>`).join('');
}
export function delThought2(id, btn) {
  const chip = btn?.closest('.thought-chip');
  if (chip) {
    if (chip.dataset.deleting) return;
    chip.dataset.deleting = '1';
    chip.style.transition = 'opacity 0.18s,transform 0.18s';
    chip.style.opacity = '0'; chip.style.transform = 'scale(0.82)';
    setTimeout(() => { setThoughts(thoughts.filter(t => t.id !== id)); save(); updateThoughtsList(); }, 185);
  } else { setThoughts(thoughts.filter(t => t.id !== id)); save(); updateThoughtsList(); }
}

/* ── EVENTS ── */
export function addEvent() {
  const tEl = document.getElementById('ev-title'), dEl = document.getElementById('ev-date');
  if (!tEl || !dEl) return;
  const text = tEl.value.trim(), date = dEl.value;
  if (!text || !date || date < todayStr()) return;
  setEvents([...events, { id: 'e' + Date.now(), title: text, area: selEventArea, date }].sort((a,b) => a.date > b.date ? 1 : -1));
  save(); tEl.value = ''; dEl.value = '';
  _renderView('agenda');
}
export function delEvent(id) { setEvents(events.filter(e => e.id !== id)); save(); _renderView('agenda'); }
export function pickEventArea(id) {
  setSelEventArea(id);
  /* actualización quirúrgica: solo cambia estilos de los pills, sin tocar los inputs */
  const form = document.getElementById('event-form-inner');
  if (!form) { renderEventForm(); return; }
  form.querySelectorAll('.pill[data-aid]').forEach(pill => {
    const a = getArea(pill.dataset.aid);
    const sel = pill.dataset.aid === id;
    pill.style.background  = sel ? a.bg    : '';
    pill.style.borderColor = sel ? a.color : '';
    pill.style.color       = sel ? a.tc    : '';
    pill.style.fontWeight  = sel ? '500'   : '';
  });
}

/* ── FORM RENDERERS ── */
export function renderTaskForm() {
  const el = document.getElementById('task-form');
  if (!el) return;
  el.innerHTML = `
    <input class="form-input" id="nti" placeholder="¿Qué vas a hacer?" onkeydown="if(event.key==='Enter')window._addTask()">
    <div class="pill-group">${AREAS.map(a => `<span class="pill" data-aid="${a.id}" style="${selArea===a.id?`background:${a.bg};border-color:${a.color};color:${a.tc};font-weight:500`:''}" onclick="window._pickArea('${a.id}')">${a.label}</span>`).join('')}</div>
    <div class="pill-group">${BLOCKS.map(b => `<span class="pill${selBlock===b.id?' sel-block':''}" data-bid="${b.id}" onclick="window._pickBlock('${b.id}')">${b.label}</span>`).join('')}</div>
    <button class="add-btn" onclick="window._addTask()">Agregar tarea</button>`;
}
export function renderEventForm() {
  const el = document.getElementById('event-form-inner');
  if (!el) return;
  el.innerHTML = `
    <input class="form-input" id="ev-title" placeholder="Nombre del evento, examen..." onkeydown="if(event.key==='Enter')document.getElementById('ev-date')?.focus()">
    <input class="date-field" type="date" id="ev-date" min="${todayStr()}">
    <div class="pill-group" style="margin-bottom:10px">${AREAS.map(a => `<span class="pill" data-aid="${a.id}" style="${selEventArea===a.id?`background:${a.bg};border-color:${a.color};color:${a.tc};font-weight:500`:''}" onclick="window._pickEventArea('${a.id}')">${a.label}</span>`).join('')}</div>
    <button class="add-btn" onclick="window._addEvent()">Agregar evento</button>`;
}

/* ── MOOD ── */
export function pickMood(id) {
  setSelMood(id);
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('sel', b.dataset.mood === id));
  const btn = document.getElementById('gen-btn');
  if (btn) btn.disabled = false;
}

/* ── REFLECTION GENERATION ── */
export function generateReflection() {
  const journalText = document.getElementById('journal-text')?.value?.trim() || '';
  const dreamText   = document.getElementById('dream-text')?.value?.trim()   || '';
  const today         = todayStr();
  const todayTasks    = tasks.filter(t => t.date === today);
  const todayDone     = todayTasks.filter(t => t.done).length;
  const todayTotal    = todayTasks.length;
  const doneTitles    = todayTasks.filter(t => t.done).map(t => t.text).slice(0, 3);
  const pendingTitles = todayTasks.filter(t => !t.done).map(t => t.text).slice(0, 3);
  const pct = todayTotal ? Math.round(todayDone / todayTotal * 100) : 0;
  const btn = document.getElementById('gen-btn');
  if (btn) btn.disabled = true;

  /* construir mapa de áreas */
  const tasksByArea = {};
  tasks.filter(t => t.done).forEach(t => { tasksByArea[t.area] = (tasksByArea[t.area] || 0) + 1; });

  /* obtener resumen de hábitos */
  const habitsData = getHabitsSummary();

  const text = buildReflection({
    moodId: selMood || 'good', pct, todayDone, todayTotal,
    doneTitles, pendingTitles, journalText, habitsData, tasksByArea,
  });

  const entry = {
    id: 'j' + Date.now(), date: today, mood: selMood,
    journalText, dreamText, reflection: text,
    tasksCompleted: todayDone, tasksTotal: todayTotal,
  };
  setJournals([...journals.filter(j => j.date !== today), entry].sort((a,b) => b.date > a.date ? 1 : -1));
  save();
  setReflToday(entry);

  openReflModal(entry);

  if (btn) {
    btn.textContent = 'Ver reflexión';
    btn.disabled = false;
    btn.classList.add('is-view');
    btn.onclick = () => openReflModal(entry);
  }
}

/* ── MODAL REFLEXIÓN ── */
export function openReflModal(entry) {
  const overlay = document.getElementById('refl-overlay');
  const content = document.getElementById('refl-modal-content');
  if (!overlay || !content) return;
  content.innerHTML = buildReflModalHTML(entry);
  const okBtn = document.getElementById('refl-ok-btn');
  if (okBtn) { okBtn.disabled = false; okBtn.style.opacity = ''; }
  overlay.classList.remove('closing');
  overlay.offsetHeight;
  overlay.classList.add('open');
}
export function openReflModalLoading() {
  const overlay = document.getElementById('refl-overlay');
  const content = document.getElementById('refl-modal-content');
  if (!overlay || !content) return;
  content.innerHTML = `
    <div class="refl-modal-pill"></div>
    <div style="padding:44px 0 28px;text-align:center">
      <div class="loading-dots"><span></span><span></span><span></span></div>
      <div style="font-size:13px;color:var(--text3);margin-top:16px">Procesando tu día...</div>
    </div>`;
  const okBtn = document.getElementById('refl-ok-btn');
  if (okBtn) { okBtn.disabled = true; okBtn.style.opacity = '0.3'; }
  overlay.classList.remove('closing');
  overlay.offsetHeight;
  overlay.classList.add('open');
}
export function closeReflModal() {
  const overlay = document.getElementById('refl-overlay');
  if (!overlay) return;
  overlay.classList.add('closing');
  setTimeout(() => overlay.classList.remove('open', 'closing'), 280);
}
export function openPastRefl(id) {
  const entry = journals.find(j => j.id === id);
  if (entry) openReflModal(entry);
}

function buildReflModalHTML(entry) {
  const m    = MOODS.find(x => x.id === entry.mood) || MOODS[1];
  const pct  = entry.tasksTotal ? Math.round(entry.tasksCompleted / entry.tasksTotal * 100) : 0;
  const d    = new Date(entry.date + 'T12:00:00');
  const ds   = `${LDN[d.getDay()]} ${d.getDate()} de ${LMN[d.getMonth()]}`;
  return `
    <div class="refl-modal-pill"></div>
    <div class="refl-modal-head">
      <div class="refl-modal-face">${m.face}</div>
      <div class="refl-modal-meta">
        <div class="refl-modal-meta-date">${ds}</div>
        <div class="refl-modal-meta-mood">${m.word}</div>
        <div class="refl-modal-meta-stats">${entry.tasksCompleted}/${entry.tasksTotal} tareas · ${pct}%</div>
      </div>
    </div>
    <div class="refl-modal-div"></div>
    <div class="refl-modal-body">${entry.reflection}</div>
    ${entry.journalText ? `
      <div class="refl-modal-div"></div>
      <div class="refl-modal-journal">"${entry.journalText.slice(0,220)}${entry.journalText.length>220?'…':''}"</div>
    ` : ''}
    <div style="height:8px"></div>`;
}

/* ── SWIPE DELETE + LONG PRESS ── */
let _swipeState = { el:null, startX:0, startY:0, dx:0, locked:false, on:false, fired:false, tid:null };
let _longPressTimer = null;
let _undoData = null; // { tid, task, deleteTimer }

export function initTaskGestures(container) {
  if (!container) return;

  container.addEventListener('touchstart', e => {
    const taskEl = e.target.closest('.task[data-tid]');
    if (!taskEl || taskEl.classList.contains('done')) return;
    const tid = taskEl.dataset.tid;
    const touch = e.touches[0];
    _swipeState = { el: taskEl, startX: touch.clientX, startY: touch.clientY, dx: 0, locked: false, on: false, fired: false, tid };
    taskEl.style.transition = '';

    /* long press: 500ms → modal de edición */
    _longPressTimer = setTimeout(() => {
      if (!_swipeState.on) openEditModal(tid);
    }, 500);
  }, { passive: true });

  container.addEventListener('touchmove', e => {
    if (!_swipeState.el) return;
    clearTimeout(_longPressTimer);
    const dx = e.touches[0].clientX - _swipeState.startX;
    const dy = e.touches[0].clientY - _swipeState.startY;
    if (_swipeState.locked) return;
    if (!_swipeState.on) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (Math.abs(dy) > Math.abs(dx)) { _swipeState.locked = true; return; }
      if (dx < 0) _swipeState.on = true; else { _swipeState.locked = true; return; }
    }
    e.preventDefault();
    _swipeState.dx = dx;
    const tx = Math.max(dx, -140);
    _swipeState.el.style.transform = `translateX(${tx}px)`;
    const bd = _swipeState.el.querySelector('.task-delete-backdrop');
    if (bd) bd.style.opacity = String(Math.min(Math.abs(dx) / 90, 1));
    if (Math.abs(dx) >= 90 && !_swipeState.fired) {
      _swipeState.fired = true;
      navigator.vibrate && navigator.vibrate(30);
    }
  }, { passive: false });

  container.addEventListener('touchend', () => {
    clearTimeout(_longPressTimer);
    if (!_swipeState.el || _swipeState.locked || !_swipeState.on) { resetSwipe(); return; }
    if (Math.abs(_swipeState.dx) >= 90) {
      commitDeleteTask(_swipeState.el, _swipeState.tid);
    } else {
      _swipeState.el.style.transition = 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1)';
      _swipeState.el.style.transform = '';
      const bd = _swipeState.el.querySelector('.task-delete-backdrop');
      if (bd) bd.style.opacity = '0';
      setTimeout(() => { if (_swipeState.el) _swipeState.el.style.transition = ''; resetSwipe(); }, 400);
      return;
    }
    resetSwipe();
  }, { passive: true });
}

function resetSwipe() { _swipeState = { el:null, startX:0, startY:0, dx:0, locked:false, on:false, fired:false, tid:null }; }

function commitDeleteTask(el, tid) {
  const taskSnapshot = tasks.find(t => t.id === tid);
  el.style.transition = 'transform 0.28s ease-in, opacity 0.22s ease-out';
  el.style.transform = 'translateX(-110%)';
  el.style.opacity   = '0';
  el.style.pointerEvents = 'none';
  const deleteTimer = setTimeout(() => { deleteTaskById(tid); _undoData = null; }, 3200);
  _undoData = { tid, task: taskSnapshot ? { ...taskSnapshot } : null, deleteTimer };
  showUndoToast(tid, el.querySelector('.task-text')?.textContent || '');
}

function showUndoToast(tid, label) {
  let toast = document.getElementById('undo-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'undo-toast';
    toast.className = 'undo-toast';
    document.querySelector('.app').appendChild(toast);
  }
  toast.innerHTML = `<span>Tarea eliminada</span><button onclick="window._undoDelete('${tid}')">Deshacer</button>`;
  toast.classList.add('visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('visible'), 2800);
}

/* ── EDIT MODAL (long press) ── */
function openEditModal(tid) {
  const t = tasks.find(x => x.id === tid);
  if (!t) return;
  navigator.vibrate && navigator.vibrate([6, 30, 6]);
  let modal = document.getElementById('edit-task-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'edit-task-modal';
    modal.className = 'edit-modal-overlay';
    modal.innerHTML = `
      <div class="edit-modal">
        <div class="edit-modal-bar"></div>
        <div class="edit-modal-label">Editar tarea</div>
        <input class="edit-modal-input" id="edit-task-input" type="text">
        <div class="edit-modal-btns">
          <button class="edit-cancel-btn" onclick="window._closeEditModal()">Cancelar</button>
          <button class="edit-save-btn" onclick="window._saveEditModal()">Guardar</button>
        </div>
      </div>`;
    document.querySelector('.app').appendChild(modal);
  }
  const inp = modal.querySelector('#edit-task-input');
  if (inp) inp.value = t.text;
  modal.dataset.editTid = tid;
  modal.classList.add('open');
  setTimeout(() => inp?.focus(), 80);
}

window._closeEditModal = () => {
  const modal = document.getElementById('edit-task-modal');
  if (modal) modal.classList.remove('open');
};
window._saveEditModal = () => {
  const modal = document.getElementById('edit-task-modal');
  if (!modal) return;
  const tid = modal.dataset.editTid;
  const inp = modal.querySelector('#edit-task-input');
  if (inp && tid) editTaskText(tid, inp.value);
  modal.classList.remove('open');
};

/* ── UNDO DELETE ── */
window._undoDelete = (tid) => {
  const toast = document.getElementById('undo-toast');
  if (toast) { clearTimeout(toast._timer); toast.classList.remove('visible'); }
  if (!_undoData || _undoData.tid !== tid) return;
  clearTimeout(_undoData.deleteTimer);
  if (_undoData.task) {
    if (!tasks.find(t => t.id === tid)) {
      setTasks([...tasks, _undoData.task]);
      save();
    }
    const vh = document.getElementById('view-home');
    const sy = vh ? vh.scrollTop : 0;
    _renderView('home');
    if (vh) vh.scrollTop = sy;
  }
  _undoData = null;
};

/* ── EXPOSE GLOBALS ── */
export function exposeGlobals() {
  window._toggleTask       = toggleTask;
  window._addTask          = addTask;
  window._pickArea         = pickArea;
  window._pickBlock        = pickBlock;
  window._pickNightArea    = pickNightArea;
  window._pickNightBlock   = pickNightBlock;
  window._addNightTask     = addNightTask;
  window._delPlanned       = delPlanned;
  window._saveCapture2     = saveCapture2;
  window._delThought2      = delThought2;
  window._addEvent         = addEvent;
  window._delEvent         = delEvent;
  window._pickEventArea    = pickEventArea;
  window._pickMood         = pickMood;
  window._generateRefl     = generateReflection;
  window._closeReflModal   = closeReflModal;
  window.openReflModal     = openReflModal;
  window._openPastRefl     = openPastRefl;
  window._saveThought      = saveThought;
  window._delThought       = delThought;
}
