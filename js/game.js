// A small game hidden behind the dot next to the site name (desktop only).
//
// Press the dot: the big suit shakes and bursts into little rings, two lines of instructions
// come and go, the rings pop into tiny specks, the specks gather into a 3, then a 2, then a 1,
// and the 1 blows apart into the stars the game is played on. Then rings pop up
// for a moment each. Hit one before it goes and you score by how close to its centre you hit
// (10, 5, 3 or 1). Every hit makes the next rings a little quicker. Miss one and the score goes
// back to zero; the best run sits underneath in red. Press the dot again (or Esc) to leave.

const RINGS = [10, 5, 3, 1];   // points, from the centre out
const MAX = 2;                 // rings on screen at once while playing

// The intro, in milliseconds from the moment the suit bursts.
const SAY1 = [700, 2700], SAY2 = [2900, 4900];
const POP_FROM = 5000, POP_SPREAD = 1100, DARK = [4700, 6000], COUNT_AT = 6500;
const SPECKS = 11;                          // specks per popped ring
const DIGITS = [['3', 0], ['2', 1700], ['1', 2700]], BOOM_AT = 3700, BOOM = 1500;

const easeOut = (k) => 1 - (1 - k) ** 3;
const easeInOut = (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export default function startGame() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);
  const detail = $('#detail');

  /* ---------- the layer the game draws on ---------- */
  const root = document.createElement('div');
  root.className = 'game';
  root.hidden = true;
  root.innerHTML = '<canvas aria-hidden="true"></canvas><p class="game-say" aria-live="polite"></p>';
  $('#home').append(root);
  const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d');
  const say = root.querySelector('.game-say');

  let W = 0, H = 0, dpr = 1, diag = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight; diag = Math.hypot(W, H);
    canvas.width = W * dpr; canvas.height = H * dpr;
  };
  resize(); window.addEventListener('resize', resize);

  /* ---------- score ---------- */
  const score = document.createElement('span');
  score.className = 'score';
  score.hidden = true;
  score.innerHTML = '<b></b><i></i>';
  const nowEl = score.firstChild, bestEl = score.lastChild;
  $('.top').insertBefore(score, $('#clock'));
  let total = 0, best = 0, hits = 0;
  try { best = +localStorage.getItem('targets-best') || 0; } catch {}
  const paint = () => { nowEl.textContent = `${total} pts`; bestEl.textContent = best ? `best ${best}` : ''; };
  paint();

  // A ring got away: back to zero. If this run was the best yet, it slides down into the red line.
  const REST = 3400;
  function miss() {
    hits = 0;
    targets.length = 0;
    restUntil = performance.now() + REST;
    nextAt = restUntil + 300;
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

  /* ---------- the switch: an unlabelled dot next to the site name ---------- */
  const toggle = document.createElement('button');
  toggle.className = 'secret';
  toggle.setAttribute('aria-label', 'Something in the background');
  toggle.setAttribute('aria-pressed', 'false');
  $('.top > span').append(toggle);
  toggle.addEventListener('click', () => (on ? stop() : start()));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && on) stop(); });

  /* ---------- state ---------- */
  let on = false, leaving = null, phase = 'off', t0 = 0, fallback = 0;
  let intro = [], specks = [], targets = [], pops = [], stars = [], digit = -1, shock = 0;
  let nextAt = 0, restUntil = 0, mx = -1e4, my = -1e4;

  function setPhase(p) { phase = p; t0 = performance.now(); }

  function start() {
    if (!detail.hidden || W <= 760) return;
    // Drop the exit animation completely, or its last frame (clipped to nothing) would stay applied.
    root.getAnimations().forEach((a) => a.cancel()); leaving = null;
    on = true;
    toggle.classList.add('on'); toggle.setAttribute('aria-pressed', 'true');
    document.body.classList.add('game-on');
    root.hidden = false; root.style.clipPath = ''; restUntil = 0;
    say.style.opacity = 0;
    intro = []; specks = []; targets = []; pops = []; digit = -1;
    total = 0; hits = 0; paint(); score.hidden = true;
    setPhase('shake');
    window.dispatchEvent(new CustomEvent('game', { detail: 'explode' }));
    // If the 3D suit is not there (no WebGL), burst from where it would have been.
    clearTimeout(fallback);
    fallback = setTimeout(() => { if (phase === 'shake') burst(W * 0.74, H * 0.32, 90); }, 1100);
  }

  window.addEventListener('suit-burst', (e) => { if (on && phase === 'shake') burst(e.detail.x, e.detail.y, e.detail.r); });

  function burst(x, y, r) {
    clearTimeout(fallback);
    setPhase('intro');
    // Each ring flies to its own patch of a loose grid, so the splotches later cover everything.
    const cols = 8, rows = 6;
    for (let c = 0; c < cols; c++) for (let w = 0; w < rows; w++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * r * 0.6;
      intro.push({
        sx: x + Math.cos(a) * d, sy: y + Math.sin(a) * d,
        hx: ((c + 0.15 + Math.random() * 0.7) / cols) * W, hy: ((w + 0.15 + Math.random() * 0.7) / rows) * H,
        r: 6 + Math.random() * 9, fly: 900 + Math.random() * 700, wob: Math.random() * 6.28,
        popAt: POP_FROM + Math.random() * POP_SPREAD,
      });
    }
  }

  function stop() {
    if (!on) return;
    on = false;
    clearTimeout(fallback);
    toggle.classList.remove('on'); toggle.setAttribute('aria-pressed', 'false');
    score.hidden = true; setAim(null);
    document.body.classList.remove('game-on');
    window.dispatchEvent(new CustomEvent('game', { detail: 'restore' }));
    // The whole game folds back into the dot it came from.
    const b = toggle.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
    leaving = root.animate(
      [{ clipPath: `circle(${diag * 1.1}px at ${x}px ${y}px)` }, { clipPath: `circle(0px at ${x}px ${y}px)` }],
      { duration: calm ? 1 : 850, easing: 'cubic-bezier(.7,0,.25,1)', fill: 'forwards' },
    );
    leaving.onfinish = () => {
      leaving.cancel(); leaving = null; root.hidden = true; root.style.clipPath = 'circle(0px)'; phase = 'off'; restUntil = 0;
      intro = []; targets = []; pops = [];
      say.style.opacity = 0;
    };
  }

  /* ---------- the countdown, drawn with specks ---------- */
  // Every lit pixel (on a small grid) of a big serif digit, shuffled.
  function digitPoints(ch) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    const size = Math.min(H * 0.52, W * 0.42);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `400 ${size}px "Instrument Serif", Georgia, serif`;
    g.fillText(ch, W / 2, H / 2 + size * 0.05);
    const d = g.getImageData(0, 0, W, H).data, pts = [];
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (d[(y * W + x) * 4 + 3] > 140) pts.push([x, y]);
    for (let i = pts.length - 1; i > 0; i--) { const k = (Math.random() * (i + 1)) | 0; [pts[i], pts[k]] = [pts[k], pts[i]]; }
    return pts;
  }
  // Send every speck somewhere new, each leaving at a slightly different moment.
  function sendTo(points, now, stagger, dur) {
    specks.forEach((p, i) => {
      p.fx = p.x; p.fy = p.y; p.fz = p.z;
      [p.tx, p.ty] = points[i % points.length];
      p.st = now + Math.random() * stagger; p.dur = dur * (0.85 + Math.random() * 0.3);
    });
  }
  function moveSpecks(now, ease) {
    for (const p of specks) {
      const k = ease(clamp01((now - p.st) / p.dur));
      p.x = p.fx + (p.tx - p.fx) * k; p.y = p.fy + (p.ty - p.fy) * k; p.k = k;
    }
  }
  function drawSpecks(now, size, alpha) {
    for (const p of specks) {
      const sz = typeof size === 'function' ? size(p) : size, a = typeof alpha === 'function' ? alpha(p) : alpha;
      ctx.fillStyle = `rgba(242,241,237,${a})`;
      ctx.beginPath(); ctx.arc(p.x + Math.sin(now / 420 + p.tw) * 0.5, p.y + Math.cos(now / 380 + p.tw) * 0.5, sz, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawSpace(now, dt, alpha = 1) {
    ctx.fillStyle = '#060608'; ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      s.y -= s.v * dt; if (s.y < -2) { s.y = H + 2; s.x = Math.random() * W; }
      const a = alpha * s.a * (0.65 + 0.35 * Math.sin(now / 900 + s.tw));
      ctx.fillStyle = `rgba(242,241,237,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ---------- playing ---------- */
  function spawn(now) {
    const r = 17 + Math.random() * 6;
    for (let tries = 0; tries < 20; tries++) {
      const x = 40 + r + Math.random() * (W - 2 * r - 80);
      const y = 100 + r + Math.random() * (H - 2 * r - 150);
      if (targets.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + r + 60)) continue;
      targets.push({ x, y, r, born: now, life: Math.max(650, (2200 + Math.random() * 900) * 0.93 ** hits), hot: 0 });
      return;
    }
  }

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
      return;
    }
  }

  window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !on) return;
    if (phase === 'play') hit(e.clientX, e.clientY);
    else if (phase === 'intro') tryOut(e.clientX, e.clientY);
  });

  // Before the game starts the little rings are practice: they show what a click would score.
  function tryOut(x, y) {
    if (performance.now() - t0 > POP_FROM) return;
    for (const p of intro) {
      if (p.x === undefined) continue;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d > p.r + 5) continue;
      const pts = RINGS[Math.min(RINGS.length - 1, Math.floor((Math.min(d, p.r - 0.01) / p.r) * RINGS.length))];
      pops = pops.filter((q) => q.ring !== p);
      pops.push({ ring: p, x: p.x, y: p.y, r: p.r, px: x, py: y, pts, born: performance.now() });
      return;
    }
  }

  // Just a thin ring, the same as the cursor's, with a red hairline that runs down with its time.
  function drawTarget(t, fade, age) {
    const grow = calm ? 1 : easeOut(Math.min(1, age / 260));
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(242,241,237,${fade * (0.55 + t.hot * 0.4)})`;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r * (0.6 + 0.4 * grow), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,75,85,${fade * 0.6})`;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - age / t.life)); ctx.stroke();
  }

  let aimed = false;
  function setAim(v) {
    if (v === aimed) return;
    aimed = v;
    const r = $('.cur-ring'); if (r) r.classList.toggle('aim', v);
  }

  /* ---------- one frame ---------- */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (phase === 'off' || document.hidden) return;
    const e = now - t0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (phase === 'shake') return;

    if (phase === 'intro') {
      // the instructions, one line after the other
      const f = (a, b) => clamp01((e - a) / 380) * clamp01((b - e) / 380);
      if (e < SAY2[0]) { say.textContent = 'click as many targets as you can'; say.style.opacity = f(...SAY1); }
      else { say.textContent = 'the closer to the center the more points'; say.style.opacity = f(...SAY2); }

      // the room goes dark while the rings pop
      const dark = clamp01((e - DARK[0]) / (DARK[1] - DARK[0]));
      if (dark > 0) { ctx.fillStyle = `rgba(6,6,8,${easeInOut(dark)})`; ctx.fillRect(0, 0, W, H); }

      let over = false;
      for (const p of intro) {
        const k = easeOut(clamp01(e / p.fly));
        const x = p.sx + (p.hx - p.sx) * k + Math.sin(now / 1100 + p.wob) * 6 * k;
        const y = p.sy + (p.hy - p.sy) * k + Math.cos(now / 1300 + p.wob) * 6 * k;
        p.x = x; p.y = y;
        if (e < p.popAt) {
          const near = Math.hypot(mx - x, my - y) < p.r + 5;
          p.hot = (p.hot || 0) + ((near ? 1 : 0) - (p.hot || 0)) * 0.15;
          over = over || near;
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(242,241,237,${(0.7 + 0.3 * p.hot) * clamp01(e / 120)})`;
          ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.stroke();
        } else {
          // pop: a quick flash of the ring, and a little spray of specks
          if (!p.popped) {
            p.popped = true;
            for (let n = 0; n < SPECKS; n++) {
              const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 140;
              specks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, tw: Math.random() * 6.28,
                s: 0.35 + Math.random() ** 3 * 1.1, a: 0.15 + Math.random() * 0.55, v: 1 + Math.random() * 4 });
            }
          }
          const f = clamp01((e - p.popAt) / 260);
          if (f < 1) {
            ctx.strokeStyle = `rgba(242,241,237,${0.8 * (1 - f)})`;
            ctx.beginPath(); ctx.arc(x, y, p.r * (1 + f * 0.8), 0, Math.PI * 2); ctx.stroke();
          }
        }
      }
      const drag = Math.exp(-2.2 * dt);
      for (const p of specks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= drag; p.vy *= drag; }
      drawSpecks(now, 1.1, 0.85);
      setAim(on && over && e < POP_FROM);
      drawPops(now, e < POP_FROM ? 1 : clamp01(1 - (e - POP_FROM) / 400));
      if (e >= COUNT_AT) { say.style.opacity = 0; pops = []; setAim(false); setPhase('count'); }
      return;
    }

    if (phase === 'count') {
      ctx.fillStyle = '#060608'; ctx.fillRect(0, 0, W, H);
      let want = 0;
      DIGITS.forEach(([, at], i) => { if (e >= at) want = i; });
      if (want !== digit) {
        digit = want;
        // the first gathering is slow enough to watch; the next ones snap over
        sendTo(digitPoints(DIGITS[digit][0]), now, digit ? 220 : 600, digit ? 650 : 1000);
      }
      moveSpecks(now, easeInOut);
      drawSpecks(now, 1.25, (p) => 0.55 + 0.4 * p.k);
      if (e >= BOOM_AT) {
        // the 1 blows apart: every speck flies out to its own place in the sky
        const sky = specks.map(() => [Math.random() * W, Math.random() * H]);
        sendTo(sky, now, 60, BOOM);
        shock = now;
        setPhase('boom');
      }
      return;
    }

    if (phase === 'boom') {
      ctx.fillStyle = '#060608'; ctx.fillRect(0, 0, W, H);
      // a faint shockwave so the burst reads clearly
      const sk = clamp01((now - shock) / 900);
      if (sk < 1) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(242,241,237,${0.35 * (1 - sk)})`;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, diag * 0.55 * easeOut(sk), 0, Math.PI * 2); ctx.stroke();
      }
      moveSpecks(now, easeOut);
      drawSpecks(now, (p) => 1.7 + (p.s - 1.7) * p.k, (p) => 0.95 + (p.a - 0.95) * p.k);
      if (e >= BOOM * 1.2) {
        stars = specks.map((p) => ({ x: p.x, y: p.y, s: p.s, a: p.a, tw: p.tw, v: p.v }));
        specks = [];
        setPhase('play'); nextAt = now + 600;
        if (on) { score.hidden = false; paint(); }
      }
      return;
    }

    // play
    drawSpace(now, dt);
    if (now < restUntil) {
      const left = restUntil - now, gone = REST - left;
      say.textContent = gone < 1300 ? 'missed one' : `again in ${Math.ceil(left / 700)}`;
      say.style.opacity = clamp01(gone / 250) * clamp01(left / 250);
    } else if (restUntil) { say.style.opacity = 0; restUntil = 0; }
    if (on && !restUntil && targets.length < MAX && now > nextAt) { spawn(now); nextAt = now + 700 + Math.random() * 1800 * 0.95 ** hits; }
    let over = false;
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i], age = now - t.born;
      if (age > t.life) { targets.splice(i, 1); if (on) { miss(); break; } continue; }
      const near = Math.hypot(mx - t.x, my - t.y) < t.r + 5;
      if (near) over = true;
      t.hot += ((near ? 1 : 0) - t.hot) * 0.12;
      drawTarget(t, Math.min(1, age / 160, (t.life - age) / 350), age);
    }
    setAim(on && over);
    drawPops(now, 1);
  }

  // The little ring that spreads out and the "+N" that floats up after a hit.
  function drawPops(now, alpha) {
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i], k = (now - p.born) / 900;
      if (k >= 1) { pops.splice(i, 1); continue; }
      const g = easeOut(k), a = alpha * (1 - k);
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(242,241,237,${0.4 * a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + g * 0.9), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = p.pts === 10 ? `rgba(255,75,85,${a})` : `rgba(242,241,237,${0.85 * a})`;
      ctx.font = '500 12px "Geist Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`+${p.pts}`, p.px, p.py - 14 - g * 22);
    }
  }
  requestAnimationFrame(frame);
}
