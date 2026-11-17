// VECTOR: a simulated rally over a wireframe table, with a scoreboard nobody is allowed to edit.
import { THREE, makeStage, rightPane, lights } from './kit.js';

export default function mount(stage) {
  const pane = rightPane(stage);
  stage.insertAdjacentHTML('beforeend', `
    <div class="vx-br a"></div><div class="vx-br b"></div>
    <button class="vx-score" id="vx-score" aria-label="Score. It cannot be edited.">
      <div id="vx-a"><b>0</b><span>YOU</span></div><div id="vx-b"><b>0</b><span>THEM</span></div>
    </button>
    <div class="hud vx-deny" id="vx-deny">ACCESS DENIED<br>THE CAMERA KEEPS SCORE. NOT YOU.</div>
    <div class="hud vx-read" id="vx-read"></div>`);
  const $ = (s) => stage.querySelector(s);

  const st = makeStage(pane, { fov: 40, z: 8 });
  const { scene, camera } = st;
  lights(scene, 0xff6a00, 0.6);
  const O = 0xff6a00, W = 0xe8e8e6;
  const world = new THREE.Group(); scene.add(world);

  // table
  const L = 2.9, HW = 1.6;
  const top = new THREE.Mesh(new THREE.BoxGeometry(L * 2, 0.08, HW * 2), new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.85 }));
  top.position.y = -0.04; world.add(top);
  world.add(new THREE.LineSegments(new THREE.EdgesGeometry(top.geometry), new THREE.LineBasicMaterial({ color: W })).translateY(-0.04));
  const mid = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-L, 0.005, 0), new THREE.Vector3(L, 0.005, 0)]);
  world.add(new THREE.Line(mid, new THREE.LineBasicMaterial({ color: W, transparent: true, opacity: 0.4 })));
  const net = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2 + 0.3, 0.32, 22, 3), new THREE.MeshBasicMaterial({ color: O, wireframe: true, transparent: true, opacity: 0.7 }));
  net.rotation.y = Math.PI / 2; net.position.y = 0.16; world.add(net);
  const legs = new THREE.LineBasicMaterial({ color: 0x4a4a46 });
  for (const [x, z] of [[-2.4, -1.3], [-2.4, 1.3], [2.4, -1.3], [2.4, 1.3]]) {
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -0.08, z), new THREE.Vector3(x, -1.6, z)]), legs));
  }
  const grid = new THREE.GridHelper(30, 30, 0x55554f, 0x1d1d1b); grid.position.y = -1.6; world.add(grid);

  // paddles
  function paddle(color) {
    const g = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 40), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    blade.rotation.z = Math.PI / 2; blade.position.y = 0.3; g.add(blade);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.11), new THREE.MeshStandardMaterial({ color: 0xb98a5a, roughness: 0.6 }));
    handle.position.y = -0.2; g.add(handle);
    world.add(g); return g;
  }
  const pads = { '-1': paddle(0xff6a00), '1': paddle(0xe8e8e6) };
  const padState = { '-1': { z: 0, y: 0.5, swing: 0 }, '1': { z: 0, y: 0.5, swing: 0 } };

  // ball + trail + bounce ring
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 20), new THREE.MeshStandardMaterial({ color: O, emissive: O, emissiveIntensity: 1.4 }));
  world.add(ball);
  const TR = 46, trailPos = new Float32Array(TR * 3);
  const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  world.add(new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: O, transparent: true, opacity: 0.75 })));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.19, 40), new THREE.MeshBasicMaterial({ color: O, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012; world.add(ring);
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.34, 0.34, 0.34)), new THREE.LineBasicMaterial({ color: W }));
  world.add(box); // the tracker's lock-on box

  // rally state
  const score = { '-1': 0, '1': 0 };
  let shot = null, rally = 0, pause = 0, ringLife = 0, speed = 0;
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const rnd = (a, b) => a + Math.random() * (b - a);
  function newShot(from, dir) {
    // dir: the side the ball is travelling to (-1 left, 1 right)
    const miss = rally >= 2 && Math.random() < 0.24;
    const bounce = miss ? null : v(dir * rnd(1.0, 2.3), 0.075, rnd(-1.2, 1.2));
    const end = miss ? v(dir * rnd(4.6, 5.6), -1.2, rnd(-2.4, 2.4)) : v(dir * (L + 0.35), rnd(0.35, 0.75), THREE.MathUtils.clamp(bounce.z * 1.5 + rnd(-0.4, 0.4), -1.7, 1.7));
    shot = { from: from.clone(), bounce, end, dir, miss, u: 0, seg: 0, T: miss ? 0.85 : rnd(0.3, 0.42) };
    if (!miss) { padState[dir].z = end.z; padState[dir].y = end.y; }
  }
  function serve(side) { rally = 0; newShot(v(side * (L + 0.35), 0.6, rnd(-0.8, 0.8)), -side); padState[side].swing = 1; }
  serve(-1);
  for (let i = 0; i < TR; i++) trailPos.set([shot.from.x, shot.from.y, shot.from.z], i * 3);
  ball.position.copy(shot.from);

  function paint() {
    $('#vx-a b').textContent = score['-1']; $('#vx-b b').textContent = score['1'];
    $('#vx-a').classList.toggle('srv', score['-1'] >= score['1']); $('#vx-b').classList.toggle('srv', score['1'] > score['-1']);
  }
  paint();
  let denyT;
  $('#vx-score').addEventListener('click', () => {
    const s = $('#vx-score'), d = $('#vx-deny');
    s.classList.remove('deny'); void s.offsetWidth; s.classList.add('deny'); d.classList.add('on');
    clearTimeout(denyT); denyT = setTimeout(() => d.classList.remove('on'), 2200);
  });

  const prev = v(0, 0, 0);
  st.onFrame((t, dt) => {
    const narrow = st.size.w < 700;
    camera.position.set(Math.sin(t * 0.18) * 1.6 + st.pointer.x * 0.8, 3.3 + st.pointer.y * 0.4, narrow ? 12.5 : 11);
    camera.lookAt(0, narrow ? 0.9 : 0.2, 0);
    world.position.x = 0;

    if (pause > 0) { pause -= dt; if (pause <= 0) serve((score['-1'] + score['1']) % 2 ? 1 : -1); }
    else if (shot) {
      shot.u += dt / shot.T;
      let p;
      if (shot.miss) {
        const u = Math.min(1, shot.u);
        p = shot.from.clone().lerp(shot.end, u); p.y += Math.sin(u * Math.PI) * 1.5;
        if (shot.u >= 1) {
          score[shot.dir]++; // hit long: the point goes to the side it was hit toward
          if (score[shot.dir] >= 11) { score['-1'] = 0; score['1'] = 0; }
          paint(); pause = 0.9; shot = null;
        }
      } else {
        const a = shot.seg === 0 ? shot.from : shot.bounce, b = shot.seg === 0 ? shot.bounce : shot.end;
        const u = Math.min(1, shot.u);
        p = a.clone().lerp(b, u); p.y += Math.sin(u * Math.PI) * (shot.seg === 0 ? 0.55 : 0.3);
        if (shot.u >= 1) {
          if (shot.seg === 0) { shot.seg = 1; shot.u = 0; shot.T *= 0.55; ring.position.set(b.x, 0.012, b.z); ringLife = 1; }
          else { rally++; padState[shot.dir].swing = 1; newShot(shot.end, -shot.dir); }
        }
      }
      if (p) { speed = speed * 0.8 + (p.distanceTo(prev) / dt) * 0.2; prev.copy(p); ball.position.copy(p); }
    }
    // trail
    trailPos.copyWithin(3, 0, (TR - 1) * 3);
    trailPos[0] = ball.position.x; trailPos[1] = ball.position.y; trailPos[2] = ball.position.z;
    trailGeo.attributes.position.needsUpdate = true;
    box.position.copy(ball.position); box.rotation.y = t; box.scale.setScalar(1 + Math.sin(t * 9) * 0.12);
    if (ringLife > 0) { ringLife -= dt * 1.6; ring.material.opacity = Math.max(0, ringLife); ring.scale.setScalar(1 + (1 - ringLife) * 3); }
    for (const k of ['-1', '1']) {
      const s = padState[k], g = pads[k];
      g.position.x = +k * (L + 0.45);
      g.position.z += (s.z - g.position.z) * 0.2; g.position.y += (s.y - 0.3 - g.position.y) * 0.2;
      s.swing *= 0.88;
      g.rotation.z = +k * (0.25 + s.swing * 0.9); g.rotation.y = -g.position.z * 0.2 * +k;
    }
    const b = ball.position;
    $('#vx-read').innerHTML = `TRACKING <b>LOCKED</b><br>X ${b.x.toFixed(2)} &nbsp;Y ${b.y.toFixed(2)} &nbsp;Z ${b.z.toFixed(2)}<br>SPEED <b>${speed.toFixed(1)}</b> M/S<br>RALLY <b>${String(rally).padStart(2, '0')}</b>`;
  });
  return () => { clearTimeout(denyT); st.dispose(); };
}
