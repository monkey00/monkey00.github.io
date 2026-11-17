// A quiet game hiding in the background, off until someone finds the little dot in the header.
// Once it is on, a few soft glowing orbs drift around the home screen. Click one and you score
// by how close to its centre you hit: 10, 5, 3 or 1.
// Desktop only (a real mouse and a wide screen), and never while a card is open.

const RINGS = [10, 5, 3, 1];          // points, from the centre out
const MAX = 3;

export default function startTargets() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'targets';
  canvas.setAttribute('aria-hidden', 'true');
  document.getElementById('bg').after(canvas);
  const ctx = canvas.getContext('2d');

  const score = document.createElement('span');
  score.className = 'score';
  score.hidden = true;
  document.querySelector('.top').insertBefore(score, document.getElementById('clock'));
  let total = 0, enabled = false;

  // The switch: an unlabelled dot next to the site name. Hollow when off, filled when on.
  const toggle = document.createElement('button');
  toggle.className = 'secret';
  toggle.setAttribute('aria-label', 'Something in the background');
  toggle.setAttribute('aria-pressed', 'false');
  document.querySelector('.top > span').append(toggle);
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    toggle.classList.toggle('on', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    if (enabled) nextAt = performance.now() + 500;
    else { targets.length = 0; score.hidden = true; }
    if (enabled && total) score.hidden = false;
  });

  const ring = () => document.querySelector('.cur-ring');
  const detail = document.getElementById('detail');
  const intro = document.getElementById('intro');
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
  };
  resize(); window.addEventListener('resize', resize);

  const targets = [], pops = [];
  let nextAt = performance.now() + 2500, mx = -1e4, my = -1e4, aiming = null;

  // Somewhere open: above the cards and clear of the name and buttons.
  function spawn(now) {
    const r = 30 + Math.random() * 16;
    const box = intro.getBoundingClientRect();
    for (let tries = 0; tries < 20; tries++) {
      const x = r + 30 + Math.random() * (W - 2 * r - 60);
      const y = 80 + r + Math.random() * Math.max(10, H * 0.62 - 80 - 2 * r);
      if (x > box.left - r - 30 && x < box.right + r + 30 && y > box.top - r - 30 && y < box.bottom + r + 30) continue;
      if (targets.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + r + 60)) continue;
      const a = Math.random() * Math.PI * 2, v = calm ? 0 : 5 + Math.random() * 7;
      targets.push({ x, y, r, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: now, life: 16000 + Math.random() * 10000, hot: 0 });
      return;
    }
  }

  const live = () => enabled && detail.hidden && W > 760;
  function hit(x, y) {
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i], d = Math.hypot(x - t.x, y - t.y);
      if (d > t.r) continue;
      const pts = RINGS[Math.min(RINGS.length - 1, Math.floor((d / t.r) * RINGS.length))];
      targets.splice(i, 1);
      pops.push({ x: t.x, y: t.y, r: t.r, px: x, py: y, pts, born: performance.now() });
      total += pts;
      score.hidden = false;
      score.textContent = `${total} pts`;
      score.classList.remove('bump'); void score.offsetWidth; score.classList.add('bump');
      return true;
    }
    return false;
  }

  window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !live()) return;
    // Cards, buttons and links always win.
    if (e.target instanceof Element && e.target.closest('button, a, .card')) return;
    hit(e.clientX, e.clientY);
  });

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.hidden) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!live()) { setAim(null); return; }

    if (targets.length < MAX && now > nextAt) { spawn(now); nextAt = now + 3000 + Math.random() * 5000; }

    let over = null;
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i], age = now - t.born;
      if (age > t.life) { targets.splice(i, 1); continue; }
      t.x += t.vx * dt; t.y += t.vy * dt;
      if (t.x < t.r || t.x > W - t.r) t.vx *= -1;
      if (t.y < 70 + t.r || t.y > H * 0.66) t.vy *= -1;
      const near = Math.hypot(mx - t.x, my - t.y) < t.r;
      if (near) over = t;
      t.hot += ((near ? 1 : 0) - t.hot) * 0.12;
      const fade = Math.min(1, age / 1800, (t.life - age) / 1800);
      drawTarget(t, fade);
    }
    setAim(over);

    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i], k = (now - p.born) / 900;
      if (k >= 1) { pops.splice(i, 1); continue; }
      const e = 1 - (1 - k) ** 3;
      ctx.strokeStyle = `rgba(242,241,237,${0.35 * (1 - k)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + e * 0.9), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = p.pts === 10 ? `rgba(255,75,85,${1 - k})` : `rgba(242,241,237,${0.85 * (1 - k)})`;
      ctx.font = '500 12px "Geist Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`+${p.pts}`, p.px, p.py - 14 - e * 22);
    }
  }

  // A soft orb: a glow that fades out from the middle and one thin edge. No rings, no dots.
  function drawTarget(t, fade) {
    const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r);
    const a = fade * (0.16 + t.hot * 0.14);
    g.addColorStop(0, `rgba(255,120,128,${a * 1.4})`);
    g.addColorStop(0.45, `rgba(170,150,255,${a * 0.6})`);
    g.addColorStop(1, 'rgba(120,130,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(242,241,237,${fade * (0.08 + t.hot * 0.16)})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.stroke();
  }

  let aimed = false;
  function setAim(t) {
    const on = !!t;
    if (on === aimed) return;
    aimed = on;
    const r = ring(); if (r) r.classList.toggle('aim', on);
  }

  requestAnimationFrame(frame);
}
