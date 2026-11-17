// Boston: a football thrown in a tight spiral and a basketball that will not stop bouncing.
import { THREE, makeStage, rightPane, lights } from './kit.js';

export default function mount(stage) {
  const st = makeStage(rightPane(stage), { fov: 38, z: 9 });
  const { scene } = st;
  lights(scene, 0xc8102e, 0.75);
  const world = new THREE.Group(); scene.add(world);

  // football: a lathe-turned prolate shape, long axis = Y, then laid along X
  const prof = [];
  for (let i = 0; i <= 28; i++) { const y = -1 + (i / 28) * 2; prof.push(new THREE.Vector2(0.56 * Math.pow(Math.max(0, 1 - y * y), 0.62), y * 1.02)); }
  const fb = new THREE.Group();
  const leather = new THREE.MeshStandardMaterial({ color: 0x7b3a1c, roughness: 0.75 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.6 });
  fb.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 40), leather));
  for (const y of [-0.66, 0.66]) {
    const r = 0.56 * Math.pow(1 - (y / 1.02) ** 2, 0.62) + 0.004;
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 8, 48), white); stripe.rotation.x = Math.PI / 2; stripe.position.y = y; fb.add(stripe);
  }
  const lace = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.62, 0.035), white); lace.position.set(0, 0, 0.57); fb.add(lace);
  for (let i = -3; i <= 3; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.035), white); l.position.set(0, i * 0.085, 0.575); fb.add(l); }
  const fbSpin = new THREE.Group(); fb.rotation.z = Math.PI / 2; fbSpin.add(fb);
  const fbPath = new THREE.Group(); fbPath.add(fbSpin); world.add(fbPath);

  // basketball
  const bb = new THREE.Group();
  bb.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 48), new THREE.MeshStandardMaterial({ color: 0xe0661f, roughness: 0.7 })));
  const seam = new THREE.MeshStandardMaterial({ color: 0x15100c, roughness: 0.8 });
  const s1 = new THREE.Mesh(new THREE.TorusGeometry(0.802, 0.014, 8, 80), seam);
  const s2 = s1.clone(); s2.rotation.y = Math.PI / 2;
  const s3 = s1.clone(); s3.rotation.x = Math.PI / 2;
  const s4 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.014, 8, 80), seam); s4.rotation.y = Math.PI / 2; s4.position.x = 0.5;
  const s5 = s4.clone(); s5.position.x = -0.5;
  bb.add(s1, s2, s3, s4, s5); world.add(bb);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.8, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 }));
  shadow.rotation.x = -Math.PI / 2; world.add(shadow);
  const floor = new THREE.GridHelper(24, 24, 0xc8102e, 0x1c2c4a); floor.position.y = -2.62; world.add(floor);

  // confetti in team colours
  const bits = [];
  const bg = new THREE.PlaneGeometry(0.1, 0.16);
  [0xc8102e, 0xb0b7bc, 0x007a33, 0xf2f4f8].forEach((c, ci) => {
    const mat = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(bg, mat); m.position.set((Math.random() - 0.5) * 12, Math.random() * 9 - 3, (Math.random() - 0.5) * 6 - 1);
      world.add(m); bits.push({ m, v: 0.4 + Math.random() * 0.7, r: Math.random() * 4 + ci });
    }
  });

  let px = 0;
  st.onFrame((t, dt) => {
    px += (st.pointer.x - px) * 0.05;
    const sc = Math.min(1, st.size.w / 620); world.scale.setScalar(sc);
    world.rotation.y = px * 0.35;
    // the football flies a figure of eight, nose first, spinning on its long axis
    const a = t * 0.9;
    const x = Math.sin(a) * 2.1 - 0.2, y = 1.3 + Math.sin(a * 2) * 0.9, z = Math.cos(a) * 1.2;
    const dx = Math.cos(a) * 2.1, dy = Math.cos(a * 2) * 1.8, dz = -Math.sin(a) * 1.2;
    fbPath.position.set(x, y, z);
    fbPath.rotation.set(0, Math.atan2(-dz, dx), 0);
    fbPath.rotateZ(Math.atan2(dy, Math.hypot(dx, dz)));
    fbSpin.rotation.x = t * 14;
    // the basketball bounces, squashing when it lands
    const u = (t * 0.95) % 1, h = 4 * u * (1 - u);
    const squash = h < 0.08 ? 1 - (0.08 - h) * 2.4 : 1;
    bb.position.set(-0.4 + Math.sin(t * 0.5) * 1.3, -1.82 + h * 2.3 - (1 - squash) * 0.8, 0.6);
    bb.scale.set(2 - squash, squash, 2 - squash); bb.rotation.z -= dt * 2.2; bb.rotation.x += dt * 0.6;
    shadow.position.set(bb.position.x, -2.6, 0.6); shadow.scale.setScalar(1.1 - h * 0.45); shadow.material.opacity = 0.5 - h * 0.3;
    for (const b of bits) {
      b.m.position.y -= b.v * dt; if (b.m.position.y < -3) b.m.position.y = 6;
      b.m.rotation.x += dt * b.r; b.m.rotation.y += dt * b.r * 0.6;
    }
  });
  return () => st.dispose();
}
