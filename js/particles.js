/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — particles.js
   Motor de partículas canvas
   ═══════════════════════════════════════════════ */

const cvs  = document.getElementById('px');
const pctx = cvs.getContext('2d');

const resize = () => { cvs.width = innerWidth; cvs.height = innerHeight; };
resize();
addEventListener('resize', resize);

let parts = [];
let running = false;

/* ── BURST TASK (naranja/fuego) ── */
function burstTask(x, y) {
  const fc = ['#ff4500','#ff6b00','#ff8c00','#ffa500','#ffcc00','#ff3500','#ffb700'];
  for (let i = 0; i < 38; i++) {
    const sx  = (Math.random() - 0.5) * 54;
    const spd = 2 + Math.random() * 4.8;
    const ang = -(Math.PI * 0.5) + (Math.random() - 0.5) * 0.95;
    parts.push({
      x: x + sx, y: y + 8,
      vx: Math.cos(ang) * spd * 0.55 + sx * 0.035,
      vy: Math.sin(ang) * spd,
      alpha: 0.88 + Math.random() * 0.12,
      sz: 3.5 + Math.random() * 6.5,
      color: fc[Math.floor(Math.random() * fc.length)],
      life: 0, max: 24 + Math.random() * 22,
      grav: -0.055, flame: true,
    });
  }
  for (let i = 0; i < 18; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 2.8 + Math.random() * 5.5;
    parts.push({
      x: x + (Math.random() - 0.5) * 28, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 3.2,
      alpha: 1, sz: 1.3 + Math.random() * 2.2,
      color: Math.random() > 0.45 ? '#ffcc00' : Math.random() > 0.5 ? '#ff8c00' : '#fff1a0',
      life: 0, max: 50 + Math.random() * 38,
      grav: 0.1, flame: false,
    });
  }
}

/* ── BURST HABIT (púrpura/estrellas) ── */
function burstHabit(x, y) {
  const hc = ['#6c63d4','#8b80f0','#afa9ec','#c4bef8','#fff'];
  for (let i = 0; i < 28; i++) {
    const ang = (Math.random() * Math.PI * 2);
    const spd = 1.8 + Math.random() * 4.2;
    parts.push({
      x: x + (Math.random() - 0.5) * 20, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 2.5,
      alpha: 1, sz: 2 + Math.random() * 4,
      color: hc[Math.floor(Math.random() * hc.length)],
      life: 0, max: 35 + Math.random() * 30,
      grav: 0.08, flame: false,
    });
  }
}

/* ── BURST CHECK STREAK (verde) ── */
function burstStreak(x, y) {
  const sc = ['#1a9268','#5dcaa5','#9fe1cb','#e8f5f0','#fff'];
  for (let i = 0; i < 32; i++) {
    const ang = (Math.random() * Math.PI * 2);
    const spd = 2 + Math.random() * 5;
    parts.push({
      x: x + (Math.random() - 0.5) * 16, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 3,
      alpha: 1, sz: 2.5 + Math.random() * 4,
      color: sc[Math.floor(Math.random() * sc.length)],
      life: 0, max: 40 + Math.random() * 32,
      grav: 0.09, flame: false,
    });
  }
}

/* ── LOOP ── */
function loop() {
  running = true;
  pctx.clearRect(0, 0, cvs.width, cvs.height);
  parts = parts.filter(p => p.life < p.max);
  parts.forEach(p => {
    p.life++;
    p.x += p.vx; p.y += p.vy;
    p.vy += p.grav !== undefined ? p.grav : 0.14;
    if (p.flame) p.vx *= 0.93;
    const t = p.life / p.max;
    p.alpha = Math.max(0, (1 - t) * (p.flame ? 1 : 0.95));
    const sz = p.flame ? p.sz * (1 - t * 0.72) : p.sz * (1 - t * 0.28);
    if (sz <= 0.2) return;
    if (p.flame && p.sz > 5.5) {
      pctx.beginPath(); pctx.arc(p.x, p.y, sz * 1.9, 0, Math.PI * 2);
      pctx.fillStyle = p.color + '1a'; pctx.fill();
    }
    pctx.beginPath(); pctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
    pctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0');
    pctx.fill();
  });
  if (parts.length) requestAnimationFrame(loop);
  else { running = false; pctx.clearRect(0, 0, cvs.width, cvs.height); }
}

/* ── EXPORT ── */
export function fireBurst(x, y, type = 'task') {
  if (type === 'habit')  burstHabit(x, y);
  else if (type === 'streak') burstStreak(x, y);
  else                   burstTask(x, y);
  if (!running) loop();
}
