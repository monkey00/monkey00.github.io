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

  // Spades and clubs are pearl white; hearts and diamonds are a glossy red.
  const pearl = chrome(0xe9ebf2);
  const ruby = chrome(0xff3a46, { metalness: 0.25, iridescence: 0.25, envMapIntensity: 1.2 });
  const holder = new THREE.Group(); scene.add(holder);
  const solids = {};
  for (const k of ['s', 'h', 'd', 'c']) { solids[k] = suitSolid(k, k === 'h' || k === 'd' ? ruby : pearl); solids[k].visible = false; holder.add(solids[k]); }

  // On phones the page scrolls, so the suit scrolls with it instead of floating over the cards.
  const page = document.getElementById('home');

  let shown = 's', want = 's', grow = 0;
  solids.s.visible = true;
  const onHero = (e) => { want = e.detail; };
  const onDetail = (e) => st.setPaused(e.detail);
  window.addEventListener('hero', onHero);
  window.addEventListener('detail', onDetail);

  // The hidden game: the suit shakes, then bursts (game.js draws the pieces), and later grows back.
  let shakeAt = -1, gone = false, goneFrames = 0;
  const onGame = (e) => {
    if (e.detail === 'explode') { if (!gone) shakeAt = performance.now(); }
    else { shakeAt = -1; if (gone) { gone = false; grow = 0; st.setPaused(false); } }
  };
  window.addEventListener('game', onGame);

  // The suit can be clicked too (on a computer): it starts the same hidden game as the dot.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const overSuit = (e) => {
    if (gone || shakeAt >= 0 || !holder.visible || st.size.w <= 760) return false;
    if (e.target instanceof Element && e.target.closest('button, a, .card, .game')) return false;
    ndc.set((e.clientX / st.size.w) * 2 - 1, -(e.clientY / st.size.h) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(holder, true).length > 0;
  };
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const onMove = (e) => { if (fine) document.body.classList.toggle('over-suit', overSuit(e)); };
  const onClick = (e) => {
    if (!fine || e.button !== 0 || document.body.classList.contains('game-on') || !overSuit(e)) return;
    document.body.classList.remove('over-suit');
    window.dispatchEvent(new Event('suit-click'));
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('click', onClick);
  const burst = () => {
    const v = holder.position.clone().project(camera);
    const hh = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    window.dispatchEvent(new CustomEvent('suit-burst', { detail: {
      x: ((v.x + 1) / 2) * st.size.w, y: ((1 - v.y) / 2) * st.size.h, r: holder.scale.x * (st.size.h / (2 * hh)),
    } }));
  };

  let px = 0, py = 0;
  st.onFrame((t, dt) => {
    if (gone) { holder.visible = false; if (++goneFrames > 2) st.setPaused(true); return; }
    const hh = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z, hw = hh * camera.aspect;
    const narrow = st.size.w <= 760;
    px += (pointer.x - px) * 0.035; py += (pointer.y - py) * 0.035;

    // shrink away, swap, grow back
    const leaving = want !== shown;
    grow += ((leaving ? 0 : 1) - grow) * Math.min(1, dt * (leaving ? 14 : 5));
    if (leaving && grow < 0.04) { solids[shown].visible = false; shown = want; solids[shown].visible = true; }

    const size = narrow ? hw * 0.24 : Math.min(hh * 0.3, hw * 0.24);
    holder.scale.setScalar(size * (0.001 + grow));
    const scrolled = narrow && page ? (page.scrollTop / st.size.h) * hh * 2 : 0;
    holder.position.set(narrow ? hw * 0.62 : hw * 0.5, (narrow ? hh * 0.73 : hh * 0.34) + scrolled + Math.sin(t * 0.8) * 0.08, 0);
    holder.visible = scrolled < hh;

    if (shakeAt >= 0) {
      const k = (performance.now() - shakeAt) / 700;
      if (k >= 1) { burst(); shakeAt = -1; gone = true; goneFrames = 0; holder.visible = false; return; }
      const amp = k ** 1.5 * size * 0.09;
      holder.position.x += (Math.random() - 0.5) * amp;
      holder.position.y += (Math.random() - 0.5) * amp;
      holder.rotation.z += (Math.random() - 0.5) * k * 0.5;
      holder.scale.multiplyScalar(1 + k * 0.12);
    }
    holder.rotation.set(Math.sin(t * 0.37) * 0.14 - py * 0.25, Math.sin(t * 0.45) * 0.75 + px * 0.5, Math.sin(t * 0.3) * 0.06);
  });
  return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('click', onClick); window.removeEventListener('game', onGame); window.removeEventListener('hero', onHero); window.removeEventListener('detail', onDetail); st.dispose(); };
}
