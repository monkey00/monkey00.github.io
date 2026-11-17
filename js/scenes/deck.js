// This Deck: the twelve cards of the site as a slow, glossy carousel.
import { THREE, makeStage, rightPane, gloss, canvasTexture } from './kit.js';
import { CARDS, SUITS, RANK_LABEL } from '../cards.js';

const CW = 1, CH = 1.42;

export default function mount(stage) {
  const st = makeStage(rightPane(stage), { fov: 30, z: 11 });
  gloss(st, 1.1);
  const a = new THREE.PointLight(0xff5a64, 40, 30); a.position.set(-5, 3, 5);
  const b = new THREE.PointLight(0x6d8bff, 50, 30); b.position.set(5, -2, 5);
  st.scene.add(a, b);

  const outline = new THREE.Shape();
  const w = CW / 2, h = CH / 2, r = 0.08;
  outline.moveTo(-w + r, -h); outline.lineTo(w - r, -h); outline.quadraticCurveTo(w, -h, w, -h + r);
  outline.lineTo(w, h - r); outline.quadraticCurveTo(w, h, w - r, h); outline.lineTo(-w + r, h);
  outline.quadraticCurveTo(-w, h, -w, h - r); outline.lineTo(-w, -h + r); outline.quadraticCurveTo(-w, -h, -w + r, -h);
  const geo = new THREE.ExtrudeGeometry(outline, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -0.006);
  const edge = new THREE.MeshPhysicalMaterial({ color: 0xcfd3dc, metalness: 1, roughness: 0.15 });

  const backMat = new THREE.MeshPhysicalMaterial({ color: 0x15171d, metalness: 0.3, roughness: 0.25, clearcoat: 1 });
  const ring = new THREE.Group(); st.scene.add(ring);
  const cards = CARDS.map((card, i) => {
    const suit = SUITS[card.suit];
    const tex = canvasTexture(320, 454, (c, W, H) => {
      const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1d1f27'); g.addColorStop(1, '#0b0c10');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const glow = c.createRadialGradient(W / 2, H * 1.1, 0, W / 2, H * 1.1, H * 0.8);
      glow.addColorStop(0, card.pal.ac + '66'); glow.addColorStop(1, card.pal.ac + '00');
      c.fillStyle = glow; c.fillRect(0, 0, W, H);
      c.fillStyle = '#F2F1ED'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '56px "Instrument Serif", Georgia, serif'; c.fillText(RANK_LABEL[card.rank], 44, 50);
      c.fillStyle = suit.red ? '#FF4B55' : '#F2F1ED'; c.font = '36px Georgia, serif'; c.fillText(suit.glyph, 44, 96);
      c.fillStyle = card.pal.ac; c.font = '150px Georgia, serif'; c.fillText(suit.glyph, W / 2, H / 2 + 10);
    });
    // The outline is drawn in card units, so map those straight onto the picture.
    tex.repeat.set(1 / CW, 1 / CH); tex.offset.set(0.5, 0.5);
    const face = new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.2, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 });
    const m = new THREE.Mesh(geo, [face, edge]);
    // a plain back, so the card never shows its face mirrored from behind
    const back = new THREE.Mesh(new THREE.PlaneGeometry(CW * 0.97, CH * 0.98), backMat); back.position.z = -0.014; back.rotation.y = Math.PI; m.add(back);
    const pivot = new THREE.Group(); pivot.add(m); ring.add(pivot);
    return { pivot, m, i };
  });

  let px = 0, py = 0;
  st.onFrame((t) => {
    px += (st.pointer.x - px) * 0.04; py += (st.pointer.y - py) * 0.04;
    ring.scale.setScalar(Math.min(1, st.size.w / 900));
    ring.rotation.set(0.22 - py * 0.2, t * 0.22 + px * 0.6, -0.12);
    for (const c of cards) {
      const an = (c.i / cards.length) * Math.PI * 2;
      c.pivot.rotation.y = an;
      c.m.position.set(0, Math.sin(t * 0.7 + c.i * 0.9) * 0.12, 2.1);
      c.m.rotation.z = Math.sin(t * 0.5 + c.i) * 0.05;
    }
  });
  return () => st.dispose();
}
