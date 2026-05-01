/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — actions.js
   Lógica de negocio + event handlers
   ═══════════════════════════════════════════════ */

import {
  tasks, thoughts, history, events, journals,
  setTasks, setThoughts, setHistory, setEvents, setJournals,
  selArea, selBlock, selEventArea, selMood,
  setSelArea, setSelBlock, setSelEventArea, setSelMood,
  setReflToday,
  save, todayStr, pad, hour, blockId, getArea,
  CHK, AREAS, BLOCKS, MOODS, LDN, LMN, DN, MN,
} from './state.js';
import { fireBurst } from './particles.js';
import { buildReflection } from './reflection.js';
import { getHabitsSummary } from './habits.js';
import { initDrawerSwipe } from './gestures.js';
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

/* ═══════════════════════════════════════════════
   PLAN DRAWER — FAB iOS bottom sheet
   Reemplaza el viejo capture-box / plan nocturno.
   ═══════════════════════════════════════════════ */
/* Preset: 'today' | 'tomorrow' | 'd3' | 'd5' | 'd20' | 'custom' */
let _pPreset = 'today';
let _pCustomDs = null;   /* YYYY-MM-DD cuando _pPreset==='custom' */
let _pBlock = 'morning'; /* se setea al abrir según hora actual */
let _pArea = 'dian';

/* Resolver fecha actual según preset */
function _resolvePlanDs() {
  const now = new Date();
  const d = new Date(now);
  if (_pPreset === 'today')   { /* misma fecha */ }
  else if (_pPreset === 'tomorrow') d.setDate(d.getDate() + 1);
  else if (_pPreset === 'd3') d.setDate(d.getDate() + 3);
  else if (_pPreset === 'd5') d.setDate(d.getDate() + 5);
  else if (_pPreset === 'd20') d.setDate(d.getDate() + 20);
  else if (_pPreset === 'custom' && _pCustomDs) return _pCustomDs;
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

/* Bloques deshabilitados SOLO cuando la fecha resuelve a hoy */
function _disabledBlocksForToday() {
  const ds = _resolvePlanDs();
  if (ds !== todayStr()) return new Set(); /* futuro → todos habilitados */
  const h = hour();
  const cur = blockId(h);
  /* tarde → bloquea mañana; noche → bloquea mañana + tarde */
  if (cur === 'afternoon') return new Set(['morning']);
  if (cur === 'night')     return new Set(['morning', 'afternoon']);
  return new Set();
}

/* Ajustar _pBlock si el actual queda bloqueado por un cambio de fecha */
function _ensureValidBlock() {
  const dis = _disabledBlocksForToday();
  if (dis.has(_pBlock)) {
    /* saltar al primer bloque habilitado */
    const first = BLOCKS.find(b => !dis.has(b.id));
    if (first) _pBlock = first.id;
  }
}

/* Formato corto de fecha para chip custom ("Mié 14 may") */
function _fmtChipDate(ds) {
  if (!ds) return '';
  const d = new Date(ds + 'T12:00:00');
  return `${DN[d.getDay()]} ${d.getDate()} ${MN[d.getMonth()]}`;
}

export function openPlanDrawer() {
  /* defaults inteligentes cada vez que se abre */
  const h = hour();
  _pPreset = 'today';
  _pCustomDs = null;
  _pArea = AREAS[0]?.id || 'dian';
  /* bloque por defecto = bloque actual */
  _pBlock = blockId(h);
  _ensureValidBlock();

  renderPlanDrawer();

  const backdrop = document.getElementById('plan-backdrop');
  const drawer   = document.getElementById('plan-drawer');
  if (!backdrop || !drawer) return;
  backdrop.classList.add('open');
  /* doble RAF garantiza transición desde translateY(110%) */
  requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('open')));
  /* sin autofocus — el border se activa solo cuando el usuario empieza a escribir */
  navigator.vibrate && navigator.vibrate(8);
}

export function closePlanDrawer() {
  const backdrop = document.getElementById('plan-backdrop');
  const drawer   = document.getElementById('plan-drawer');
  if (!drawer || !backdrop) return;
  /* blur input para cerrar teclado iOS */
  document.getElementById('plan-inp')?.blur();
  drawer.classList.remove('open');
  drawer.style.transform = ''; /* limpiar drag transform inline */
  backdrop.classList.remove('open');
}

/* ── renderPlanDrawer: solo se llama al ABRIR el drawer (render inicial) ─── */
export function renderPlanDrawer() {
  const body = document.getElementById('plan-drawer-body');
  if (!body) return;

  body.innerHTML = `
    <input class="plan-input" id="plan-inp" placeholder="¿Qué vas a hacer?"
      onkeydown="if(event.key==='Enter'){event.preventDefault();kedo._addDrawerTask()}">

    <div class="plan-section-lbl">Cuándo</div>
    <div class="plan-chip-row" id="plan-date-chips"></div>

    <div class="plan-section-lbl">Bloque</div>
    <div class="plan-chip-row" id="plan-block-chips"></div>

    <div class="plan-section-lbl">Área</div>
    <div class="plan-chip-row" id="plan-area-chips"></div>

    <button class="plan-submit-btn" onclick="kedo._addDrawerTask()">Agregar tarea</button>
  `;

  _renderDateChips();
  _renderBlockChips();
  _renderAreaChips();
}

/* ── Actualizaciones quirúrgicas: NO tocan el input ─────────────────────── */
function _renderDateChips() {
  const el = document.getElementById('plan-date-chips');
  if (!el) return;
  const isCustom = _pPreset === 'custom';
  /* solo 3 presets: Hoy, Mañana, Otro día */
  const presets = [
    { id: 'today',    label: 'Hoy'    },
    { id: 'tomorrow', label: 'Mañana' },
  ];
  const dateChips = presets.map(p =>
    `<button class="plan-chip${_pPreset===p.id?' sel':''}" onclick="kedo._pickDrawerPreset('${p.id}')">${p.label}</button>`
  ).join('');
  const customChip = `
    <label class="plan-chip plan-chip-custom${isCustom?' has-date':''}" style="position:relative">
      <span>${isCustom && _pCustomDs ? _fmtChipDate(_pCustomDs) : 'Otro día'}</span>
      <span class="plan-chip-chv">›</span>
      <input type="date" class="plan-date-input" min="${todayStr()}"
        value="${_pCustomDs || ''}"
        onchange="kedo._pickDrawerCustomDate(this.value)">
    </label>`;
  el.innerHTML = dateChips + customChip;
}

function _renderBlockChips() {
  const el = document.getElementById('plan-block-chips');
  if (!el) return;
  const dis = _disabledBlocksForToday();
  el.innerHTML = BLOCKS.map(b => {
    const disabled = dis.has(b.id);
    const sel = _pBlock === b.id && !disabled;
    return `<button class="plan-chip${sel?' sel':''}${disabled?' disabled':''}"
      ${disabled ? 'aria-disabled="true"' : `onclick="kedo._pickDrawerBlock('${b.id}')"`}>${b.label}</button>`;
  }).join('');
}

function _renderAreaChips() {
  const el = document.getElementById('plan-area-chips');
  if (!el) return;
  el.innerHTML = AREAS.map(a => {
    const sel = _pArea === a.id;
    const style = sel ? `background:${a.bg};color:${a.tc};border-color:${a.color};font-weight:600` : '';
    return `<button class="plan-area-chip${sel?' sel':''}" style="${style}" onclick="kedo._pickDrawerArea('${a.id}')">${a.label}</button>`;
  }).join('');
}

export function pickDrawerPreset(id) {
  _pPreset = id;
  if (id !== 'custom') _pCustomDs = null;
  _ensureValidBlock();
  _renderDateChips();
  _renderBlockChips();   /* disabled state puede cambiar */
}

export function pickDrawerCustomDate(value) {
  if (!value || value < todayStr()) return;
  _pPreset = 'custom';
  _pCustomDs = value;
  _ensureValidBlock();
  _renderDateChips();
  _renderBlockChips();
}

export function pickDrawerBlock(id) {
  const dis = _disabledBlocksForToday();
  if (dis.has(id)) return;
  _pBlock = id;
  _renderBlockChips();
}

export function pickDrawerArea(id) {
  _pArea = id;
  _renderAreaChips();
}

export function addDrawerTask() {
  const inp = document.getElementById('plan-inp');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) {
    inp.focus();
    navigator.vibrate && navigator.vibrate([6, 40, 6]);
    /* shake visual */
    inp.style.transition = 'transform 0.28s var(--spring)';
    inp.style.transform = 'translateX(-4px)';
    setTimeout(() => { inp.style.transform = 'translateX(4px)'; }, 90);
    setTimeout(() => { inp.style.transform = ''; }, 180);
    return;
  }
  const ds = _resolvePlanDs();
  setTasks([...tasks, {
    id: 't' + Date.now(),
    text,
    area: _pArea,
    block: _pBlock,
    done: false,
    date: ds,
  }]);
  save();
  navigator.vibrate && navigator.vibrate(14);
  closePlanDrawer();
  /* re-render home tras el close anim para que aparezca la tarea */
  setTimeout(() => _renderView('home'), 60);
}

/* ── SWIPE DOWN TO CLOSE DRAWER ── */
export function initPlanDrawerSwipe() {
  initDrawerSwipe({
    handleId:  'plan-handle-wrap',
    drawerId:  'plan-drawer',
    backdropId:'plan-backdrop',
    onClose:    closePlanDrawer,
  });
}

/* ── THOUGHTS (Ideas de hoy — ahora viven en Diario, 24/7) ── */
export function saveThought() {
  const inp = document.getElementById('journal-cap-ta');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  setThoughts([...thoughts, { id: 'th' + Date.now(), text, date: todayStr() }]);
  inp.value = '';
  inp.style.height = '';
  const btn = document.getElementById('journal-cap-send');
  if (btn) btn.classList.remove('ready');
  save();
  _renderView('journal');
}

export function delThought(id) {
  setThoughts(thoughts.filter(t => t.id !== id));
  save();
  _renderView('journal');
}

/* ── EVENTS ── */
export function addEvent() {
  const tEl = document.getElementById('ev-title'), dEl = document.getElementById('ev-date');
  if (!tEl || !dEl) return;
  const text = tEl.value.trim(), date = dEl.value;
  if (!text || !date || date < todayStr()) return;
  const startTime = document.getElementById('ev-start')?.value || '';
  const endTime   = document.getElementById('ev-end')?.value   || '';
  setEvents([...events, { id: 'e' + Date.now(), title: text, area: selEventArea, date, startTime, endTime }].sort((a,b) => a.date > b.date ? 1 : -1));
  save(); tEl.value = ''; dEl.value = '';
  const sEl = document.getElementById('ev-start'), eEl = document.getElementById('ev-end');
  if (sEl) sEl.value = ''; if (eEl) eEl.value = '';
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

/* ── EVENT FORM (agenda) ── */
function _onTimeChange(inputId, lblId) {
  const v = document.getElementById(inputId)?.value;
  const lbl = document.getElementById(lblId);
  if (!lbl) return;
  if (v) {
    const [h, m] = v.split(':').map(Number);
    lbl.textContent = `${h%12||12}:${String(m).padStart(2,'0')}${h>=12?'pm':'am'}`;
    lbl.classList.add('set');
  } else {
    lbl.textContent = 'Sin hora';
    lbl.classList.remove('set');
  }
}

export function renderEventForm() {
  const el = document.getElementById('event-form-inner');
  if (!el) return;
  el.innerHTML = `
    <input class="form-input" id="ev-title" placeholder="Nombre del evento, examen..." onkeydown="if(event.key==='Enter')document.getElementById('ev-date')?.focus()">
    <input class="date-field" type="date" id="ev-date" min="${todayStr()}">
    <div class="ev-when-wrap">
      <div class="ev-when-row">
        <span class="ev-when-lbl">Inicio</span>
        <span class="ev-when-val" id="ev-start-lbl">Sin hora</span>
        <span class="ev-when-chv">›</span>
        <input type="time" id="ev-start" class="ev-when-input" onchange="kedo._onTimeChange('ev-start','ev-start-lbl')">
      </div>
      <div class="ev-when-sep"></div>
      <div class="ev-when-row">
        <span class="ev-when-lbl">Fin <span class="ev-when-opt">opcional</span></span>
        <span class="ev-when-val" id="ev-end-lbl">Sin hora</span>
        <span class="ev-when-chv">›</span>
        <input type="time" id="ev-end" class="ev-when-input" onchange="kedo._onTimeChange('ev-end','ev-end-lbl')">
      </div>
    </div>
    <div class="pill-group" style="margin-bottom:10px">${AREAS.map(a => `<span class="pill" data-aid="${a.id}" style="${selEventArea===a.id?`background:${a.bg};border-color:${a.color};color:${a.tc};font-weight:500`:''}" onclick="kedo._pickEventArea('${a.id}')">${a.label}</span>`).join('')}</div>
    <button class="add-btn" onclick="kedo._addEvent()">Agregar evento</button>`;
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
    if (!e.touches.length) return;
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
  toast.innerHTML = `<span>Tarea eliminada</span><button onclick="kedo._undoDelete('${tid}')">Deshacer</button>`;
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
          <button class="edit-cancel-btn" onclick="kedo._closeEditModal()">Cancelar</button>
          <button class="edit-save-btn" onclick="kedo._saveEditModal()">Guardar</button>
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

function _closeEditModal() {
  const modal = document.getElementById('edit-task-modal');
  if (modal) modal.classList.remove('open');
}
function _saveEditModal() {
  const modal = document.getElementById('edit-task-modal');
  if (!modal) return;
  const tid = modal.dataset.editTid;
  const inp = modal.querySelector('#edit-task-input');
  if (inp && tid) editTaskText(tid, inp.value);
  modal.classList.remove('open');
}

/* ── UNDO DELETE ── */
function _undoDelete(tid) {
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
}

/* ── EXPOSE GLOBALS ── */
export function exposeGlobals() {
  const k = window.kedo;
  k._toggleTask          = toggleTask;
  /* Plan drawer */
  k._openPlanDrawer      = openPlanDrawer;
  k._closePlanDrawer     = closePlanDrawer;
  k._pickDrawerPreset    = pickDrawerPreset;
  k._pickDrawerCustomDate = pickDrawerCustomDate;
  k._pickDrawerBlock     = pickDrawerBlock;
  k._pickDrawerArea      = pickDrawerArea;
  k._addDrawerTask       = addDrawerTask;
  /* Events */
  k._addEvent            = addEvent;
  k._delEvent            = delEvent;
  k._pickEventArea       = pickEventArea;
  /* Journal */
  k._pickMood            = pickMood;
  k._generateRefl        = generateReflection;
  k._closeReflModal      = closeReflModal;
  k.openReflModal        = openReflModal;
  k._openPastRefl        = openPastRefl;
  k._saveThought         = saveThought;
  k._delThought          = delThought;
  /* Inline handlers (formerly module-level window assignments) */
  k._onTimeChange        = _onTimeChange;
  k._closeEditModal      = _closeEditModal;
  k._saveEditModal       = _saveEditModal;
  k._undoDelete          = _undoDelete;
}
