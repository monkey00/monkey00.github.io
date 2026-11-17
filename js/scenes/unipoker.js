// UniPoker: an illustrative hand played through the replayer, with the solver's view of each decision.
import { rightPane } from './kit.js';

const STEPS = [
  { street: 'PREFLOP', board: 0, hero: 'RAISES 2.5 BB', vill: '', pot: '3.5 BB', you: 'RAISE', mix: [['RAISE', 84], ['CALL', 16], ['FOLD', 0]], score: 100 },
  { street: 'PREFLOP', board: 0, hero: '', vill: 'CALLS', pot: '5.5 BB', keep: true },
  { street: 'FLOP', board: 3, hero: 'BETS 1/3 POT', vill: 'CHECKS', pot: '7.3 BB', you: 'BET', mix: [['BET', 71], ['CHECK', 29], ['FOLD', 0]], score: 97 },
  { street: 'TURN', board: 4, hero: 'CHECKS BACK', vill: 'CHECKS', pot: '9.1 BB', you: 'CHECK', mix: [['BET', 38], ['CHECK', 62], ['FOLD', 0]], score: 96 },
  { street: 'RIVER', board: 5, hero: 'ALL IN', vill: 'CHECKS', pot: '9.1 BB', you: 'BET', mix: [['BET', 100], ['CHECK', 0], ['FOLD', 0]], score: 98 },
  { street: 'SHOWDOWN', board: 5, hero: 'ROYAL FLUSH', vill: 'CALLS', pot: '104 BB', keep: true, show: true },
];
const BOARD = [['Q', '♠'], ['J', '♠'], ['4', '♦'], ['7', '♣'], ['10', '♠']];
const pc = ([r, s], extra = '') => `<div class="pc ${s === '♦' || s === '♥' ? 'r' : ''} ${extra}">${r}<br>${s}</div>`;

export default function mount(stage) {
  const pane = rightPane(stage); pane.classList.add('dom');
  pane.innerHTML = `
    <div class="up"><div class="up-table" id="up-table">
      <div class="up-seat" style="left:50%;top:6%"><div class="hole" id="up-vh">${pc(['K', '♦'], 'down')}${pc(['K', '♣'], 'down')}</div><div class="who">BIG BLIND</div><div class="act" id="up-va"></div></div>
      <div class="up-board" id="up-board">${BOARD.map((c) => pc(c)).join('')}</div>
      <div class="up-pot" id="up-pot"></div>
      <div class="up-seat" style="left:50%;top:97%"><div class="hole" id="up-hh">${pc(['A', '♠'])}${pc(['K', '♠'])}</div><div class="who">YOU / BUTTON</div><div class="act" id="up-ha"></div></div>
      <div class="up-solver">
        <div class="up-score"><span id="up-street">SOLVER</span><span>PLAY SCORE <b id="up-ps">--</b></span></div>
        <div id="up-rows"></div>
      </div>
    </div></div>`;
  const $ = (s) => pane.querySelector(s);
  const tableEl = $('#up-table');
  const boardCards = [...$('#up-board').children];
  const holes = [...$('#up-hh').children, ...$('#up-vh').children];
  let i = -1, timer, raf;

  function step() {
    i = (i + 1) % (STEPS.length + 1);
    if (i === STEPS.length) { // reset and deal again
      boardCards.forEach((c) => c.classList.remove('in')); holes.forEach((c) => c.classList.remove('in'));
      [...$('#up-vh').children].forEach((c) => c.classList.add('down'));
      $('#up-ha').classList.remove('on'); $('#up-va').classList.remove('on'); $('#up-pot').textContent = '';
      $('#up-rows').innerHTML = ''; $('#up-ps').textContent = '--'; $('#up-street').textContent = 'SOLVER';
      i = -1; timer = setTimeout(step, 700); return;
    }
    const s = STEPS[i];
    holes.forEach((c, k) => setTimeout(() => c.classList.add('in'), k * 90));
    boardCards.forEach((c, k) => setTimeout(() => c.classList.toggle('in', k < s.board), k * 110));
    $('#up-street').textContent = `SOLVER / ${s.street}`;
    $('#up-pot').textContent = `POT ${s.pot}`;
    const ha = $('#up-ha'), va = $('#up-va');
    va.textContent = s.vill; va.classList.toggle('on', !!s.vill);
    setTimeout(() => { ha.textContent = s.hero; ha.classList.toggle('on', !!s.hero); }, s.vill ? 500 : 0);
    if (s.show) [...$('#up-vh').children].forEach((c) => c.classList.remove('down'));
    if (!s.keep) {
      $('#up-rows').innerHTML = s.mix.map(([a, p]) => `<div class="row ${a === s.you ? 'you' : ''}"><span>${a}${a === s.you ? ' ◀' : ''}</span><div class="bar"><i data-w="${p}"></i></div><span>${p}%</span></div>`).join('');
      requestAnimationFrame(() => requestAnimationFrame(() => pane.querySelectorAll('.bar i').forEach((b) => { b.style.width = b.dataset.w + '%'; })));
      setTimeout(() => { $('#up-ps').textContent = s.score; }, 600);
    }
    timer = setTimeout(step, s.show ? 3400 : 2300);
  }
  timer = setTimeout(step, 500);

  // the table leans toward the cursor
  let px = 0, py = 0, tx = 0, ty = 0;
  const move = (e) => { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; };
  window.addEventListener('pointermove', move);
  const loop = () => {
    px += (tx - px) * 0.06; py += (ty - py) * 0.06;
    tableEl.style.transform = `perspective(1300px) rotateX(${20 - py * 14}deg) rotateY(${px * 16}deg)`;
    raf = requestAnimationFrame(loop);
  };
  loop();
  return () => { clearTimeout(timer); cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); };
}
