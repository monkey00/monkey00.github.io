// UC Berkeley: a low-poly Campanile. The clock shows the real time in Berkeley.
import { THREE, makeStage, rightPane } from './kit.js';

export default function mount(stage) {
  const st = makeStage(rightPane(stage), { fov: 36, z: 13 });
  const { scene, camera } = st;
  scene.add(new THREE.AmbientLight(0x8fa8d8, 0.9));
  const sun = new THREE.DirectionalLight(0xffd88a, 3); sun.position.set(-5, 6, 6); scene.add(sun);
  const glow = new THREE.PointLight(0xfdb515, 50, 20); glow.position.set(0, 3.2, 0); scene.add(glow);

  const world = new THREE.Group(); scene.add(world);
  const stone = new THREE.MeshStandardMaterial({ color: 0xe6dfcc, roughness: 0.85, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b2244, roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xfdb515, roughness: 0.35, metalness: 0.5, emissive: 0x7a4f00 });
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); world.add(m); return m; };

  box(1.9, 0.25, 1.9, stone, 0, -3.1, 0); box(1.5, 0.3, 1.5, stone, 0, -2.85, 0);
  box(1.1, 5.2, 1.1, stone, 0, -0.1, 0); // shaft
  for (let i = 0; i < 7; i++) for (const s of [0, 1, 2, 3]) { // slit windows up the shaft
    const w = box(0.1, 0.26, 0.02, dark, 0, -2.2 + i * 0.5, 0.56);
    w.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), (s * Math.PI) / 2); w.rotation.y = (s * Math.PI) / 2;
  }
  box(1.26, 0.12, 1.26, stone, 0, 2.56, 0);
  box(1.14, 1.0, 1.14, stone, 0, 3.12, 0); // belfry
  for (const s of [0, 1, 2, 3]) for (const k of [-1, 0, 1]) { // three arches per side
    const a = box(0.22, 0.66, 0.04, dark, k * 0.33, 3.14, 0.57);
    a.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), (s * Math.PI) / 2); a.rotation.y = (s * Math.PI) / 2;
  }
  box(1.3, 0.12, 1.3, stone, 0, 3.68, 0);
  box(0.74, 0.5, 0.74, stone, 0, 3.98, 0);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.5, 4), stone); spire.position.y = 4.98; spire.rotation.y = Math.PI / 4; world.add(spire);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), gold); tip.position.y = 5.8; world.add(tip);
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const o = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 4), stone); o.position.set(x * 0.56, 3.98, z * 0.56); world.add(o);
  }

  // clocks on all four sides
  const hands = [];
  const faceMat = new THREE.MeshStandardMaterial({ color: 0xfff7e0, emissive: 0xfdb515, emissiveIntensity: 0.55 });
  for (const s of [0, 1, 2, 3]) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CircleGeometry(0.36, 40), faceMat));
    const hr = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.01), dark); hr.geometry.translate(0, 0.09, 0.01);
    const mn = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.31, 0.01), dark); mn.geometry.translate(0, 0.145, 0.015);
    g.add(hr, mn); hands.push({ hr, mn });
    g.position.set(0, 2.05, 0.561).applyAxisAngle(new THREE.Vector3(0, 1, 0), (s * Math.PI) / 2); g.rotation.y = (s * Math.PI) / 2;
    world.add(g);
  }

  // ground, trees
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.9, 0.3, 48), new THREE.MeshStandardMaterial({ color: 0x0f3b2a, roughness: 1, flatShading: true }));
  ground.position.y = -3.38; world.add(ground);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x1f7a4d, roughness: 0.9, flatShading: true });
  const trunk = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 1 });
  const trees = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.2, r = 2.3 + ((i * 37) % 19) / 10;
    const h = 0.8 + ((i * 53) % 10) / 10;
    const t = new THREE.Group();
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.38, h, 6), leaf); c1.position.y = h / 2 + 0.25;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.27, h * 0.7, 6), leaf); c2.position.y = h * 0.85 + 0.25;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6), trunk); tr.position.y = 0.12;
    t.add(c1, c2, tr); t.position.set(Math.cos(a) * r, -3.23, Math.sin(a) * r);
    world.add(t); trees.push(t);
  }

  // stars
  const N = 400, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 46; pos[i * 3 + 1] = Math.random() * 22 - 6; pos[i * 3 + 2] = -8 - Math.random() * 16; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff7e0, size: 0.07, transparent: true, opacity: 0.85 })));

  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
  let px = 0, py = 0;
  camera.position.set(0, 2.2, 18.5); camera.lookAt(0, 1.2, 0);
  st.onFrame((t) => {
    px += (st.pointer.x - px) * 0.05; py += (st.pointer.y - py) * 0.05;
    world.scale.setScalar(Math.min(1, st.size.w / 560, st.size.h / 620));
    world.rotation.y = t * 0.22 + px * 0.9; world.rotation.x = 0.1 - py * 0.12;
    world.position.y = Math.sin(t * 0.8) * 0.08;
    const [h, m, s] = fmt.format(new Date()).split(':').map(Number);
    const mins = m + s / 60, hrs = (h % 12) + mins / 60;
    for (const c of hands) { c.mn.rotation.z = -(mins / 60) * Math.PI * 2; c.hr.rotation.z = -(hrs / 12) * Math.PI * 2; }
    trees.forEach((tr, i) => { tr.rotation.z = Math.sin(t * 1.3 + i) * 0.04; });
    glow.intensity = 45 + Math.sin(t * 2) * 8;
  });
  return () => st.dispose();
}
