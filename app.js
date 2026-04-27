/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — app.js
   Punto de entrada · orquestador
   ═══════════════════════════════════════════════ */

import { exposeRouterGlobals }                          from './js/router.js';
import { exposeGlobals, setRenderViewFn, initPlanDrawerSwipe } from './js/actions.js';
import { renderHome }                                   from './js/views/home.js';

window.kedo = {};
exposeGlobals();
exposeRouterGlobals(setRenderViewFn); // inyecta renderView en actions.js → rompe el import circular
renderHome();
/* drawer swipe-down-to-close: el handle ya existe en index.html al cargar */
initPlanDrawerSwipe();
