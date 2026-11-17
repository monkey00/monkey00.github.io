// A quiet game hiding in the background, off until someone finds the little dot in the header.
// Once it is on, thin rings like the cursor's pop up around the home screen for a couple of
// seconds each. Click one before it goes and you score by how close to its centre you hit: 10, 5, 3 or 1.
// Every ring you hit makes the next ones last a little less long.
// Let one get away and the score goes back to zero. The best run sits underneath in red.
// Desktop only (a real mouse and a wide screen), and never while a card is open.

const RINGS = [10, 5, 3, 1];          // points, from the centre out
const MAX = 2;

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
  score.innerHTML = '<b></b><i></i>';
  const nowEl = score.firstChild, bestEl = score.lastChild;
  document.querySelector('.top').insertBefore(score, document.getElementById('clock'));
  let total = 0, best = 0, hits = 0, enabled = false;
  try { best = +localStorage.getItem('targets-best') || 0; } catch {}
  const paint = () => { nowEl.textContent = `${total} pts`; bestEl.textContent = best ? `best ${best}` : ''; };
  paint();

  // A target got away: back to zero. If this run was the best yet, it slides down into the red line.
  function miss() {
    hits = 0;
    if (!total) return;
    const ran = total;
    total = 0;
    if (ran > best) {
      best = ran;
      try { localStorage.setItem('targets-best', String(best)); } catch {}
      if (!calm) {
        const ghost = nowEl.cloneNode(true);
        ghost.className = 'ghost';
        score.append(ghost);
        const drop = bestEl.offsetTop - nowEl.offsetTop;
        bestEl.style.opacity = '0';
        ghost.animate(
          [{ transform: 'translate(-50%, 0)', color: '#B7B8BF' }, { transform: `translate(-50%, ${drop}px)`, color: '#FF4B55' }],
          { duration: 650, easing: 'cubic-bezier(.65,0,.2,1)' },
        ).onfinish = () => { ghost.remove(); bestEl.style.opacity = ''; paint(); };
        nowEl.textContent = '0 pts';
        nowEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 250, fill: 'backwards' });
        return;
      }
    } else if (!calm) {
      nowEl.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 400 });
    }
    paint();
  }

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
    else targets.length = 0;
    score.hidden = !enabled;
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
    const r = 17 + Math.random() * 6;
    const box = intro.getBoundingClientRect();
    for (let tries = 0; tries < 20; tries++) {
      const x = r + 30 + Math.random() * (W - 2 * r - 60);
      const y = 80 + r + Math.random() * Math.max(10, H * 0.62 - 80 - 2 * r);
      if (x > box.left - r - 30 && x < box.right + r + 30 && y > box.top - r - 30 && y < box.bottom + r + 30) continue;
      if (targets.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + r + 60)) continue;
      const a = 0, v = 0;
      targets.push({ x, y, r, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: now, life: Math.max(650, (2200 + Math.random() * 900) * 0.93 ** hits), hot: 0 });
      return;
    }
  }

  const live = () => enabled && detail.hidden && W > 760;
  function hit(x, y) {
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i], d = Math.hypot(x - t.x, y - t.y);
      if (d > t.r + 5) continue;
      const pts = RINGS[Math.min(RINGS.length - 1, Math.floor((Math.min(d, t.r - 0.01) / t.r) * RINGS.length))];
      targets.splice(i, 1);
      pops.push({ x: t.x, y: t.y, r: t.r, px: x, py: y, pts, born: performance.now() });
      total += pts; hits++;
      paint();
      nowEl.classList.remove('bump'); void nowEl.offsetWidth; nowEl.classList.add('bump');
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
    if (!live()) { setAim(null); targets.length = 0; return; }

    if (targets.length < MAX && now > nextAt) { spawn(now); nextAt = now + 900 + Math.random() * 2200; }

    let over = null;
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i], age = now - t.born;
      if (age > t.life) { targets.splice(i, 1); miss(); continue; }
      t.x += t.vx * dt; t.y += t.vy * dt;
      if (t.x < t.r || t.x > W - t.r) t.vx *= -1;
      if (t.y < 70 + t.r || t.y > H * 0.66) t.vy *= -1;
      const near = Math.hypot(mx - t.x, my - t.y) < t.r;
      if (near) over = t;
      t.hot += ((near ? 1 : 0) - t.hot) * 0.12;
      const fade = Math.min(1, age / 160, (t.life - age) / 350);
      drawTarget(t, fade, age);
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

  // Just a thin ring, the same as the cursor's. It pops in, then quietly runs out of time.
  function drawTarget(t, fade, age) {
    const grow = calm ? 1 : 1 - (1 - Math.min(1, age / 260)) ** 3;
    const left = 1 - age / t.life;
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(242,241,237,${fade * (0.5 + t.hot * 0.4)})`;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r * (0.6 + 0.4 * grow), 0, Math.PI * 2); ctx.stroke();
    // a hairline just outside it that shrinks away as the time runs down
    ctx.strokeStyle = `rgba(255,75,85,${fade * 0.55})`;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke();
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
