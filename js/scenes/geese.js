// Wild Geese, by Mary Oliver. Every line of the poem gets its own moving picture.
// The geese are one flock the whole way through: they wander, gather, travel, form up and settle.
import { LINES as TEXT, CREDIT } from '../poem.js';

// The pictures. Each has a sky (top, bottom), a colour for the geese, and optionally dark ink for the words.
const MODES = {
  lone:   { sky: ['#04060d', '#1b1622'], bird: [236, 226, 208] },   // one goose, at night
  walk:   { sky: ['#070812', '#2a1a22'], bird: [236, 226, 208] },   // a few, low over the desert
  soft:   { sky: ['#1a0b12', '#4a1f26'], bird: [255, 214, 190] },   // gathered, breathing
  pair:   { sky: ['#120c1f', '#3a2440'], bird: [232, 212, 238] },   // two groups, trading places
  world:  { sky: ['#16294a', '#f0a868'], bird: [22, 26, 40] },      // sun and rain
  land:   { sky: ['#1d3557', '#9fc0d4'], bird: [16, 22, 38] },      // the country going by underneath
  vee:    { sky: ['#2a78d2', '#cbe9ff'], bird: [16, 28, 52], ink: '#0b1d3a' }, // a V you can lead
  home:   { sky: ['#2b1e4a', '#ff9a62'], bird: [20, 16, 34] },      // heading for the light
  call:   { sky: ['#0c3b4a', '#7fd1c2'], bird: [8, 24, 30] },       // calling out
  open:   { sky: ['#3b2d63', '#f6c08f'], bird: [30, 22, 50] },      // the whole sky
  family: { sky: ['#050818', '#141d42'], bird: [255, 236, 200] },   // a constellation
};
// Which picture a line gets: the first pattern that matches its words wins.
const PICTURES = [
  [/family of things/i, 'family'],
  [/harsh|calls to you|announc/i, 'call'],
  [/wild geese|blue air/i, 'vee'],
  [/home/i, 'home'],
  [/imagination|offers itself/i, 'open'],
  [/mountains|rivers|prairies|trees|landscapes/i, 'land'],
  [/sun |rain|world goes on/i, 'world'],
  [/despair/i, 'pair'],
  [/soft animal|love/i, 'soft'],
  [/knees|desert|repent/i, 'walk'],
  [/lonely|good/i, 'lone'],
];
const pick = (text) => (PICTURES.find(([re]) => re.test(text)) || [0, 'world'])[1];
const LINES = TEXT.map((text) => { const mode = pick(text); return { text, mode, ...MODES[mode] }; });

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export default function mount(stage) {
  const cv = document.createElement('canvas');
  stage.appendChild(cv);
  stage.insertAdjacentHTML('beforeend', `
    <div class="hud wg-tip">Click for the next line</div>
    <div class="wg-line" id="wg-line"></div>
    <div class="hud wg-credit">${CREDIT}</div>
    <div class="wg-dots" id="wg-dots">${LINES.map((_, i) => `<button aria-label="Line ${i + 1}"></button>`).join('')}</div>`);
  const ctx = cv.getContext('2d');
  const lineEl = stage.querySelector('#wg-line');
  const dots = [...stage.querySelectorAll('#wg-dots button')];

  let W = 1, H = 1, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();

  const N = W < 700 ? 38 : 66;
  const birds = Array.from({ length: N }, (_, i) => ({
    x: Math.random() * W, y: Math.random() * H * 0.6, vx: 1, vy: 0, a: i === 0 ? 1 : 0,
    ph: Math.random() * 6, z: 0.65 + Math.random() * 0.7, i,
    // a fixed place in the final constellation, spread with the golden angle
    hx: 0.5 + Math.cos(i * 2.39996) * Math.sqrt((i + 0.5) / N) * 0.44,
    hy: 0.47 + Math.sin(i * 2.39996) * Math.sqrt((i + 0.5) / N) * 0.38,
    alt: 0.1 + ((i * 0.618) % 1) * 0.42, sp: 1.3 + ((i * 0.37) % 1) * 1.4,
    grp: i % 3, slot: Math.floor(i / 3),
  }));
  const pointer = { x: W / 2, y: H / 2, t: -1e9 };
  const onMove = (e) => { const b = cv.getBoundingClientRect(); pointer.x = e.clientX - b.left; pointer.y = e.clientY - b.top; pointer.t = performance.now(); };
  window.addEventListener('pointermove', onMove);

  // ----- the line of text -----
  let idx = -1, swapT, autoT;
  function show(n) {
    idx = (n + LINES.length) % LINES.length;
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    lineEl.classList.remove('on');
    clearTimeout(swapT);
    swapT = setTimeout(() => {
      stage.style.setProperty('--wg-ink', LINES[idx].ink || '#F4EFE3');
      lineEl.style.textShadow = LINES[idx].ink ? 'none' : '';
      lineEl.innerHTML = LINES[idx].text.split(' ').map((w, i) => `<span style="transition-delay:${i * 110}ms">${w}</span>`).join(' ');
      lineEl.classList.toggle('long', LINES[idx].text.length > 34);
      void lineEl.offsetWidth; lineEl.classList.add('on');
    }, 550);
    clearTimeout(autoT); autoT = setTimeout(() => show(idx + 1), LINES.length > 8 ? 7000 : 9500);
  }
  const onClick = () => show(idx + 1);
  cv.addEventListener('click', onClick);
  dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); show(idx + 1); }
    if (e.key === 'ArrowLeft') show(idx - 1);
  };
  window.addEventListener('keydown', onKey);
  show(0);

  // ----- scenery -----
  let skyTop = hex(LINES[0].sky[0]), skyBot = hex(LINES[0].sky[1]), birdCol = LINES[0].bird.slice();
  const amt = Object.fromEntries(Object.keys(MODES).map((m) => [m, 0]));
  const rings = []; let ringT = 0; // how present each picture is, 0..1
  const stars = Array.from({ length: 140 }, () => [Math.random(), Math.random() * 0.8, Math.random() * 1.4 + 0.3, Math.random() * 6]);
  const clouds = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), y: 0.12 + Math.random() * 0.6, s: 0.6 + Math.random() * 1.1, v: 0.004 + Math.random() * 0.008 }));
  const rain = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), v: 0.5 + Math.random() * 0.6 }));
  const ridge = (x, seed, rough) => Math.sin(x * 1.7 + seed) * 0.5 + Math.sin(x * 4.3 + seed * 2.1) * 0.25 * rough + Math.sin(x * 9.1 + seed * 3.7) * 0.12 * rough;

  function drawRidge(t, base, height, speed, seed, rough, color, trees) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
    const step = 14;
    for (let x = 0; x <= W + step; x += step) {
      const u = x / 260 + t * speed;
      ctx.lineTo(x, H * base - (ridge(u, seed, rough) * 0.5 + 0.5) * H * height);
    }
    ctx.lineTo(W, H); ctx.fill();
    if (trees) {
      const sp = 46, off = (t * speed * 260) % sp;
      for (let x = -off; x < W + sp; x += sp) {
        const y = H * base - (ridge(x / 260 + t * speed, seed, rough) * 0.5 + 0.5) * H * height;
        const h = 18 + ((Math.floor((x + t * speed * 260) / sp) * 37) % 22 + 22) % 22;
        ctx.beginPath(); ctx.moveTo(x - 9, y + 4); ctx.lineTo(x, y - h); ctx.lineTo(x + 9, y + 4); ctx.fill();
      }
    }
  }

  function drawBird(b, t, col) {
    if (b.a < 0.02) return;
    const ang = Math.atan2(b.vy, b.vx);
    const s = 11 * b.z * (W < 700 ? 0.8 : 1);
    const flap = Math.sin(t * (7 + b.z * 2) + b.ph) * 0.75;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(ang);
    ctx.strokeStyle = rgb(col, b.a); ctx.fillStyle = rgb(col, b.a); ctx.lineWidth = 1.7 * b.z; ctx.lineCap = 'round';
    // body with a long neck, then two wings that beat
    ctx.beginPath(); ctx.moveTo(-s * 0.45, 0); ctx.lineTo(s * 0.95, 0); ctx.stroke();
    for (const side of [-1, 1]) {
      // a long wing, swept gently back; the tip moves forward and back as it beats
      ctx.beginPath(); ctx.moveTo(s * 0.15, 0);
      ctx.quadraticCurveTo(s * 0.4, side * s * 0.75, -s * (0.25 + flap * 0.4), side * s * 1.45);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ----- frame -----
  let raf, last = performance.now(), t = 0;
  const leaders = [{ x: W * 0.5, y: H * 0.4, vx: 2, vy: 0 }, { x: W * 0.2, y: H * 0.25, vx: 2, vy: 0 }, { x: W * 0.8, y: H * 0.6, vx: 2, vy: 0 }];

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const L = LINES[idx], mode = L.mode, k = 1 - Math.pow(0.02, dt);
    skyTop = mix(skyTop, hex(L.sky[0]), k * 0.6); skyBot = mix(skyBot, hex(L.sky[1]), k * 0.6); birdCol = mix(birdCol, L.bird, k * 0.6);
    for (const m in amt) amt[m] += ((m === mode ? 1 : 0) - amt[m]) * k * 0.9;

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(skyTop)); g.addColorStop(1, rgb(skyBot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // stars: the first and last pictures are at night
    const night = Math.max(amt.lone, amt.walk, amt.family, amt.pair * 0.6);
    if (night > 0.02) for (const s of stars) {
      ctx.fillStyle = `rgba(255,244,220,${night * (0.35 + 0.45 * Math.sin(t * 1.3 + s[3]))})`;
      ctx.fillRect(s[0] * W, s[1] * H, s[2], s[2]);
    }
    // 1. a desert at night
    const desert = Math.min(1, amt.lone + amt.walk);
    if (desert > 0.02) {
      ctx.globalAlpha = desert;
      drawRidge(t, 1.0, 0.2, 0.01, 1.3, 0.3, '#151019');
      drawRidge(t, 1.04, 0.16, 0.02, 4.1, 0.2, '#0b080e');
      ctx.globalAlpha = 1;
    }
    // 2. something warm, breathing
    if (amt.soft > 0.02) {
      const br = 0.5 + 0.5 * Math.sin(t * 1.15), R = Math.min(W, H) * (0.3 + br * 0.07);
      for (let i = 0; i < 3; i++) {
        const cx = W / 2 + Math.cos(t * 0.4 + i * 2.1) * R * 0.16, cy = H / 2 + Math.sin(t * 0.5 + i * 2.1) * R * 0.12;
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (0.9 + i * 0.12));
        rg.addColorStop(0, `rgba(255,150,120,${0.34 * amt.soft})`); rg.addColorStop(0.6, `rgba(230,80,90,${0.14 * amt.soft})`); rg.addColorStop(1, 'rgba(230,80,90,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }
    }
    // 3. sun, rain, and the land moving past underneath
    if (amt.world > 0.02) {
      ctx.globalAlpha = amt.world;
      const su = (t * 0.035) % 1, sx = W * (0.1 + su * 0.8), sy = H * (0.72 - Math.sin(su * Math.PI) * 0.34);
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.5);
      sg.addColorStop(0, 'rgba(255,236,190,.95)'); sg.addColorStop(0.07, 'rgba(255,214,150,.75)'); sg.addColorStop(0.3, 'rgba(255,180,120,.16)'); sg.addColorStop(1, 'rgba(255,180,120,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(235,244,255,.5)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (const r of rain) {
        r.y += r.v * dt; r.x -= r.v * dt * 0.18; if (r.y > 1) { r.y = 0; r.x = Math.random() * 1.2; }
        const x = r.x * W, y = r.y * H * 0.8; ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 20);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // the light the geese fly home towards
    if (amt.home > 0.02) {
      const hx = W * 0.86, hy = H * 0.62, hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, H * 0.6);
      hg.addColorStop(0, `rgba(255,232,190,${0.95 * amt.home})`); hg.addColorStop(0.1, `rgba(255,190,130,${0.6 * amt.home})`); hg.addColorStop(1, 'rgba(255,170,110,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
    }
    // mountains, deep trees, prairie and a river, all moving past underneath
    const ground = Math.min(1, amt.world + amt.land + amt.home);
    if (ground > 0.02) {
      ctx.globalAlpha = ground;
      drawRidge(t, 0.9, 0.36, 0.05, 2.0, 1.0, '#3b4a72');           // mountains
      drawRidge(t, 0.95, 0.24, 0.11, 5.2, 0.6, '#27375a', true);     // deep trees
      drawRidge(t, 1.0, 0.13, 0.22, 8.4, 0.25, '#15213c');           // prairie
      const ry = H * 0.94;                                           // a river catching the light
      const rv = ctx.createLinearGradient(0, ry, W, ry);
      rv.addColorStop(0, 'rgba(255,200,150,0)'); rv.addColorStop(0.5 + 0.3 * Math.sin(t * 0.3), 'rgba(255,214,170,.6)'); rv.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.fillStyle = rv; ctx.fillRect(0, ry, W, 3);
      ctx.globalAlpha = 1;
    }
    // calls going out across the sky
    if (amt.call > 0.02) {
      ringT -= dt;
      if (mode === 'call' && ringT < 0) { const b = birds[(Math.random() * N) | 0]; rings.push({ x: b.x, y: b.y, r: 0 }); ringT = 0.45; }
      ctx.lineWidth = 1.3;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]; r.r += dt * 90;
        const a = (1 - r.r / 260) * amt.call;
        if (a <= 0) { rings.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(235,255,250,${a * 0.7})`; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke();
      }
    }
    // 4. clean blue air
    if (amt.vee > 0.02) for (const c of clouds) {
      c.x += c.v * dt; if (c.x > 1.3) c.x = -0.3;
      const cx = c.x * W, cy = c.y * H, r = 90 * c.s;
      for (let i = 0; i < 4; i++) {
        const cg = ctx.createRadialGradient(cx + i * r * 0.7, cy + Math.sin(i * 2) * r * 0.15, 0, cx + i * r * 0.7, cy, r);
        cg.addColorStop(0, `rgba(255,255,255,${0.5 * amt.vee})`); cg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = cg; ctx.fillRect(cx - r * 2, cy - r, r * 6, r * 2);
      }
    }

    // ----- where every goose wants to be -----
    const led = performance.now() - pointer.t < 2600;
    if (mode === 'vee') leaders.forEach((l, i) => {
      const tx = i === 0 && led ? pointer.x : W * (0.5 + 0.36 * Math.sin(t * 0.33 + i * 2.1));
      const ty = i === 0 && led ? pointer.y : H * (0.4 + 0.24 * Math.sin(t * 0.47 + i * 1.3));
      l.vx += (tx - l.x) * 0.002; l.vy += (ty - l.y) * 0.002;
      const sp = Math.hypot(l.vx, l.vy) || 1, want = 3.2; l.vx = (l.vx / sp) * want; l.vy = (l.vy / sp) * want;
      l.x += l.vx * dt * 60; l.y += l.vy * dt * 60;
    });
    if (mode === 'home') leaders.forEach((l, i) => {
      const tx = W * 0.88, ty = H * (0.5 + i * 0.07);
      l.vx += (tx - l.x) * 0.002; l.vy += (ty - l.y) * 0.002;
      const sp = Math.hypot(l.vx, l.vy) || 1, want = 2.6; l.vx = (l.vx / sp) * want; l.vy = (l.vy / sp) * want;
      l.x += l.vx * dt * 60; l.y += l.vy * dt * 60;
      if (l.x > W * 0.84) { // arrived: the next skein comes in from the left
        const dx = -l.x - 80 - i * 140, dy = H * (0.18 + i * 0.16) - l.y;
        l.x += dx; l.y += dy; l.vx = want; l.vy = 0;
        for (const b of birds) if (b.grp === i) { b.x += dx; b.y += dy; }
      }
    });
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.15);

    for (const b of birds) {
      let tx, ty, pull = 0.012, drag = 0.93, alpha = 1;
      if (mode === 'lone') {
        alpha = b.i === 0 ? 1 : 0;
        tx = led ? pointer.x : W * (0.5 + 0.3 * Math.sin(t * 0.25)); ty = led ? pointer.y - 60 : H * (0.32 + 0.1 * Math.sin(t * 0.4));
        if (b.i !== 0) { tx = W * 0.5 + Math.cos(b.ph) * W; ty = -80; }
        pull = 0.004; drag = 0.975;
      } else if (mode === 'soft') {
        const r = Math.min(W, H) * (0.1 + (b.i / N) * 0.24) * (0.82 + breathe * 0.36), an = b.ph + t * (0.25 + b.z * 0.2);
        tx = W / 2 + Math.cos(an) * r * 1.35; ty = H / 2 + Math.sin(an) * r * 0.8; pull = 0.02; drag = 0.9;
      } else if (mode === 'walk') {
        alpha = b.i < 9 ? 1 : 0;
        b.vx += (0.35 + b.sp * 0.25 - b.vx) * 0.05;
        const gy = H * (0.74 + (b.i % 5) * 0.012) - Math.abs(Math.sin(t * 2.2 + b.ph)) * 7;
        b.vy = (b.vy + (gy - b.y) * 0.01) * 0.9;
        if (b.x > W + 40) b.x = -40;
        tx = null;
      } else if (mode === 'pair') {
        const right = (b.i % 2 === 0) !== (Math.sin(t * 0.22 + b.ph) > 0.72);
        const r = Math.min(W, H) * (0.05 + ((b.i * 0.618) % 1) * 0.13), an = b.ph + t * (0.3 + b.z * 0.2);
        tx = W * (right ? 0.7 : 0.3) + Math.cos(an) * r * 1.2; ty = H * 0.46 + Math.sin(an) * r; pull = 0.008; drag = 0.94;
      } else if (mode === 'call') {
        const r = Math.min(W, H) * (0.16 + (b.i / N) * 0.26), an = b.ph + t * (0.18 + b.z * 0.12);
        tx = W / 2 + Math.cos(an) * r * 1.7; ty = H * 0.46 + Math.sin(an * 1.3) * r * 0.75; pull = 0.006; drag = 0.95;
      } else if (mode === 'open') {
        tx = (0.5 + (b.hx - 0.5) * 2.1) * W + Math.cos(t * 0.3 + b.ph) * 30; ty = (0.47 + (b.hy - 0.47) * 2.1) * H + Math.sin(t * 0.4 + b.ph) * 24;
        pull = 0.004; drag = 0.95;
      } else if (mode === 'world' || mode === 'land') {
        b.vx += (b.sp * 1.7 - b.vx) * 0.05; b.vy += (Math.sin(t * 0.8 + b.ph) * 0.35 - b.vy) * 0.05;
        if (b.x > W + 40) { b.x = -40; b.y = H * b.alt; }
        ty = H * b.alt; b.vy += (ty - b.y) * 0.0015; tx = null;
      } else if (mode === 'vee' || mode === 'home') {
        const l = leaders[b.grp], sp = Math.hypot(l.vx, l.vy) || 1, ux = l.vx / sp, uy = l.vy / sp;
        const row = Math.ceil(b.slot / 2), side = b.slot % 2 ? 1 : -1, gap = 26;
        tx = l.x - ux * row * gap + -uy * side * row * gap * 0.62; ty = l.y - uy * row * gap + ux * side * row * gap * 0.62;
        pull = 0.03; drag = 0.86;
      } else {
        tx = b.hx * W; ty = b.hy * H; pull = 0.006; drag = 0.94;
      }
      if (tx !== null) { b.vx = (b.vx + (tx - b.x) * pull) * drag; b.vy = (b.vy + (ty - b.y) * pull) * drag; }
      b.x += b.vx * dt * 60; b.y += b.vy * dt * 60;
      b.a += (alpha - b.a) * 0.04;
    }

    // 5. the family of things: everything quietly connected, and the visitor has a place in it
    if (amt.family > 0.05) {
      const reach = Math.min(W, H) * 0.2;
      ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const a = birds[i], b = birds[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < reach) { ctx.strokeStyle = `rgba(255,214,160,${(1 - d / reach) * 0.5 * amt.family})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      if (led) {
        const near = birds.map((b) => [Math.hypot(b.x - pointer.x, b.y - pointer.y), b]).sort((p, q) => p[0] - q[0]).slice(0, 5);
        ctx.strokeStyle = `rgba(255,179,122,${0.9 * amt.family})`; ctx.lineWidth = 1.4;
        for (const [, b] of near) { ctx.beginPath(); ctx.moveTo(pointer.x, pointer.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        ctx.fillStyle = `rgba(255,179,122,${amt.family})`; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 5, 0, 7); ctx.fill();
      }
      for (const b of birds) { ctx.fillStyle = `rgba(255,236,200,${0.5 * amt.family * b.a})`; ctx.beginPath(); ctx.arc(b.x, b.y, 2.2 * b.z, 0, 7); ctx.fill(); }
    }
    for (const b of birds) drawBird(b, t, birdCol);
  }
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf); clearTimeout(swapT); clearTimeout(autoT); ro.disconnect();
    window.removeEventListener('pointermove', onMove); window.removeEventListener('keydown', onKey);
  };
}
