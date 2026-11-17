// Golden Bearings: a pin dropping on a moving map, and the real game one click away.
export default function mount(stage, card, panel) {
  stage.innerHTML = `
    <div class="gb">
      <div class="gb-map"></div>
      <div class="gb-pin"><i></i><i></i><i></i><b></b></div>
      <div class="hud gb-score"><b id="gb-n">0</b>POINTS / <span id="gb-m">0</span> M AWAY</div>
    </div>`;
  const n = stage.querySelector('#gb-n'), m = stage.querySelector('#gb-m');
  // The numbers are a demo of the scoring curve the game uses: 5000 * e^(-(d - 12) / 300).
  let dist = 900, target = 40, raf;
  const next = () => { target = [8, 40, 130, 320, 18, 75][Math.floor(Math.random() * 6)]; dist = 900; };
  const iv = setInterval(next, 2600);
  const loop = () => {
    dist += (target - dist) * 0.08;
    const pts = Math.round(5000 * Math.exp(-Math.max(0, dist - 12) / 300));
    n.textContent = pts.toLocaleString(); m.textContent = Math.round(dist);
    raf = requestAnimationFrame(loop);
  };
  loop();

  const btn = panel.querySelector('#play-here');
  const play = () => {
    const f = document.createElement('div');
    f.className = 'gb-frame';
    f.innerHTML = `<iframe src="${card.play}" title="Golden Bearings" allow="fullscreen"></iframe>`;
    stage.appendChild(f);
    panel.style.display = 'none';
  };
  if (btn) btn.addEventListener('click', play);
  return () => { clearInterval(iv); cancelAnimationFrame(raf); panel.style.display = ''; };
}
