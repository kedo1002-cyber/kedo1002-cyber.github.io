/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — app.js
   Punto de entrada · orquestador
   ═══════════════════════════════════════════════ */

import { exposeRouterGlobals }                          from './js/router.js';
import { exposeGlobals, setRenderViewFn, initPlanDrawerSwipe } from './js/actions.js';
import { renderHome, ehHandleClick }                    from './js/views/home.js';
import { exposeAreasGlobals }                           from './js/views/areas.js';

window.kedo = {};
exposeGlobals();
exposeRouterGlobals(setRenderViewFn); // inyecta renderView en actions.js → rompe el import circular
exposeAreasGlobals();
window.kedo.ehHandleClick = ehHandleClick;

renderHome();
/* drawer swipe-down-to-close: el handle ya existe en index.html al cargar */
initPlanDrawerSwipe();
