// Qualcomm: the company's Q mark as a glossy 3D solid. Drag to turn it.
import { THREE, makeStage, rightPane, gloss } from './kit.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// Outline of the Qualcomm Q (24 x 24 units).
const Q = 'M12 0C6.22933 0 1.5761 4.48645 1.5761 10.47394c0 6.00417 4.65323 10.47394 10.4239 10.47394.98402 0 1.93468-.13343 2.8353-.3836l1.13412 2.9187c.11675.31688.35025.51702.7672.51702h1.80125c.43364 0 .75052-.28353.55038-.83391l-1.46768-3.81932c2.88534-1.81793 4.80333-5.03683 4.80333-8.8895C22.4239 4.48644 17.77067 0 12 0m4.53648 16.5615l-1.31758-3.41904c-.11675-.28353-.35024-.55038-.85059-.55038h-1.71786c-.43363 0-.7672.28353-.56706.83391l1.73454 4.48645c-.56706.1501-1.18416.21682-1.81793.21682-4.2196 0-7.22168-3.31897-7.22168-7.65532C4.77832 6.1376 7.7804 2.81862 12 2.81862s7.22168 3.31898 7.22168 7.65532c0 2.5351-1.01737 4.70327-2.6852 6.08756';

export default function mount(stage) {
  const pane = rightPane(stage);
  const st = makeStage(pane, { fov: 30, z: 10 });
  gloss(st, 1.1);
  const a = new THREE.PointLight(0x8fb0ff, 80, 30); a.position.set(-4, 3, 5);
  const b = new THREE.PointLight(0xffffff, 40, 30); b.position.set(4, -3, 5);
  st.scene.add(a, b);

  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${Q}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 3.2, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.32, bevelSegments: 10, curveSegments: 48 });
  geo.center(); geo.rotateX(Math.PI); geo.scale(0.15, 0.15, 0.15); // SVG's y axis points down
  const logo = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x3253dc, metalness: 0.45, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05 }));
  st.scene.add(logo);

  // drag to turn; it eases back afterwards
  let drag = null, turn = 0, tilt = 0;
  const down = (e) => { drag = { x: e.clientX, y: e.clientY, turn, tilt }; };
  const move = (e) => { if (drag) { turn = drag.turn + (e.clientX - drag.x) * 0.01; tilt = THREE.MathUtils.clamp(drag.tilt + (e.clientY - drag.y) * 0.006, -0.7, 0.7); } };
  const up = () => { drag = null; };
  st.canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);

  let px = 0, py = 0;
  st.onFrame((t) => {
    px += (st.pointer.x - px) * 0.04; py += (st.pointer.y - py) * 0.04;
    if (!drag) { turn *= 0.96; tilt *= 0.96; }
    logo.scale.setScalar(Math.min(0.95, st.size.w / 700));
    logo.rotation.set(Math.sin(t * 0.37) * 0.1 - py * 0.2 + tilt, Math.sin(t * 0.45) * 0.6 + px * 0.4 + turn, 0);
    logo.position.y = Math.sin(t * 0.8) * 0.1;
  });
  return () => {
    st.canvas.removeEventListener('pointerdown', down);
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    st.dispose();
  };
}
