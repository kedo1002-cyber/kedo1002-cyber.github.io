/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — state.js
   Estado centralizado + persistencia localStorage
   ═══════════════════════════════════════════════ */

/* ── CONSTANTS ── */
export const AREAS = [
  { id:'dian',    label:'DIAN',      color:'#6c63d4', bg:'#eeecfc', tc:'#3d3898' },
  { id:'uni',     label:'Uni',       color:'#1a9268', bg:'#e8f5f0', tc:'#0d5c42' },
  { id:'negocio', label:'Negocio',   color:'#b8710a', bg:'#fdf3e0', tc:'#7a4a06' },
  { id:'proy',    label:'Proyectos', color:'#c44d2a', bg:'#faeae4', tc:'#8a3118' },
  { id:'pers',    label:'Personal',  color:'#7a7975', bg:'#f0eeea', tc:'#4a4946' },
];

export const BLOCKS = [
  { id:'morning',   label:'Mañana' },
  { id:'afternoon', label:'Tarde'  },
  { id:'night',     label:'Noche'  },
];

export const MOODS = [
  { id:'great', face:'😄', word:'Excelente' },
  { id:'good',  face:'🙂', word:'Bien'      },
  { id:'meh',   face:'😐', word:'Regular'   },
  { id:'low',   face:'😔', word:'Bajo'      },
  { id:'hard',  face:'😤', word:'Difícil'   },
];

export const VIEWS = ['home','agenda','journal','dash'];

/* ── PERSISTENCE KEYS ── */
const K = {
  tasks:    'kb4_tasks',
  thoughts: 'kb4_thoughts',
  history:  'kb4_history',
  events:   'kb4_events',
  journals: 'kb4_journals',
  habits:   'kb4_habits',
  habitLog: 'kb4_habitLog',
};

/* ── SAFE LOADER ── */
function _load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const parsed = JSON.parse(v);
    if (fallback !== null && !Array.isArray(parsed) && Array.isArray(fallback)) {
      console.warn(`kb4: expected array for ${key}, resetting`);
      localStorage.removeItem(key);
      return fallback;
    }
    return parsed;
  } catch(e) {
    console.warn('kb4: data corrupted for', key, '— resetting');
    localStorage.removeItem(key);
    return fallback;
  }
}

/* ── STATE ── */
export let tasks    = _load(K.tasks,    []);
export let thoughts = _load(K.thoughts, []);
export let history  = _load(K.history,  []);
export let events   = _load(K.events,   []);
export let journals = _load(K.journals, []);
export let habits   = _load(K.habits,   []);
export let habitLog = _load(K.habitLog, {});

/* ── UI STATE (no persisted) ── */
export let selArea       = 'dian';
export let selBlock      = 'morning';
export let selEventArea  = 'dian';
export let selMood       = null;
export let simHour       = null;
export let curView       = 'home';
export let curIdx        = 0;
export let _reflToday    = null;

/* ── UI SETTERS ── */
export function setSelArea(v)      { selArea = v; }
export function setSelBlock(v)     { selBlock = v; }
export function setSelEventArea(v) { selEventArea = v; }
export function setSelMood(v)      { selMood = v; }
export function setSimHour(v)      { simHour = v; }
export function setCurView(v)      { curView = v; }
export function setCurIdx(v)       { curIdx = v; }
export function setReflToday(v)    { _reflToday = v; }

/* ── STATE MUTATORS (keep in sync for export) ── */
export function setTasks(v)    { tasks = v; }
export function setThoughts(v) { thoughts = v; }
export function setHistory(v)  { history = v; }
export function setEvents(v)   { events = v; }
export function setJournals(v) { journals = v; }
export function setHabits(v)   { habits = v; }
export function setHabitLog(v) { habitLog = v; }

/* ── PERSIST ── */
export function save() {
  localStorage.setItem(K.tasks,    JSON.stringify(tasks));
  localStorage.setItem(K.thoughts, JSON.stringify(thoughts));
  localStorage.setItem(K.history,  JSON.stringify(history));
  localStorage.setItem(K.events,   JSON.stringify(events));
  localStorage.setItem(K.journals, JSON.stringify(journals));
  localStorage.setItem(K.habits,   JSON.stringify(habits));
  localStorage.setItem(K.habitLog, JSON.stringify(habitLog));
}

/* ── HELPERS (shared) ── must be defined before bootstrap IIFE */
export const pad       = n => String(n).padStart(2, '0');
export const todayStr  = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
export const hour      = () => simHour !== null ? simHour : new Date().getHours();
export const blockId   = h => h >= 6 && h < 12 ? 'morning' : h >= 12 && h < 19 ? 'afternoon' : 'night';
export const getArea   = id => AREAS.find(a => a.id === id) || AREAS[0];
export const fmtT      = s => `${pad(Math.floor(s/60))}:${pad(s%60)}`;
export const esc       = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

/* ── BOOTSTRAP ── */
(function bootstrap() {
  /* purge demo data */
  const demoTaskIds  = new Set(['1','2','3','4','5']);
  const demoEventIds = new Set(['e1','e2','e3','e4','e5']);
  let dirty = false;
  if (tasks && tasks.some(t => demoTaskIds.has(t.id))) {
    tasks = tasks.filter(t => !demoTaskIds.has(t.id)); dirty = true;
  }
  if (events.some(e => demoEventIds.has(e.id))) {
    events = events.filter(e => !demoEventIds.has(e.id)); dirty = true;
  }
  /* auto-archive completed tasks from past days */
  const today = todayStr();
  const old = tasks.filter(t => t.done && t.date && t.date < today);
  const expiredEvents = events.filter(e => e.date < today);
  if (old.length) {
    old.forEach(t => history.push({ ...t, archivedAt: today }));
    tasks = tasks.filter(t => !(t.done && t.date && t.date < today));
    dirty = true;
  }
  if (expiredEvents.length) {
    events = events.filter(e => e.date >= today);
    dirty = true;
  }
  /* auto-archive today's events whose endTime has already passed.
     Skip cross-midnight events (endTime < startTime) — they purge by date next day. */
  const _now = new Date();
  const currentTime = `${pad(_now.getHours())}:${pad(_now.getMinutes())}`;
  const _isCrossMidnight = e => e.startTime && e.endTime && e.endTime < e.startTime;
  const expiredByTime = events.filter(e => e.date === today && e.endTime && e.endTime < currentTime && !_isCrossMidnight(e));
  if (expiredByTime.length) {
    expiredByTime.forEach(e => history.push({ ...e, archivedAt: today }));
    events = events.filter(e => !(e.date === today && e.endTime && e.endTime < currentTime && !_isCrossMidnight(e)));
    dirty = true;
  }
  if (dirty) save();
})();

export const MN  = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
export const DN  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
export const LDN = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
export const LMN = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export const fmtShort = ds => { const d = new Date(ds+'T12:00:00'); return `${DN[d.getDay()]} ${d.getDate()} ${MN[d.getMonth()]}`; };
export const fmtLong  = ds => { const d = new Date(ds+'T12:00:00'); return `${LDN[d.getDay()]} ${d.getDate()} de ${LMN[d.getMonth()]}`; };

/* Formatea hora "HH:MM" → "2:30pm"; si hay inicio y fin → "2:30pm – 4:00pm" */
export const fmtEvTime = (start, end) => {
  if (!start) return '';
  const fmt = t => { const [h, m] = t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')}${h>=12?'pm':'am'}`; };
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
};

export const daysUntil = ds => {
  if (!ds || typeof ds !== 'string') return 999;
  const [ty,tm,td] = todayStr().split('-').map(Number);
  const parts = ds.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 999;
  const [ey,em,ed] = parts;
  return Math.floor((Date.UTC(ey,em-1,ed) - Date.UTC(ty,tm-1,td)) / 86400000);
};

export const urgColor = d => d <= 2 ? '#c43a3a' : d <= 7 ? '#b8710a' : d <= 14 ? '#d4950e' : '#1a9268';

export const CHK = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><polyline points="1.5,5.5 4.5,8.5 9.5,2.5" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ── HABIT HELPERS ── */
export function getTodayHabitLog() {
  return habitLog[todayStr()] || {};
}
export function isHabitDoneToday(habitId) {
  return !!(habitLog[todayStr()] && habitLog[todayStr()][habitId]);
}
export function getHabitStreak(habitId) {
  let streak = 0;
  const d = new Date();
  /* Si hoy no está completado, empezar desde ayer —
     la racha sigue activa mientras no se rompa el día anterior */
  const todayDs = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  if (!(habitLog[todayDs] && habitLog[todayDs][habitId])) {
    d.setDate(d.getDate() - 1);
  }
  for (let i = 0; i < 365; i++) {
    const ds = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if (habitLog[ds] && habitLog[ds][habitId]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
/* ── EVENT TIME PURGE ── */
export function purgeExpiredEvents() {
  const today = todayStr();
  const _now = new Date();
  const currentTime = `${pad(_now.getHours())}:${pad(_now.getMinutes())}`;
  const isCrossMidnight = e => e.startTime && e.endTime && e.endTime < e.startTime;
  const expired = events.filter(e => e.date === today && e.endTime && e.endTime < currentTime && !isCrossMidnight(e));
  if (!expired.length) return false;
  expired.forEach(e => history.push({ ...e, archivedAt: today }));
  events = events.filter(e => !(e.date === today && e.endTime && e.endTime < currentTime && !isCrossMidnight(e)));
  save();
  return true;
}

export function getHabitHistory7(habitId) {
  const result = [];
  const d = new Date();
  const dow = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  for (let i = 0; i < 7; i++) {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    const ds = `${dd.getFullYear()}-${pad(dd.getMonth()+1)}-${pad(dd.getDate())}`;
    const today = todayStr();
    result.push({ ds, done: !!(habitLog[ds] && habitLog[ds][habitId]), isFuture: ds > today, isToday: ds === today });
  }
  return result;
}
