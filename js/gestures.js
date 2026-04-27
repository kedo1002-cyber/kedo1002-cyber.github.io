/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — gestures.js
   Swipe-to-reveal genérico: delete / complete
   Swipe-down-to-close: bottom sheet drawers
   ═══════════════════════════════════════════════ */

export function attachSwipeReveal(wrap, {
  cardSelector,
  backSelector,
  iconSelector,
  onConfirm,
  vibrate = 30,
}) {
  if (wrap.dataset.swipeInit) return;
  wrap.dataset.swipeInit = '1';

  const card = wrap.querySelector(cardSelector);
  const back = wrap.querySelector(backSelector);
  const icon = wrap.querySelector(iconSelector);
  if (!card || !back || !icon) return;

  let sx = 0, sy = 0, pull = 0, axis = null;

  card.addEventListener('touchstart', e => {
    if (!e.touches.length) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    pull = 0; axis = null;
    card.style.transition = 'none';
    back.style.transition = 'none';
  }, { passive: true });

  card.addEventListener('touchmove', e => {
    if (!e.touches.length) return;
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

  const snapBack = () => {
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
      navigator.vibrate && navigator.vibrate(vibrate);
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
        setTimeout(() => onConfirm(wrap), 290);
      }, 220);
    } else { snapBack(); }
  }, { passive: true });

  card.addEventListener('touchcancel', snapBack, { passive: true });
}

/* ── SWIPE-DOWN-TO-CLOSE para bottom sheet drawers ── */
export function initDrawerSwipe({ handleId, drawerId, backdropId, onClose }) {
  const handle = document.getElementById(handleId);
  const drawer = document.getElementById(drawerId);
  if (!handle || !drawer || handle.dataset.swipeBound) return;
  handle.dataset.swipeBound = '1';

  let drag = { on: false, startY: 0, dy: 0 };

  handle.addEventListener('touchstart', e => {
    if (!drawer.classList.contains('open')) return;
    const t = e.touches ? e.touches[0] : e;
    drag = { on: true, startY: t.clientY, dy: 0 };
    drawer.classList.add('dragging');
  }, { passive: true });

  handle.addEventListener('touchmove', e => {
    if (!drag.on) return;
    const t = e.touches ? e.touches[0] : e;
    const dy = t.clientY - drag.startY;
    drag.dy = dy;
    if (dy > 0) {
      drawer.style.transform = `translateY(${dy}px)`;
      const bd = backdropId ? document.getElementById(backdropId) : null;
      if (bd) bd.style.opacity = String(Math.max(1 - dy / 320, 0.15));
    }
  }, { passive: true });

  const end = () => {
    if (!drag.on) return;
    const dy = drag.dy;
    drag = { on: false, startY: 0, dy: 0 };
    drawer.classList.remove('dragging');
    const bd = backdropId ? document.getElementById(backdropId) : null;
    if (bd) bd.style.opacity = '';
    if (dy > 110) onClose();
    else drawer.style.transform = '';
  };

  handle.addEventListener('touchend',    end, { passive: true });
  handle.addEventListener('touchcancel', end, { passive: true });
}
