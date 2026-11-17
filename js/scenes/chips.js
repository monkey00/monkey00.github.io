// Stacks of poker chips. Click to throw more in. One chip keeps flipping above the pile.
import { THREE, makeStage, rightPane, lights, pokerChip } from './kit.js';

export default function mount(stage) {
  const pane = rightPane(stage);
  const st = makeStage(pane, { fov: 36, z: 9 });
  const { scene, camera } = st;
  lights(scene, 0xff2e3a, 0.7);
  camera.position.set(0, 3.6, 9.6); camera.lookAt(0, 0.9, 0);

  const protos = [
    pokerChip('#FF2E3A', '♥', '#FBEDEA'), pokerChip('#ECEAE3', '♠', '#14060A'), pokerChip('#16181F', '♣', '#FF2E3A'),
    pokerChip('#3D7BFF', '♦', '#ECEAE3'), pokerChip('#1E8A56', '♠', '#ECEAE3'),
  ];
  const world = new THREE.Group(); scene.add(world);
  const S = 0.62, TH = 0.16 * S + 0.004;
  const stacks = [[-1.7, 0.4], [-0.5, -0.5], [0.75, 0.45], [1.85, -0.35], [0.1, 1.5], [-1.4, -1.5], [1.3, -1.6]].map(([x, z]) => ({ x, z, n: 0 }));
  const chips = [];

  function add(si, fromY = 7, delay = 0) {
    const s = stacks[si];
    const m = protos[(si + (Math.random() < 0.25 ? 1 : 0)) % protos.length].clone();
    m.scale.setScalar(S);
    m.rotation.y = Math.random() * 6;
    const restY = TH / 2 + s.n * TH; s.n++;
    m.position.set(s.x + (Math.random() - 0.5) * 0.05, fromY, s.z + (Math.random() - 0.5) * 0.05);
    m.visible = false;
    world.add(m);
    chips.push({ m, y: fromY, vy: 0, restY, delay, done: false, spin: (Math.random() - 0.5) * 8 });
  }
  stacks.forEach((s, i) => { const n = 4 + Math.floor(Math.random() * 9); for (let k = 0; k < n; k++) add(i, 5 + k * 0.5, i * 0.12 + k * 0.05); });

  // the hero chip, tossed like a coin
  const hero = pokerChip('#FF2E3A', 'A', '#FBEDEA'); hero.scale.setScalar(1.25); scene.add(hero);

  const toss = () => {
    const short = stacks.filter((s) => s.n < 26);
    if (!short.length) { // table is full: sweep the pot and start over
      chips.splice(0).forEach((c) => world.remove(c.m)); stacks.forEach((s) => { s.n = 0; });
      stacks.forEach((s, i) => { for (let k = 0; k < 5; k++) add(i, 5 + k * 0.5, k * 0.05); });
      return;
    }
    for (let k = 0; k < 3; k++) add(stacks.indexOf(short[Math.floor(Math.random() * short.length)]), 6 + k * 0.6, k * 0.07);
  };
  pane.style.cursor = 'pointer';
  pane.addEventListener('click', toss);

  st.onFrame((t, dt) => {
    world.rotation.y = t * 0.16 + st.pointer.x * 0.3;
    const sc = Math.min(1, st.size.w / 560); world.scale.setScalar(sc);
    for (const c of chips) {
      if (c.done) continue;
      if (c.delay > 0) { c.delay -= dt; continue; }
      c.m.visible = true;
      c.vy -= 26 * dt; c.y += c.vy * dt; c.m.rotation.y += c.spin * dt;
      if (c.y <= c.restY) {
        c.y = c.restY;
        if (Math.abs(c.vy) < 2.2) c.done = true; else c.vy = -c.vy * 0.28;
      }
      c.m.position.y = c.y;
    }
    const u = (t * 0.55) % 1; // one toss
    hero.position.set(0, 1.9 * sc + Math.sin(u * Math.PI) * 0.8, 0.5);
    hero.rotation.set(Math.PI / 2 + u * Math.PI * 4, 0, Math.sin(t) * 0.3);
    hero.scale.setScalar(0.8 * sc);
  });
  return () => st.dispose();
}
