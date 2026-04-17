/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — views/home.js
   Vista principal: Hoy
   ═══════════════════════════════════════════════ */

import {
  tasks, thoughts, events, journals, habits,
  selArea, selBlock, _nightArea, _nightBlock,
  hour, blockId, todayStr, pad, getArea,
  daysUntil, urgColor, esc, fmtShort,
  setEvents, save,
  LDN, LMN, DN, MN, AREAS, BLOCKS, CHK,
} from '../state.js';
import { renderHabitsSection, initHabitHandlers, initHabitSwipes } from '../habits.js';
import { initTaskGestures, updatePlannedList, updateThoughtsList } from '../actions.js';

let _ehBoundEl = null, _ehX = 0, _ehY = 0, _ehEl = null;
let _ehOn = false, _ehLocked = false, _ehFired = false, _ehLastDx = 0;
let _ehBdEl = null, _ehIcEl = null; /* backdrop & icon — cacheados en init, sin querySelector en hot path */

/* ── WATERMARK ── */
const _wm = `<div class="home-watermark"><span class="home-wm-by">Design by</span><span class="home-wm-name">kedonk</span></div>`;

/* ── TASK CARD (con backdrop de swipe delete) ── */
function taskCard(t) {
  const a = getArea(t.area);
  return `
  <div class="task${t.done?' done':''}" data-tid="${t.id}" onclick="window._toggleTask('${t.id}')">
    <div class="task-delete-backdrop">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <polyline points="2,3 3,3 12,3" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M4.5 3V2a.5.5 0 01.5-.5h4a.5.5 0 01.5.5v1M5.5 6v4M8.5 6v4" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
        <rect x="3" y="3" width="8" height="9" rx="1.5" stroke="white" stroke-width="1.4"/>
      </svg>
    </div>
    <div class="check${t.done?' done':''}">${t.done ? CHK : ''}</div>
    <span class="task-text">${esc(t.text)}</span>
    <div class="area-pip" style="background:${a.color}"></div>
  </div>`;
}

/* ── EVENT HINT ── */
function buildEventHint(nextEv) {
  if (!nextEv) return '';
  const _d = daysUntil(nextEv.date), _a = getArea(nextEv.area), _uc = urgColor(_d);
  const _dLbl = _d === 0 ? 'hoy' : _d === 1 ? 'día' : 'días';
  return `<div class="eh-wrap pe pe1">
    <div class="eh-backdrop">
      <span class="eh-backdrop-lbl">Realizado</span>
      <div class="eh-backdrop-icon">
        <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><polyline points="1,4.5 4.5,8 11,1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </div>
    <div class="event-hint" data-evid="${nextEv.id}" onclick="ehHandleClick()" style="--eh-accent:${_uc}">
      <div class="eh-days-col">
        <div class="event-hint-days" style="color:${_uc}">${_d === 0 ? '0' : _d}</div>
        <div class="event-hint-days-lbl">${_dLbl}</div>
      </div>
      <div class="eh-sep"></div>
      <div class="event-hint-info">
        <div class="event-hint-title">${esc(nextEv.title)}</div>
        <div class="event-hint-date">
          <span class="event-hint-area-pip" style="background:${_a.color}"></span>
          ${esc(_a.label)} · ${fmtShort(nextEv.date)}
        </div>
      </div>
      <div class="event-hint-arrow">›</div>
    </div>
  </div>`;
}

/* ── RENDER HOME ── */
export function renderHome() {
  const el = document.getElementById('view-home');
  const h  = hour(), bl = blockId(h);
  const now = new Date();
  const dateStr = `${LDN[now.getDay()]}, ${now.getDate()} de ${LMN[now.getMonth()]}`;

  const greets = {
    morning:   ['Buenos días', 'Aquí están tus tareas de esta mañana.'],
    afternoon: ['Buenas tardes', 'Una a la vez. Enfócate.'],
    night:     ['Buenas noches', 'Planea mañana. Captura lo de hoy.'],
  };
  const [gt, gs] = greets[bl];
  const nextEv = [...events].sort((a,b) => a.date > b.date ? 1 : -1)[0] || null;
  const evHint = buildEventHint(nextEv);

  /* ── HÁBITOS ── siempre visibles en home */
  const habitsHTML = `
    <div class="section-label pe pe2">Hábitos</div>
    <div class="habits-section pe pe2" id="habits-section">
      ${renderHabitsSection()}
    </div>`;

  /* ── helper: secciones de tareas para todos los bloques de hoy ── */
  function _buildDayBlocksHTML(currentBl) {
    const today_ = todayStr();
    const BDEF = [
      { id: 'morning',   label: 'Mañana' },
      { id: 'afternoon', label: 'Tarde'  },
      { id: 'night',     label: 'Noche'  },
    ];
    let peOff = 3;
    return BDEF.map(b => {
      const bt = tasks.filter(t => t.block === b.id && t.date === today_);
      if (!bt.length && b.id !== currentBl) return '';
      const done = bt.filter(t => t.done).length, total = bt.length;
      const pct  = total ? Math.round(done / total * 100) : 0;
      const pe   = `pe pe${peOff++}`;
      const cid  = b.id === currentBl ? 'tasks-container' : `tc-${b.id}`;
      return `
      <div class="section-label ${pe}">${b.label}</div>
      <div class="tasks-container ${pe}" id="${cid}" data-block="${b.id}">
        ${total ? bt.map(t => taskCard(t)).join('') : `
          <div class="empty">
            <div class="empty-ring"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--text3)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><polyline points="7,10 9,12 13,8"/></svg></div>
            <div class="empty-title">Todo en orden</div>
            <div class="empty-sub">Sin tareas para este bloque.<br>Agrégalas esta noche.</div>
          </div>`}
      </div>
      ${total ? `<div class="progress-wrap ${pe}" data-block="${b.id}"><div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div><span class="prog-txt">${done}/${total}</span></div>` : ''}`;
    }).filter(Boolean).join('');
  }

  if (bl === 'night') {
    const hasRefl  = !!journals.find(j => j.date === todayStr());
    const nt       = tasks.filter(t => t.block === 'night' && t.date === todayStr());
    const done     = nt.filter(t => t.done).length, total = nt.length;
    const pct      = total ? Math.round(done / total * 100) : 0;
    const dayBlocksHTML = _buildDayBlocksHTML('night');
    /* si ya pasó medianoche (0–5h), "mañana" = hoy — mismo criterio que addNightTask */
    const _tnow = new Date(), _ttm = new Date(_tnow);
    if (_tnow.getHours() >= 6) _ttm.setDate(_ttm.getDate() + 1);
    const tmDs     = `${_ttm.getFullYear()}-${pad(_ttm.getMonth()+1)}-${pad(_ttm.getDate())}`;
    const planned  = tasks.filter(t => t.date === tmDs);
    const todayTh  = thoughts.filter(t => t.date === todayStr());

    const arrowSvg = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h8M6 2l4 4-4 4"/></svg>`;
    const plusSvg  = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="8" y1="2" x2="8" y2="14" stroke="white" stroke-width="1.8" stroke-linecap="round"/><line x1="2" y1="8" x2="14" y2="8" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    const upSvg    = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="7" y1="12" x2="7" y2="2" stroke="white" stroke-width="1.8" stroke-linecap="round"/><polyline points="3,6 7,2 11,6" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const nightContent = hasRefl ? `
      <div class="section-label pe pe4">Planear mañana</div>
      <div class="plan-wrap pe pe4">
        <div class="plan-input-row">
          <input class="plan-input" id="plan-inp" placeholder="¿Qué harás mañana?" onkeydown="if(event.key==='Enter')window._addNightTask()">
          <button class="plan-add-btn" onclick="window._addNightTask()">${plusSvg}</button>
        </div>
        <div class="area-chips">
          ${AREAS.map(a => `<span class="area-chip${_nightArea===a.id?' sel':''}" data-aid="${a.id}" onclick="window._pickNightArea('${a.id}')" style="${_nightArea===a.id?`background:${a.bg};color:${a.tc};border-color:${a.color}`:''}">${a.label}</span>`).join('')}
        </div>
        <div class="block-segs">
          ${BLOCKS.map(b => `<div class="block-seg${_nightBlock===b.id?' sel':''}" data-bid="${b.id}" onclick="window._pickNightBlock('${b.id}')">${b.label}</div>`).join('')}
        </div>
        <div class="planned-list" id="planned-list">
          ${planned.map(t => {
            const a = getArea(t.area);
            const bLbl = { morning:'Mañana', afternoon:'Tarde', night:'Noche' }[t.block] || t.block;
            return `<div class="planned-item" data-pid="${t.id}">
              <div class="planned-item-pip" style="background:${a.color}"></div>
              <span class="planned-item-txt">${esc(t.text)}</span>
              <span class="planned-item-block">${bLbl}</span>
              <span class="planned-item-del" onclick="window._delPlanned('${t.id}',this)">×</span>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="section-label pe pe5">Ideas de hoy</div>
      <div class="ideas-wrap pe pe5">
        <div class="ideas-ta-row">
          <textarea class="ideas-ta" id="ideas-ta" placeholder="Anota cualquier idea..." rows="1"
            oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';document.getElementById('ideas-send').classList.toggle('ready',this.value.trim().length>0)"></textarea>
          <button class="ideas-send" id="ideas-send" onclick="window._saveCapture2()">${upSvg}</button>
        </div>
        <div class="thought-chips" id="thought-chips">
          ${todayTh.map(th => `
            <div class="thought-chip" data-thid="${th.id}">
              <span class="thought-chip-txt">${esc(th.text)}</span>
              <span class="thought-chip-x" onclick="window._delThought2('${th.id}',this)">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <line x1="1.5" y1="1.5" x2="6.5" y2="6.5" stroke="var(--text3)" stroke-width="1.5" stroke-linecap="round"/>
                  <line x1="6.5" y1="1.5" x2="1.5" y2="6.5" stroke="var(--text3)" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </span>
            </div>`).join('')}
        </div>
      </div>` : `
      <div class="night-gate pe pe4">
        <div class="night-gate-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--text3)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9" width="12" height="9" rx="2"/><path d="M7 9V6a3 3 0 016 0v3"/></svg>
        </div>
        <div class="night-gate-title">Planeación bloqueada</div>
        <div class="night-gate-sub">Completa tu reflexión del día<br>para desbloquear este espacio.</div>
        <button class="night-gate-btn" onclick="go('journal',2)">Ir a Diario ${arrowSvg}</button>
      </div>`;

    el.innerHTML = `
      <div class="page-header pe">${_wm}<div class="page-title">${gt}</div><div class="page-sub">${gs}</div><div class="page-date">${dateStr}</div></div>
      ${evHint}
      ${habitsHTML}
      ${dayBlocksHTML}
      ${nightContent}
      <div style="height:24px"></div>`;
  } else {
    const dayBlocksHTML = _buildDayBlocksHTML(bl);
    el.innerHTML = `
      <div class="page-header pe">${_wm}<div class="page-title">${gt}</div><div class="page-sub">${gs}</div><div class="page-date">${dateStr}</div></div>
      ${evHint}
      ${habitsHTML}
      ${dayBlocksHTML}
      <div class="capture-box pe pe6">
        <div class="capture-top"><span class="capture-label">Captura rápida</span></div>
        <textarea class="capture-ta" id="cap-ta" placeholder="Anota cualquier idea..." rows="2"></textarea>
        <div class="capture-footer"><span class="capture-save" onclick="window._saveThought()">Guardar</span></div>
      </div>
      <div style="height:20px"></div>`;
  }

  /* gestos táctiles en tareas — init en todos los bloques visibles */
  document.querySelectorAll('#view-home .tasks-container[data-block]').forEach(c => initTaskGestures(c));

  /* hábitos handlers + swipe delete */
  initHabitHandlers(renderHome);
  setTimeout(initHabitSwipes, 0);

  /* event hint swipe — doble RAF garantiza que el browser ya pintó el DOM */
  requestAnimationFrame(() => requestAnimationFrame(initEventHintSwipe));

}

/* ── EVENT HINT SWIPE ── */
function ehHandleClick() {
  if (Math.abs(_ehLastDx) > 6) { _ehLastDx = 0; return; }
  window.go('agenda', 1);
}
window.ehHandleClick = ehHandleClick;

function initEventHintSwipe() {
  const el = document.querySelector('.event-hint[data-evid]');
  if (_ehBoundEl && _ehBoundEl !== el) {
    _ehBoundEl.removeEventListener('touchstart', _ehStart);
    _ehBoundEl.removeEventListener('touchmove',  _ehMove);
    _ehBoundEl.removeEventListener('touchend',   _ehEnd);
    _ehBoundEl.removeEventListener('touchcancel',_ehCancel);
    _ehBoundEl = null;
  }
  if (!el || _ehBoundEl === el) return;
  _ehBoundEl = el;
  /* cachear backdrop e ícono UNA sola vez — cero querySelector en el hot path */
  _ehBdEl = el.closest('.eh-wrap')?.querySelector('.eh-backdrop') || null;
  _ehIcEl = _ehBdEl?.querySelector('.eh-backdrop-icon') || null;
  el.addEventListener('touchstart', _ehStart, { passive: true });
  el.addEventListener('touchmove',  _ehMove,  { passive: false });
  el.addEventListener('touchend',   _ehEnd,   { passive: true });
  el.addEventListener('touchcancel',_ehCancel,{ passive: true });
  requestAnimationFrame(() => el.classList.add('nudge'));
}

function _ehStart(e) {
  _ehX = e.touches[0].clientX; _ehY = e.touches[0].clientY;
  _ehEl = this; _ehOn = false; _ehLocked = false; _ehFired = false; _ehLastDx = 0;
  /* cancelar animación nudge inmediatamente — evita conflicto CSS anim vs JS transform */
  this.classList.remove('nudge');
  this.style.transition = '';
  if (_ehBdEl) _ehBdEl.style.transition = '';
}

function _ehMove(e) {
  if (_ehLocked || !_ehEl) return;
  const dx = e.touches[0].clientX - _ehX;
  const dy = e.touches[0].clientY - _ehY;
  if (!_ehOn) {
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    if (Math.abs(dy) > Math.abs(dx)) { _ehLocked = true; return; }
    if (dx < 0) _ehOn = true; else { _ehLocked = true; return; } /* solo izquierda */
  }
  e.preventDefault();
  const raw = -dx;
  const pull = raw < 88 ? raw : 88 + (raw - 88) * 0.22;
  const clamped = Math.min(pull, 118);
  _ehLastDx = dx;
  _ehEl.style.transform = `translateX(${-clamped}px)`;
  if (_ehBdEl) _ehBdEl.style.opacity = String(Math.min(clamped / 60, 1));
  if (_ehIcEl) _ehIcEl.classList.toggle('armed', clamped >= 88);
  if (clamped >= 88 && !_ehFired) { _ehFired = true; navigator.vibrate && navigator.vibrate([8, 40, 12]); }
}

function _ehEnd(e) {
  if (!_ehEl || _ehLocked || !_ehOn) {
    _ehEl = null; _ehOn = false; _ehLocked = false; _ehFired = false;
    return;
  }
  const dx = e.changedTouches[0].clientX - _ehX;
  _ehLastDx = dx;
  const pull = -dx;
  /* capturar ref antes de resetear — evita que un nuevo gesto pise la variable */
  const cardEl = _ehEl;
  _ehEl = null; _ehOn = false; _ehLocked = false; _ehFired = false;
  if (pull >= 88) {
    _completeEhEvent(cardEl.dataset.evid, cardEl);
  } else {
    _ehSnapBack(cardEl);
  }
}

function _ehCancel() {
  if (!_ehEl) return;
  const cardEl = _ehEl;
  _ehEl = null; _ehOn = false; _ehLocked = false; _ehFired = false;
  _ehSnapBack(cardEl);
}

function _ehSnapBack(cardEl) {
  cardEl.style.transition = 'transform 0.42s cubic-bezier(0.34,1.56,0.64,1)';
  cardEl.style.transform  = '';
  if (_ehBdEl) { _ehBdEl.style.transition = 'opacity 0.28s ease'; _ehBdEl.style.opacity = '0'; }
  if (_ehIcEl) _ehIcEl.classList.remove('armed');
  setTimeout(() => {
    cardEl.style.transition = '';
    if (_ehBdEl) _ehBdEl.style.transition = '';
  }, 450);
}

function _completeEhEvent(evId, cardEl) {
  const el   = cardEl || document.querySelector('.event-hint[data-evid]');
  const wrap = el?.closest('.eh-wrap');
  if (!el) return;
  /* fly-out izquierda */
  el.style.transition    = 'transform 0.26s cubic-bezier(0.4,0,1,1)';
  el.style.transform     = `translateX(-${el.offsetWidth + 24}px)`;
  el.style.pointerEvents = 'none';
  if (_ehBdEl) { _ehBdEl.style.transition = 'opacity 0.1s'; _ehBdEl.style.opacity = '1'; }
  setEvents(events.filter(ev => ev.id !== evId)); save();
  if (wrap) {
    const ht = wrap.getBoundingClientRect().height;
    wrap.style.height = ht + 'px'; wrap.style.overflow = 'hidden';
    setTimeout(() => {
      wrap.style.transition   = 'height 0.3s var(--ease),opacity 0.24s var(--ease),margin 0.3s var(--ease)';
      wrap.style.height       = '0'; wrap.style.opacity = '0'; wrap.style.marginBottom = '0';
      setTimeout(() => {
        const vh = document.getElementById('view-home'), sy = vh ? vh.scrollTop : 0;
        renderHome(); if (vh) vh.scrollTop = sy;
      }, 290);
    }, 220);
  } else {
    setTimeout(() => {
      const vh = document.getElementById('view-home'), sy = vh ? vh.scrollTop : 0;
      renderHome(); if (vh) vh.scrollTop = sy;
    }, 320);
  }
}
