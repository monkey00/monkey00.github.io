// The home screen's one 3D object: a polished suit that turns slowly and becomes
// whichever suit you are looking at.
import { THREE, makeStage, gloss, chrome, suitSolid } from './kit.js';

export default function mount(canvas) {
  const st = makeStage(canvas, { fov: 30, z: 10 });
  const { scene, camera, pointer } = st;
  gloss(st, 1.05);
  const warm = new THREE.PointLight(0xff5a64, 50, 30); warm.position.set(-4, 2.5, 4);
  const cool = new THREE.PointLight(0x6d8bff, 60, 30); cool.position.set(4, -2, 5);
  scene.add(warm, cool);

  const mat = chrome(0xe9ebf2);
  const holder = new THREE.Group(); scene.add(holder);
  const solids = {};
  for (const k of ['s', 'h', 'd', 'c']) { solids[k] = suitSolid(k, mat); solids[k].visible = false; holder.add(solids[k]); }

  let shown = 's', want = 's', grow = 0;
  solids.s.visible = true;
  const onHero = (e) => { want = e.detail; };
  const onDetail = (e) => st.setPaused(e.detail);
  window.addEventListener('hero', onHero);
  window.addEventListener('detail', onDetail);

  let px = 0, py = 0;
  st.onFrame((t, dt) => {
    const hh = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z, hw = hh * camera.aspect;
    const narrow = st.size.w <= 760;
    px += (pointer.x - px) * 0.035; py += (pointer.y - py) * 0.035;

    // shrink away, swap, grow back
    const leaving = want !== shown;
    grow += ((leaving ? 0 : 1) - grow) * Math.min(1, dt * (leaving ? 14 : 5));
    if (leaving && grow < 0.04) { solids[shown].visible = false; shown = want; solids[shown].visible = true; }

    const size = narrow ? hw * 0.24 : Math.min(hh * 0.3, hw * 0.24);
    holder.scale.setScalar(size * (0.001 + grow));
    holder.position.set(narrow ? hw * 0.62 : hw * 0.5, (narrow ? hh * 0.73 : hh * 0.34) + Math.sin(t * 0.8) * 0.08, 0);
    holder.rotation.set(Math.sin(t * 0.37) * 0.14 - py * 0.25, Math.sin(t * 0.45) * 0.75 + px * 0.5, Math.sin(t * 0.3) * 0.06);
  });
  return () => { window.removeEventListener('hero', onHero); window.removeEventListener('detail', onDetail); st.dispose(); };
}
