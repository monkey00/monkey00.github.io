// Product Space: the club's logo built as four glossy 3D pieces, floating among a few stars.
import { THREE, makeStage, rightPane, gloss } from './kit.js';

// The four pieces of the logo, traced from the artwork (pixel coordinates, y down),
// each with the two colours of its gradient and the direction the gradient runs in.
const PIECES = [
  { pts: [[190, 136], [350, 58], [503, 138], [503, 328], [350, 415], [350, 230]], from: '#7A3A9E', to: '#4A1C74', axis: 'y', lift: 0.16 },
  { pts: [[178, 158], [318, 235], [178, 305]], from: '#B85AAE', to: '#5B2684', axis: 'x', lift: 0 },
  { pts: [[330, 252], [330, 405], [195, 328]], from: '#B552A8', to: '#5B2684', axis: 'x', lift: 0.06 },
  { pts: [[178, 350], [330, 422], [330, 580], [178, 505]], from: '#B24E9F', to: '#EDB89C', axis: 'y', lift: 0 },
];
const CX = 340, CY = 320, UNIT = 175;

// A polygon with its corners rounded off.
function rounded(points, r) {
  const s = new THREE.Shape(), n = points.length;
  const v = points.map(([x, y]) => new THREE.Vector2((x - CX) / UNIT, -(y - CY) / UNIT));
  for (let i = 0; i < n; i++) {
    const p = v[i], a = v[(i + n - 1) % n], b = v[(i + 1) % n];
    const inn = p.clone().add(a.clone().sub(p).setLength(Math.min(r, a.distanceTo(p) / 2)));
    const out = p.clone().add(b.clone().sub(p).setLength(Math.min(r, b.distanceTo(p) / 2)));
    if (i === 0) s.moveTo(inn.x, inn.y); else s.lineTo(inn.x, inn.y);
    s.quadraticCurveTo(p.x, p.y, out.x, out.y);
  }
  s.closePath();
  return s;
}

export default function mount(stage) {
  const st = makeStage(rightPane(stage), { fov: 30, z: 10 });
  gloss(st, 1.05);
  const a = new THREE.PointLight(0xd9a8ff, 70, 30); a.position.set(-4, 3, 5);
  const b = new THREE.PointLight(0xffffff, 40, 30); b.position.set(4, -3, 5);
  st.scene.add(a, b);

  const logo = new THREE.Group(); st.scene.add(logo);
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.15, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
  const D = 0.5;
  const pieces = PIECES.map((p, i) => {
    const geo = new THREE.ExtrudeGeometry(rounded(p.pts, 0.07), { depth: D, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: 6, curveSegments: 10 });
    geo.translate(0, 0, -D / 2);
    // paint the gradient across the piece
    geo.computeBoundingBox();
    const box = geo.boundingBox, pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const c0 = new THREE.Color(p.from), c1 = new THREE.Color(p.to), c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const t = p.axis === 'x' ? (pos.getX(k) - box.min.x) / (box.max.x - box.min.x) : (box.max.y - pos.getY(k)) / (box.max.y - box.min.y);
      c.copy(c0).lerp(c1, t); col.set([c.r, c.g, c.b], k * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, mat); logo.add(m);
    return { m, lift: p.lift, i };
  });

  const N = 260, sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { sp[i * 3] = (Math.random() - 0.5) * 40; sp[i * 3 + 1] = (Math.random() - 0.5) * 24; sp[i * 3 + 2] = -6 - Math.random() * 20; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xf3ecff, size: 0.05, transparent: true, opacity: 0.7 }));
  st.scene.add(stars);

  let px = 0, py = 0;
  st.onFrame((t) => {
    px += (st.pointer.x - px) * 0.04; py += (st.pointer.y - py) * 0.04;
    logo.scale.setScalar(Math.min(1.25, st.size.w / 560));
    logo.rotation.set(Math.sin(t * 0.37) * 0.1 - py * 0.25, Math.sin(t * 0.45) * 0.6 + px * 0.5, Math.sin(t * 0.3) * 0.04);
    logo.position.y = Math.sin(t * 0.8) * 0.1;
    // the pieces sit at slightly different depths and breathe apart a little
    for (const p of pieces) p.m.position.z = p.lift + Math.sin(t * 0.9 + p.i * 1.4) * 0.06;
    stars.rotation.z = t * 0.008;
  });
  return () => st.dispose();
}
