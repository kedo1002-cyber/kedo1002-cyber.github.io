/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — views/areas.js
   Gestión de áreas / tags — bottom sheet drawer
   ═══════════════════════════════════════════════ */

import {
  AREAS, COLOR_PRESETS, setAreas,
  tasks, setTasks, history, setHistory,
  events, setEvents,
  selArea, setSelArea,
  selEventArea, setSelEventArea,
  esc, save,
} from '../state.js';
import { renderDash } from './dash.js';
import { initDrawerSwipe } from '../gestures.js';

let _selColor = 0;

export function openAreasDrawer() {
  _selColor = 0;
  _render();
  document.getElementById('areas-overlay').classList.add('open');
  requestAnimationFrame(() => requestAnimationFrame(() =>
    document.getElementById('areas-drawer').classList.add('open')
  ));
  initDrawerSwipe({ handleId:'areas-handle-wrap', drawerId:'areas-drawer', backdropId:'areas-overlay', onClose: closeAreasDrawer });
  navigator.vibrate && navigator.vibrate(8);
}

export function closeAreasDrawer() {
  const drawer = document.getElementById('areas-drawer');
  if (drawer) { drawer.classList.remove('open'); drawer.style.transform = ''; }
  const ov = document.getElementById('areas-overlay');
  if (ov) { ov.classList.remove('open'); ov.style.opacity = ''; }
}

function _render() {
  const body = document.getElementById('areas-drawer-body');
  if (!body) return;
  body.innerHTML = _buildHTML();
}

function _buildHTML() {
  const canDelete = AREAS.length > 1;
  const trashSvg = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;

  const areaRows = AREAS.map(a => `
    <div class="areas-row">
      <div class="area-row-pip" style="background:${a.color}"></div>
      <span class="area-row-label">${esc(a.label)}</span>
      ${canDelete
        ? `<button class="area-del-btn" onclick="kedo._areasDelete('${a.id}')" aria-label="Eliminar ${esc(a.label)}">${trashSvg}</button>`
        : '<div style="width:28px"></div>'}
    </div>`).join('');

  const swatches = COLOR_PRESETS.map((c, i) => `
    <div class="area-color-swatch${i === _selColor ? ' sel' : ''}"
      style="background:${c.color}"
      onclick="kedo._areasSelColor(${i})"
      role="radio" aria-checked="${i === _selColor ? 'true' : 'false'}" aria-label="${c.color}"></div>`
  ).join('');

  return `
    <div id="areas-list">${areaRows}</div>
    <button class="areas-add-trigger" id="areas-add-trigger" onclick="kedo._areasToggleForm()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Agregar área
    </button>
    <div class="areas-add-form" id="areas-add-form" style="display:none">
      <input class="areas-add-input" id="areas-add-input" placeholder="Nombre del área" maxlength="24"
        oninput="document.getElementById('areas-confirm-btn').disabled=!this.value.trim()"
        onkeydown="if(event.key==='Enter')kedo._areasAdd()">
      <div class="area-swatches-row">${swatches}</div>
      <div class="areas-form-btns">
        <button class="area-cancel-btn" onclick="kedo._areasToggleForm()">Cancelar</button>
        <button class="area-confirm-btn" id="areas-confirm-btn" onclick="kedo._areasAdd()" disabled>Agregar</button>
      </div>
    </div>`;
}

export function areasSelColor(idx) {
  _selColor = idx;
  document.querySelectorAll('.area-color-swatch').forEach((s, i) => {
    s.classList.toggle('sel', i === idx);
    s.setAttribute('aria-checked', String(i === idx));
  });
}

export function areasToggleForm() {
  const form    = document.getElementById('areas-add-form');
  const trigger = document.getElementById('areas-add-trigger');
  if (!form) return;
  const visible = form.style.display !== 'none';
  form.style.display = visible ? 'none' : 'block';
  if (trigger) trigger.style.display = visible ? 'flex' : 'none';
  if (!visible) {
    areasSelColor(0);
    const inp = document.getElementById('areas-add-input');
    if (inp) { inp.value = ''; inp.focus(); }
    const btn = document.getElementById('areas-confirm-btn');
    if (btn) btn.disabled = true;
  }
}

export function areasAdd() {
  const inp = document.getElementById('areas-add-input');
  const label = inp?.value.trim();
  if (!label) return;
  const preset = COLOR_PRESETS[_selColor] || COLOR_PRESETS[0];
  setAreas([...AREAS, { id: 'a' + Date.now().toString(36), label, ...preset }]);
  save();
  _render();
  _rerenderDash();
}

export function areasDelete(areaId) {
  if (AREAS.length <= 1) return;
  const newAreas  = AREAS.filter(a => a.id !== areaId);
  const fallback  = newAreas[0].id;
  setTasks(   tasks.map(   t => t.area === areaId ? { ...t, area: fallback } : t));
  setHistory( history.map( t => t.area === areaId ? { ...t, area: fallback } : t));
  setEvents(  events.map(  e => e.area === areaId ? { ...e, area: fallback } : e));
  if (selArea      === areaId) setSelArea(fallback);
  if (selEventArea === areaId) setSelEventArea(fallback);
  setAreas(newAreas);
  save();
  _render();
  _rerenderDash();
}

function _rerenderDash() {
  const el = document.getElementById('view-dash');
  if (el?.classList.contains('is-active')) renderDash();
}

export function exposeAreasGlobals() {
  const k = window.kedo;
  k._openAreasDrawer  = openAreasDrawer;
  k._closeAreasDrawer = closeAreasDrawer;
  k._areasSelColor    = areasSelColor;
  k._areasToggleForm  = areasToggleForm;
  k._areasAdd         = areasAdd;
  k._areasDelete      = areasDelete;
}
