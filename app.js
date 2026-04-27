/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — app.js
   Punto de entrada · orquestador
   ═══════════════════════════════════════════════ */

import { exposeRouterGlobals }                          from './js/router.js';
import { exposeGlobals, setRenderViewFn, initPlanDrawerSwipe } from './js/actions.js';
import { renderHome }                                   from './js/views/home.js';
import { openAreasDrawer, closeAreasDrawer,
         areasSelColor, areasToggleForm,
         areasAdd, areasDelete }                        from './js/views/areas.js';

window.kedo = {};
exposeGlobals();
exposeRouterGlobals(setRenderViewFn); // inyecta renderView en actions.js → rompe el import circular

window.kedo._openAreasDrawer  = openAreasDrawer;
window.kedo._closeAreasDrawer = closeAreasDrawer;
window.kedo._areasSelColor    = areasSelColor;
window.kedo._areasToggleForm  = areasToggleForm;
window.kedo._areasAdd         = areasAdd;
window.kedo._areasDelete      = areasDelete;

renderHome();
/* drawer swipe-down-to-close: el handle ya existe en index.html al cargar */
initPlanDrawerSwipe();
