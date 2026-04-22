/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — habits.js
   Sistema de hábitos neurológicos
   Loop: acción → recompensa visual → racha → anticipación
   ═══════════════════════════════════════════════ */

import {
  habits, habitLog, setHabits, setHabitLog,
  save, todayStr, pad,
  isHabitDoneToday, getHabitStreak, getHabitHistory7,
} from './state.js';
import { fireBurst } from './particles.js';

/* ── UMBRALES NEUROLÓGICOS ──
   Basado en investigación de Lally et al. (2010) sobre formación de hábitos:
   3d = inicio del loop    → refuerzo visual leve
   7d = consolidación      → celebración media
   21d = automatización    → celebración fuerte
   66d = hábito profundo   → reconocimiento especial
*/
export const STREAK_THRESHOLDS = [
  { days: 66, label: 'Parte de ti',  color: '#6c63d4' },
  { days: 21, label: 'Automatizado', color: '#1a9268' },
  { days:  7, label: 'En racha',     color: '#b8710a' },
  { days:  3, label: 'Iniciando',    color: '#c44d2a' },
];

export function getStreakLevel(streak) {
  return STREAK_THRESHOLDS.find(t => streak >= t.days) || null;
}

/* ── HÁBITOS PREDETERMINADOS (sugeridos al primer uso) ── */
export const DEFAULT_HABITS = [
  { id: 'h_meditar',   nombre: 'Meditar',       icono: '🧘', color: '#6c63d4' },
  { id: 'h_ejercicio', nombre: 'Ejercicio',      icono: '💪', color: '#c44d2a' },
  { id: 'h_leer',      nombre: 'Leer',           icono: '📖', color: '#1a9268' },
  { id: 'h_agua',      nombre: 'Agua (2L)',       icono: '💧', color: '#378add' },
  { id: 'h_noscreen',  nombre: 'Sin pantallas',  icono: '🌙', color: '#b8710a' },
];

/* ── COMPLETAR HÁBITO HOY ── */
export function toggleHabitToday(habitId) {
  const today = todayStr();
  const dayLog = habitLog[today] || {};
  const wasDone = !!dayLog[habitId];
  const newDayLog = { ...dayLog };
  if (wasDone) {
    delete newDayLog[habitId];
  } else {
    newDayLog[habitId] = Date.now();
  }
  setHabitLog({ ...habitLog, [today]: newDayLog });
  save();
  return !wasDone;
}

/* ── AGREGAR HÁBITO PERSONALIZADO ── */
export function addHabit(nombre, icono, color) {
  if (!nombre?.trim()) return null;
  const id = 'h_' + Date.now();
  const newHabit = { id, nombre: nombre.trim(), icono: icono || '✦', color: color || '#6c63d4' };
  setHabits([...habits, newHabit]);
  save();
  return newHabit;
}

/* ── ELIMINAR HÁBITO ── */
export function deleteHabit(habitId) {
  setHabits(habits.filter(h => h.id !== habitId));
  const newLog = { ...habitLog };
  Object.keys(newLog).forEach(date => {
    if (newLog[date] && newLog[date][habitId]) delete newLog[date][habitId];
  });
  setHabitLog(newLog);
  save();
}

/* ── RESUMEN DE HÁBITOS (para reflexión) ── */
export function getHabitsSummary() {
  if (!habits.length) return { total: 0, done: 0, mejorRacha: null };
  const today = todayStr();
  const todayLog = habitLog[today] || {};
  const done = habits.filter(h => !!todayLog[h.id]).length;
  let mejorRacha = null;
  habits.forEach(h => {
    const streak = getHabitStreak(h.id);
    if (!mejorRacha || streak > mejorRacha.streak) {
      mejorRacha = { streak, nombre: h.nombre, id: h.id };
    }
  });
  return { total: habits.length, done, mejorRacha };
}

/* ── RENDERIZAR SECCIÓN DE HÁBITOS ── */
export function renderHabitsSection() {
  if (!habits.length) return renderHabitsEmpty();

  const today = todayStr();
  const todayLog = habitLog[today] || {};
  const doneCount = habits.filter(h => !!todayLog[h.id]).length;
  const totalCount = habits.length;
  const allDone = doneCount === totalCount;
  const ringPct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

  const GOAL = 21;
  const habitsHTML = habits.map(h => {
    const done     = !!todayLog[h.id];
    const streak   = getHabitStreak(h.id);
    const formed   = streak >= GOAL;
    const pct      = Math.min(Math.round(streak / GOAL * 100), 100);
    const daysLeft = Math.max(GOAL - streak, 0);
    const s        = streak !== 1 ? 's' : '';

    const badgeColor  = formed ? '#1a9268' : h.color;
    const badgeText   = formed ? `✓ ${streak}d` : `${streak}/${GOAL}`;
    const fillColor   = formed ? '#1a9268' : h.color;
    const lblText     = formed
      ? `<span style="color:#1a9268;font-weight:500">¡Hábito formado! Llevas ${streak} días</span>`
      : streak > 0
        ? `${streak} día${s} seguido${s} · <span style="color:${h.color};font-weight:500">Faltan ${daysLeft}</span>`
        : `Empieza hoy · <span style="color:${h.color};font-weight:500">Faltan ${GOAL}</span>`;

    return `
    <div class="habit-swipe-wrap">
      <div class="habit-swipe-back">
        <div class="habit-swipe-icon">
          <svg width="13" height="2" viewBox="0 0 13 2" fill="none"><rect width="13" height="2" rx="1" fill="white"/></svg>
        </div>
      </div>
      <div class="habit-card${done ? ' done' : ''}" data-hid="${h.id}" onclick="window._habitToggle('${h.id}')">
        <div class="habit-left">
          <div class="habit-check${done ? ' done' : ''}" style="${done ? `background:${h.color};border-color:${h.color}` : ''}">
            ${done ? `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><polyline points="1.5,5.5 4.5,8.5 9.5,2.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>` : `<span class="habit-icono">${h.icono}</span>`}
          </div>
        </div>
        <div class="habit-body">
          <div class="habit-name-row">
            <div class="habit-name">${h.nombre}</div>
            <div class="habit-21-badge" style="color:${badgeColor}">${badgeText}</div>
          </div>
          <div class="habit-prog-track">
            <div class="habit-prog-fill" style="width:${pct}%;background:${fillColor}"></div>
          </div>
          <div class="habit-prog-lbl">${lblText}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  const ringSize = 44;
  const r = 17;
  const circ = 2 * Math.PI * r;
  const offset = circ - (ringPct / 100) * circ;
  const ringColor = allDone ? '#1a9268' : '#6c63d4';

  return `
  <div class="habits-header pe pe1">
    <div class="habits-ring-wrap">
      <svg width="${ringSize}" height="${ringSize}" viewBox="0 0 ${ringSize} ${ringSize}">
        <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${r}" fill="none" stroke="var(--bg3)" stroke-width="2.5"/>
        <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${r}" fill="none" stroke="${ringColor}" stroke-width="2.5"
          stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
          transform="rotate(-90 ${ringSize/2} ${ringSize/2})"
          style="transition:stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)"/>
        <text x="${ringSize/2}" y="${ringSize/2+4}" text-anchor="middle" fill="${ringColor}"
          font-size="11" font-weight="500" font-family="DM Mono,monospace">${doneCount}</text>
      </svg>
    </div>
    <div class="habits-title-block">
      <div class="habits-title">${allDone ? 'Hábitos completados' : 'Hábitos de hoy'}</div>
      <div class="habits-sub">${doneCount}/${totalCount} · ${ringPct}%</div>
    </div>
    <button class="habit-add-mini" onclick="window._habitAddOpen()" aria-label="Agregar hábito">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
  <div class="habits-list pe pe2">${habitsHTML}</div>
  ${renderAddHabitInline()}`;
}

function renderHabitsEmpty() {
  return `
  <div class="habits-empty pe pe1">
    <div class="habits-empty-icon">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--text3)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 2v16M2 10h16"/>
      </svg>
    </div>
    <div class="habits-empty-title">Sin hábitos todavía</div>
    <div class="habits-empty-sub">Agrega uno para empezar tu racha neurológica.</div>
    <button class="habit-add-btn pe" onclick="window._habitAddOpen()">Agregar primer hábito</button>
  </div>
  ${renderAddHabitInline()}`;
}

function renderAddHabitInline() {
  return `
  <div class="habit-add-form" id="habit-add-form" style="display:none">
    <input class="habit-add-input" id="habit-add-name" placeholder="Nombre del hábito..." maxlength="32">
    <div class="habit-icon-row" id="habit-icon-row">
      ${['🧘','💪','📖','💧','🌙','✍️','🥗','🚶','🎯','🧠'].map(ic =>
        `<span class="habit-icon-opt" onclick="window._habitSelectIcon('${ic}')">${ic}</span>`
      ).join('')}
    </div>
    <div class="habit-form-btns">
      <button class="habit-cancel-btn" onclick="window._habitAddClose()">Cancelar</button>
      <button class="habit-save-btn" onclick="window._habitAddSave()">Guardar hábito</button>
    </div>
  </div>`;
}

/* ── SWIPE-TO-DELETE ── */
let _renderHome = null;

function _attachHabitSwipe(wrap) {
  const card = wrap.querySelector('.habit-card');
  if (!card) return;
  const hid  = card.dataset.hid;
  const back = wrap.querySelector('.habit-swipe-back');
  const icon = wrap.querySelector('.habit-swipe-icon');
  if (!back || !icon || !hid) return;

  let sx = 0, sy = 0, pull = 0, axis = null;

  card.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    pull = 0; axis = null;
    card.style.transition = 'none';
    back.style.transition = 'none';
  }, { passive: true });

  card.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - sx;
    const dy = e.touches[0].clientY - sy;
    if (!axis) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
    }
    if (axis !== 'x' || dx > 0) return;
    const raw = -dx;
    pull = raw < 88 ? raw : 88 + (raw - 88) * 0.22;
    pull = Math.min(pull, 118);
    card.style.transform = `translateX(${-pull}px)`;
    back.style.opacity   = String(Math.min(pull / 60, 1));
    icon.classList.toggle('armed', pull >= 88);
    e.preventDefault();
  }, { passive: false });

  const _snapBack = () => {
    card.style.transition = 'transform 0.42s cubic-bezier(0.34,1.56,0.64,1)';
    card.style.transform  = 'translateX(0)';
    back.style.transition = 'opacity 0.3s ease';
    back.style.opacity    = '0';
    icon.classList.remove('armed');
    pull = 0; axis = null;
  };

  card.addEventListener('touchend', () => {
    if (axis !== 'x') { axis = null; return; }
    if (pull >= 88) {
      navigator.vibrate && navigator.vibrate(30);
      card.style.transition = 'transform 0.26s cubic-bezier(0.4,0,1,1)';
      card.style.transform  = `translateX(-${card.offsetWidth + 24}px)`;
      const ht = wrap.getBoundingClientRect().height;
      wrap.style.height   = ht + 'px';
      wrap.style.overflow = 'hidden';
      setTimeout(() => {
        wrap.style.transition   = 'height 0.3s var(--ease),opacity 0.24s var(--ease),margin 0.3s var(--ease)';
        wrap.style.height       = '0';
        wrap.style.opacity      = '0';
        wrap.style.marginBottom = '0';
        setTimeout(() => { deleteHabit(hid); _refreshHabitsSection(); }, 290);
      }, 220);
    } else { _snapBack(); }
  }, { passive: true });

  card.addEventListener('touchcancel', _snapBack, { passive: true });
}

export function initHabitSwipes() {
  document.querySelectorAll('.habit-swipe-wrap').forEach(_attachHabitSwipe);
}

/* ── UPDATE QUIRÚRGICO DEL RING ──
   Actualiza el SVG en el DOM existente → dispara la transición CSS suave.
   Llamar ANTES del re-render para que la animación sea visible. */
function _updateRingSurgical() {
  const today = todayStr();
  const todayLog = habitLog[today] || {};
  const doneCount  = habits.filter(h => !!todayLog[h.id]).length;
  const totalCount = habits.length;
  const ringPct  = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;
  const allDone  = doneCount === totalCount;
  const ringColor = allDone ? '#1a9268' : '#6c63d4';
  const r = 17, circ = 2 * Math.PI * r;
  const offset = circ - (ringPct / 100) * circ;

  const circles = document.querySelectorAll('.habits-ring-wrap circle');
  if (circles.length >= 2) {
    /* forzar transición sincronizada con la animación del card (0.36s) */
    circles[1].style.transition      = 'stroke-dashoffset 0.36s cubic-bezier(0.4,0,0.2,1)';
    circles[1].style.strokeDashoffset = String(offset);
    circles[1].setAttribute('stroke', ringColor);
  }
  const txt = document.querySelector('.habits-ring-wrap text');
  if (txt) { txt.textContent = doneCount; txt.setAttribute('fill', ringColor); }
  const sub = document.querySelector('.habits-sub');
  if (sub) sub.textContent = `${doneCount}/${totalCount} · ${ringPct}%`;
  const title = document.querySelector('.habits-title');
  if (title) title.textContent = allDone ? 'Hábitos completados' : 'Hábitos de hoy';
}

/* ── REFRESH QUIRÚRGICO DE LA SECCIÓN DE HÁBITOS ──
   Solo reemplaza #habits-section sin tocar el resto del DOM.
   Elimina las clases pe/pe1-pe5 para no re-disparar animaciones de entrada. */
function _refreshHabitsSection() {
  const section = document.getElementById('habits-section');
  if (!section) { if (_renderHome) _renderHome(); return; }
  section.innerHTML = renderHabitsSection().replace(/\bpe\d?\b/g, '');
  initHabitSwipes();
}

/* ── HANDLER GLOBAL TOGGLE ── */
let _selectedIcon = '✦';
export function initHabitHandlers(renderHomeFn) {
  _renderHome = renderHomeFn;
  window._habitToggle = (id) => {
    const wasCompleted = toggleHabitToday(id);
    const el = document.querySelector(`[data-hid="${id}"]`);

    /* ── Ring: update quirúrgico inmediato → dispara transición CSS suave ── */
    _updateRingSurgical();

    if (wasCompleted && el) {
      /* ── Feedback visual INMEDIATO — no espera el re-render ── */
      const h = habits.find(hb => hb.id === id);
      const color = h?.color || '#6c63d4';
      el.classList.add('done');

      /* ── Check circle: spring pop ── */
      const chk = el.querySelector('.habit-check');
      if (chk) {
        chk.classList.add('done');
        chk.style.background  = color;
        chk.style.borderColor = color;
        chk.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><polyline points="1.5,5.5 4.5,8.5 9.5,2.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        chk.classList.add('popping');
        setTimeout(() => chk.classList.remove('popping'), 420);
      }

      /* ── Barra de progreso: update quirúrgico → dispara transición CSS fluida ── */
      const fill  = el.querySelector('.habit-prog-fill');
      const lbl   = el.querySelector('.habit-prog-lbl');
      const badge = el.querySelector('.habit-21-badge');
      if (fill && h) {
        const streak  = getHabitStreak(id);
        const GOAL    = 21;
        const newPct  = Math.min(Math.round(streak / GOAL * 100), 100);
        const daysLeft = Math.max(GOAL - streak, 0);
        const s = streak !== 1 ? 's' : '';
        const formed  = streak >= GOAL;
        fill.style.width      = newPct + '%';
        fill.style.background = formed ? '#1a9268' : color;
        if (lbl) lbl.innerHTML = formed
          ? `<span style="color:#1a9268;font-weight:500">¡Hábito formado! Llevas ${streak} días</span>`
          : streak > 0
            ? `${streak} día${s} seguido${s} · <span style="color:${color};font-weight:500">Faltan ${daysLeft}</span>`
            : `Empieza hoy · <span style="color:${color};font-weight:500">Faltan ${GOAL}</span>`;
        if (badge) { badge.style.color = formed ? '#1a9268' : color; badge.textContent = formed ? `✓ ${streak}d` : `${streak}/${GOAL}`; }
      }

      /* ── Efectos ── */
      const r = el.getBoundingClientRect();
      fireBurst(r.left + r.width / 2, r.top + r.height / 2, 'habit');
      navigator.vibrate && navigator.vibrate([8, 40, 12]);

      /* ── Card bounce — re-render después de que la barra termine (0.48s) ── */
      el.classList.add('habit-completing');
      el.addEventListener('animationend', () => el.classList.remove('habit-completing'), { once: true });
      setTimeout(_refreshHabitsSection, 480);
      return;
    }

    _refreshHabitsSection();
  };

  window._habitAddOpen = () => {
    const form = document.getElementById('habit-add-form');
    if (form) { form.style.display = 'block'; form.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  };
  window._habitAddClose = () => {
    const form = document.getElementById('habit-add-form');
    if (form) form.style.display = 'none';
    _selectedIcon = '✦';
    document.querySelectorAll('.habit-icon-opt').forEach(el => el.classList.remove('sel'));
  };
  window._habitSelectIcon = (ic) => {
    _selectedIcon = ic;
    document.querySelectorAll('.habit-icon-opt').forEach(el => el.classList.toggle('sel', el.textContent === ic));
  };
  window._habitAddSave = () => {
    const inp = document.getElementById('habit-add-name');
    if (!inp?.value.trim()) return;
    addHabit(inp.value.trim(), _selectedIcon, '#6c63d4');
    window._habitAddClose();
    _refreshHabitsSection();
  };
  window._habitDeleteConfirm = (id) => {
    if (confirm('¿Eliminar este hábito? Se perderá toda su historia.')) {
      deleteHabit(id);
      _refreshHabitsSection();
    }
  };
}
