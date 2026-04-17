/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — app.js
   Punto de entrada · orquestador
   ═══════════════════════════════════════════════ */

import { exposeRouterGlobals }             from './js/router.js';
import { exposeGlobals, setRenderViewFn }  from './js/actions.js';
import { renderHome }                      from './js/views/home.js';

exposeGlobals();
exposeRouterGlobals(setRenderViewFn); // inyecta renderView en actions.js → rompe el import circular
renderHome();
