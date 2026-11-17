// Shared helpers for the 3D scenes.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export { THREE };

// Makes a renderer that fills `host` (a canvas, or an element to put a canvas in),
// keeps it sized, runs a frame loop, and cleans everything up on dispose().
export function makeStage(host, { fov = 38, z = 8 } = {}) {
  const canvas = host instanceof HTMLCanvasElement ? host : host.appendChild(document.createElement('canvas'));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  camera.position.set(0, 0, z);

  const shifted = !(host instanceof HTMLCanvasElement) && host.classList.contains('stage-right');
  const pointer = { x: 0, y: 0, down: false };
  const onMove = (e) => {
    const b = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - b.left) / b.width) * 2 - 1;
    pointer.y = -(((e.clientY - b.top) / b.height) * 2 - 1);
  };
  window.addEventListener('pointermove', onMove);

  const size = { w: 1, h: 1 };
  const resize = () => {
    const b = canvas.getBoundingClientRect();
    size.w = Math.max(1, b.width); size.h = Math.max(1, b.height);
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    // On wide screens the text sits on the left, so slide the picture to the right.
    if (shifted && size.w > 760) camera.setViewOffset(size.w, size.h, -size.w * 0.19, 0, size.w, size.h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  let raf = 0, paused = false, frame = null, last = performance.now(), t = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (paused || document.hidden) return;
    t += dt;
    if (frame) frame(t, dt);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    renderer, scene, camera, canvas, pointer, size,
    onFrame(fn) { frame = fn; },
    setPaused(p) { paused = p; },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      });
      if (scene.environment) scene.environment.dispose();
      renderer.dispose();
      if (!(host instanceof HTMLCanvasElement)) canvas.remove();
    },
  };
}

// The right-hand area of a card page, where the 3D subject lives (the text sits on the left).
export function rightPane(stageEl) {
  const d = document.createElement('div');
  d.className = 'stage-right';
  stageEl.appendChild(d);
  return d;
}

export function lights(scene, accent = 0xffffff, amb = 0.55) {
  scene.add(new THREE.AmbientLight(0xffffff, amb));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.PointLight(accent, 60, 30); rim.position.set(-5, 2, -3); scene.add(rim);
  const fill = new THREE.PointLight(accent, 18, 30); fill.position.set(4, -4, 4); scene.add(fill);
  return { key, rim, fill };
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// A casino chip: coloured body, striped edge, printed faces. Radius 1, lying flat (axis = Y).
export function pokerChip(color = '#FF2E3A', label = '♠', ink = '#ECEAE3') {
  const g = new THREE.Group();
  const edge = canvasTexture(512, 32, (c, w, h) => {
    c.fillStyle = color; c.fillRect(0, 0, w, h);
    c.fillStyle = ink;
    for (let i = 0; i < 8; i++) c.fillRect(i * (w / 8) + 8, 0, w / 16 - 6, h);
  });
  const face = canvasTexture(512, 512, (c, w) => {
    const m = w / 2;
    c.fillStyle = color; c.beginPath(); c.arc(m, m, m, 0, 7); c.fill();
    c.fillStyle = ink;
    for (let i = 0; i < 8; i++) {
      c.save(); c.translate(m, m); c.rotate((i / 8) * Math.PI * 2 + 0.2);
      c.fillRect(-26, -m, 52, 62); c.restore();
    }
    c.strokeStyle = ink; c.lineWidth = 7; c.setLineDash([16, 12]);
    c.beginPath(); c.arc(m, m, m * 0.68, 0, 7); c.stroke(); c.setLineDash([]);
    c.fillStyle = ink; c.beginPath(); c.arc(m, m, m * 0.56, 0, 7); c.fill();
    c.fillStyle = color; c.font = '900 250px Archivo, Arial Black, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, m, m + 14);
  });
  const side = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.45, metalness: 0.1 });
  const top = new THREE.MeshStandardMaterial({ map: face, roughness: 0.4, metalness: 0.1 });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.16, 64), [side, top, top]);
  g.add(mesh);
  return g;
}

// Studio reflections, so shiny materials have something to reflect.
export function gloss(st, exposure = 1) {
  const pm = new THREE.PMREMGenerator(st.renderer);
  st.scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
  pm.dispose();
  st.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  st.renderer.toneMappingExposure = exposure;
}

// A polished pearl finish with a faint oil-slick sheen.
export function chrome(color = 0xe6e9f2, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, metalness: 0.4, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06, iridescence: 1, iridescenceIOR: 1.5, envMapIntensity: 1.5, ...extra,
  });
}

// Outlines of the four suits, each about 2 units tall and centred on the origin.
export function suitShapes() {
  const heart = new THREE.Shape();
  heart.moveTo(0, -0.95);
  heart.bezierCurveTo(-1.55, 0.0, -1.0, 1.25, 0, 0.42);
  heart.bezierCurveTo(1.0, 1.25, 1.55, 0.0, 0, -0.95);

  const diamond = new THREE.Shape();
  diamond.moveTo(0, 1.12); diamond.lineTo(0.78, 0); diamond.lineTo(0, -1.12); diamond.lineTo(-0.78, 0); diamond.closePath();

  const spadeTop = new THREE.Shape();
  spadeTop.moveTo(0, 1.05);
  spadeTop.bezierCurveTo(-1.55, 0.1, -1.0, -1.15, 0, -0.32);
  spadeTop.bezierCurveTo(1.0, -1.15, 1.55, 0.1, 0, 1.05);
  const stem = new THREE.Shape();
  stem.moveTo(0, -0.1); stem.quadraticCurveTo(-0.08, -0.8, -0.42, -1.05); stem.lineTo(0.42, -1.05); stem.quadraticCurveTo(0.08, -0.8, 0, -0.1);

  const circle = (x, y, r) => { const c = new THREE.Shape(); c.absarc(x, y, r, 0, Math.PI * 2); return c; };
  return {
    h: [heart],
    d: [diamond],
    s: [spadeTop, stem],
    c: [circle(0, 0.52, 0.5), circle(-0.52, -0.22, 0.5), circle(0.52, -0.22, 0.5), stem],
  };
}

// Inflates a flat outline into a smooth pillow: the outline becomes the rim, and the surface
// domes out to `depth` in front and behind. The outline must be visible in full from `centre`.
export function pillow(shape, [cx, cy], depth, around = 144, rings = 40) {
  const pts = shape.getPoints(64);
  const radius = (th) => {
    const dx = Math.cos(th), dy = Math.sin(th);
    let best = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ex = b.x - a.x, ey = b.y - a.y, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((a.x - cx) * ey - (a.y - cy) * ex) / den, u = ((a.x - cx) * dy - (a.y - cy) * dx) / den;
      if (t > best && u >= -1e-6 && u <= 1 + 1e-6) best = t;
    }
    return best;
  };
  const pos = [], idx = [];
  const rim = Array.from({ length: around }, (_, j) => radius((j / around) * Math.PI * 2));
  pos.push(cx, cy, depth);
  for (let i = 1; i < rings; i++) {
    const ph = (i / rings) * Math.PI, sp = Math.sin(ph) ** 0.75, z = Math.cos(ph) * depth;
    for (let j = 0; j < around; j++) {
      const th = (j / around) * Math.PI * 2;
      pos.push(cx + Math.cos(th) * rim[j] * sp, cy + Math.sin(th) * rim[j] * sp, z);
    }
  }
  pos.push(cx, cy, -depth);
  const last = pos.length / 3 - 1, at = (i, j) => 1 + (i - 1) * around + (j % around);
  for (let j = 0; j < around; j++) {
    idx.push(0, at(1, j), at(1, j + 1));
    for (let i = 1; i < rings - 1; i++) idx.push(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i, j + 1));
    idx.push(last, at(rings - 1, j + 1), at(rings - 1, j));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}

// A suit as a soft, rounded 3D solid, about 2 units tall.
export function suitSolid(key, mat) {
  const sh = suitShapes(), g = new THREE.Group();
  const add = (geo) => { const m = new THREE.Mesh(geo, mat); g.add(m); return m; };
  if (key === 'h') add(pillow(sh.h[0], [0, -0.05], 0.5));
  else if (key === 'd') add(pillow(sh.d[0], [0, 0], 0.4));
  else if (key === 'c') {
    for (const [x, y] of [[0, 0.52], [-0.52, -0.22], [0.52, -0.22]]) { const m = add(new THREE.SphereGeometry(0.52, 64, 48)); m.position.set(x, y, 0); m.scale.z = 0.8; }
    add(pillow(sh.c[3], [0, -0.82], 0.2));
  } else {
    add(pillow(sh.s[0], [0, 0.08], 0.5));
    add(pillow(sh.s[1], [0, -0.82], 0.2));
  }
  return g;
}
