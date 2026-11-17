// One polished object, turning slowly. Used by the quiet cards (about, find me).
import { THREE, makeStage, rightPane, gloss, chrome, suitSolid } from './kit.js';

export default function mount(stage, card) {
  const st = makeStage(rightPane(stage), { fov: 30, z: 9 });
  gloss(st, 1.05);
  const ac = new THREE.Color(card.pal.ac);
  const a = new THREE.PointLight(ac, 70, 30); a.position.set(-4, 3, 4);
  const b = new THREE.PointLight(0x6d8bff, 40, 30); b.position.set(4, -2, 5);
  st.scene.add(a, b);

  const mat = chrome(0xe9ebf2);
  const obj = card.gem === 'knot'
    ? new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.36, 260, 36, 2, 3), mat)
    : suitSolid(card.suit, mat);
  st.scene.add(obj);

  let px = 0, py = 0;
  st.onFrame((t) => {
    px += (st.pointer.x - px) * 0.04; py += (st.pointer.y - py) * 0.04;
    obj.scale.setScalar(Math.min(1.25, st.size.w / 620) * (card.gem === 'knot' ? 0.9 : 1.2));
    if (card.gem === 'knot') obj.rotation.set(t * 0.18 - py * 0.3, t * 0.25 + px * 0.5, 0);
    else obj.rotation.set(Math.sin(t * 0.37) * 0.14 - py * 0.25, Math.sin(t * 0.45) * 0.75 + px * 0.5, 0);
    obj.position.y = Math.sin(t * 0.8) * 0.1;
  });
  return () => st.dispose();
}
