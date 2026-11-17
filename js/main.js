import { CARDS, SUITS, RANK_LABEL, byId } from './cards.js';
import { evaluate, flavor } from './hand.js';
import './cursor.js';

const $ = (s) => document.querySelector(s);
const fan = $('#fan');
const home = $('#home');
const intro = $('#intro');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isSmall = () => window.innerWidth <= 760;
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- build the cards ---------- */
const items = CARDS.map((card) => {
  const suit = SUITS[card.suit];
  const el = document.createElement('button');
  el.className = 'card' + (suit.red ? ' is-red' : '');
  el.dataset.id = card.id;
  el.setAttribute('aria-label', `${card.title}. ${card.kicker}`);
  el.style.setProperty('--ac', card.pal.ac);
  el.innerHTML = `
    <span class="c-idx"><b>${RANK_LABEL[card.rank]}</b><i>${suit.glyph}</i></span>
    <span class="c-emblem">${card.emblem}</span>
    <span class="c-title">${card.title}</span>
    <span class="c-kick">${card.kicker}</span>
    <span class="c-sheen"></span>`;
  fan.appendChild(el);
  return { card, el, x: 0, y: 0, r: 0, s: 1, dealt: false };
});
const itemById = Object.fromEntries(items.map((it) => [it.card.id, it]));
const n = items.length;

/* ---------- the hand: a fanned row of cards along the bottom ---------- */
let cw = 170, ch = 240, step = 78, x0 = 0, baseY = 0, reveal = 0;
let hover = -1, handMode = false, activeSuit = null;
const picked = [];

function measure() {
  const W = window.innerWidth, H = window.innerHeight;
  if (isSmall()) {
    cw = (Math.min(W, 520) - 20 * 2 - 12) / 2;
    document.documentElement.style.setProperty('--cw', cw + 'px');
    items.forEach((it) => { it.el.style.transform = ''; });
    return;
  }
  cw = clamp(Math.min(W * 0.122, H * 0.2), 112, 184); ch = cw * 1.42;
  step = Math.min(cw * 0.47, (W - 56 - cw * 1.62) / (n - 1));
  reveal = cw - step + 10;
  x0 = (W - (step * (n - 1) + cw)) / 2;
  baseY = H - ch - Math.max(52, H * 0.085);
  document.documentElement.style.setProperty('--cw', cw + 'px');
}

function tick() {
  requestAnimationFrame(tick);
  if (isSmall() || !detail.hidden) return;
  const H = window.innerHeight, k = calm ? 1 : 0.13;
  items.forEach((it, i) => {
    const m = i - (n - 1) / 2;
    let x = x0 + i * step, y = baseY + m * m * cw * 0.0075, r = m * 1.6, s = 1;
    if (hover >= 0) x += i <= hover ? -reveal / 2 : reveal / 2;
    if (i === hover) { y -= ch * 0.16; r = 0; s = 1.03; }
    if (picked.includes(it)) { y -= ch * 0.26; r = 0; }
    if (activeSuit && it.card.suit !== activeSuit) y += ch * 0.16;
    if (!it.dealt) { y = H + 40; r = 0; }
    it.x += (x - it.x) * k; it.y += (y - it.y) * k; it.r += (r - it.r) * k; it.s += (s - it.s) * k;
    it.el.style.transform = `translate3d(${it.x.toFixed(1)}px,${it.y.toFixed(1)}px,0) rotate(${it.r.toFixed(2)}deg) scale(${it.s.toFixed(3)})`;
  });
}

// Which card the pointer is over is worked out from the resting layout, so cards sliding apart never cause flicker.
function setHover(h) {
  if (h === hover) return;
  if (hover >= 0) items[hover].el.classList.remove('hover');
  hover = h;
  if (hover >= 0) items[hover].el.classList.add('hover');
  syncHero();
}
window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || isSmall() || !detail.hidden) return;
  const top = baseY - (hover >= 0 ? ch * 0.22 : 0);
  const inside = e.clientY >= top && e.clientX >= x0 - cw * 0.3 && e.clientX <= x0 + step * (n - 1) + cw * 1.3;
  setHover(inside ? clamp(Math.floor((e.clientX - x0) / step), 0, n - 1) : -1);
}, { passive: true });
document.documentElement.addEventListener('mouseleave', () => setHover(-1));

items.forEach((it, i) => {
  it.el.addEventListener('click', (e) => {
    // A mouse click goes to the card that is lifted; keyboard and touch go to the card itself.
    activate(e.detail > 0 && hover >= 0 ? items[hover] : it);
  });
  it.el.addEventListener('focus', () => { if (it.el.matches(':focus-visible')) setHover(i); });
  it.el.addEventListener('blur', () => { if (hover === i) setHover(-1); });
});

function activate(it) {
  if (handMode) togglePick(it); else openCard(it.card.id);
}

/* ---------- the 3D suit follows what you are looking at ---------- */
function syncHero() {
  const s = hover >= 0 ? items[hover].card.suit : activeSuit;
  window.dispatchEvent(new CustomEvent('hero', { detail: s && s !== 'j' ? s : 's' }));
}

/* ---------- suit filter ---------- */
function setSuit(s) {
  activeSuit = s;
  document.querySelectorAll('.suit').forEach((x) => x.classList.toggle('on', x.dataset.suit === s));
  items.forEach((it) => it.el.classList.toggle('dimmed', !!s && it.card.suit !== s));
  syncHero();
  if (isSmall()) regroup();
}

// On phones the cards are a grid, so the chosen suit moves to the top and the rest fade below it.
function regroup() {
  const before = new Map(items.map((it) => [it, it.el.getBoundingClientRect()]));
  const order = activeSuit ? [...items.filter((it) => it.card.suit === activeSuit), ...items.filter((it) => it.card.suit !== activeSuit)] : items;
  order.forEach((it) => fan.appendChild(it.el));
  if (!calm) {
    items.forEach((it) => {
      const a = before.get(it), b = it.el.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) it.el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }
  // Make sure the first row of the chosen suit is on screen.
  if (activeSuit) {
    const f = fan.getBoundingClientRect(), H = window.innerHeight;
    if (f.top + 36 + cw * 1.42 > H) home.scrollTo({ top: home.scrollTop + f.top - H * 0.25, behavior: calm ? 'auto' : 'smooth' });
  }
}
window.addEventListener('resize', () => { if (!isSmall() && fan.firstElementChild !== items[0].el) items.forEach((it) => fan.appendChild(it.el)); });
document.querySelectorAll('.suit').forEach((b) => b.addEventListener('click', () => {
  setSuit(activeSuit === b.dataset.suit ? null : b.dataset.suit);
}));

/* ---------- play a hand ---------- */
const verdict = $('#verdict');
const handHint = $('#hand-hint');
function setHandMode(on) {
  handMode = on;
  $('#btn-hand').textContent = on ? 'Cancel' : 'Play a hand';
  picked.splice(0).forEach((it) => it.el.classList.remove('picked'));
  verdict.hidden = true; intro.hidden = false;
  if (on) setSuit(null);
  updateHint();
}
function updateHint() {
  handHint.hidden = !handMode;
  handHint.textContent = `Pick five cards. The joker is wild. ${picked.length} / 5`;
}
function togglePick(it) {
  const i = picked.indexOf(it);
  if (i >= 0) picked.splice(i, 1); else if (picked.length < 5) picked.push(it);
  items.forEach((x) => x.el.classList.toggle('picked', picked.includes(x)));
  updateHint();
  if (picked.length === 5) showdown();
}
function showdown() {
  const cards = picked.map((it) => it.card);
  const res = evaluate(cards);
  items.forEach((it) => it.el.classList.toggle('dimmed', !picked.includes(it)));
  setTimeout(() => {
    $('#verdict-name').textContent = res.name;
    $('#verdict-line').innerHTML = `<small>${res.detail}</small>${flavor(res, cards)}`;
    intro.hidden = true; verdict.hidden = false;
    if (isSmall()) home.scrollTo({ top: 0, behavior: 'smooth' });
  }, 450);
}
$('#btn-hand').addEventListener('click', () => setHandMode(!handMode));
$('#verdict-close').addEventListener('click', () => { items.forEach((it) => it.el.classList.remove('dimmed')); setHandMode(true); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && detail.hidden && handMode) { items.forEach((it) => it.el.classList.remove('dimmed')); setHandMode(false); } });

/* ---------- card page ---------- */
const detail = $('#detail');
const stage = $('#stage');
const panel = $('#panel');
let current = null, cleanup = null, opening = 0;

function renderPanel(card) {
  const suit = SUITS[card.suit];
  const facts = card.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const links = card.links.map(([t, u]) => `<a href="${u}" ${u.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${t}</a>`).join('');
  const play = card.play ? '<button class="play-btn" id="play-here">Play it here</button>' : '';
  panel.innerHTML = `
    <div class="p-kick"><b>${RANK_LABEL[card.rank]}${suit.glyph}</b>${card.kicker}</div>
    <h2 class="p-title">${card.title}</h2>
    ${card.lede ? `<p class="p-lede">${card.lede}</p>` : ''}
    ${facts ? `<dl class="p-facts">${facts}</dl>` : ''}
    ${play || links ? `<div class="p-links">${play}${links}</div>` : ''}
    ${card.note ? `<p class="p-note">${card.note}</p>` : ''}`;
}

async function openCard(id) {
  const card = byId[id]; if (!card) return;
  const token = ++opening;
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  stage.innerHTML = '';
  current = card;
  detail.style.setProperty('--bg', card.pal.bg);
  detail.style.setProperty('--fg', card.pal.fg);
  detail.style.setProperty('--ac', card.pal.ac);
  detail.classList.toggle('bare', !!card.bare);
  renderPanel(card);
  $('#d-count').textContent = `${CARDS.indexOf(card) + 1} / ${CARDS.length}`;
  const wasHidden = detail.hidden;
  const r = itemById[id].el.getBoundingClientRect();
  detail.hidden = false; detail.scrollTop = 0;
  setHover(-1);
  document.title = `${card.title} / Aadit Rana`;
  if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  window.dispatchEvent(new CustomEvent('detail', { detail: true }));

  if (wasHidden && !calm) {
    const W = window.innerWidth, H = window.innerHeight;
    detail.animate(
      [{ clipPath: `inset(${r.top}px ${W - r.right}px ${Math.max(0, H - r.bottom)}px ${r.left}px round 16px)`, opacity: 0.4 }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 }],
      { duration: 700, easing: 'cubic-bezier(.65,0,.15,1)' },
    );
  } else {
    detail.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'ease-out' });
  }
  try {
    const mod = await import(`./scenes/${card.scene}.js`);
    if (token !== opening) return;
    cleanup = await mod.default(stage, card, panel);
    if (token !== opening && cleanup) { cleanup(); cleanup = null; }
  } catch (err) {
    console.error('scene failed', card.scene, err);
  }
}

function closeCard(viaHistory) {
  if (detail.hidden) return;
  opening++;
  const a = detail.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.015)' }], { duration: calm ? 1 : 320, easing: 'ease-in' });
  a.onfinish = () => {
    detail.hidden = true;
    if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    stage.innerHTML = ''; current = null;
    window.dispatchEvent(new CustomEvent('detail', { detail: false }));
  };
  document.title = 'Aadit Rana';
  if (!viaHistory && location.hash) history.pushState(null, '', location.pathname + location.search);
}
function step_(d) {
  const i = (CARDS.indexOf(current) + d + CARDS.length) % CARDS.length;
  openCard(CARDS[i].id);
}
$('#d-close').addEventListener('click', () => closeCard());
$('#d-prev').addEventListener('click', () => step_(-1));
$('#d-next').addEventListener('click', () => step_(1));
window.addEventListener('keydown', (e) => {
  if (detail.hidden) return;
  if (e.key === 'Escape') closeCard();
  // Left and right belong to the poem while it is open.
  if (current && current.bare) return;
  if (e.key === 'ArrowRight') step_(1);
  if (e.key === 'ArrowLeft') step_(-1);
});
window.addEventListener('popstate', () => {
  const id = location.hash.slice(1);
  if (byId[id]) openCard(id); else closeCard(true);
});

/* ---------- clock, resize, boot ---------- */
const clock = $('#clock');
function tock() {
  const t = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' }).format(new Date());
  clock.textContent = `Berkeley, ${t}`;
}
tock(); setInterval(tock, 15000);

window.addEventListener('resize', measure);

async function boot() {
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch {}
  measure();
  items.forEach((it, i) => {
    it.x = x0 + i * step; it.y = window.innerHeight + 40;
    setTimeout(() => { it.dealt = true; }, calm ? 0 : 250 + i * 60);
  });
  document.body.classList.add('ready');
  requestAnimationFrame(tick);
  const id = location.hash.slice(1);
  if (byId[id]) setTimeout(() => openCard(id), 300);
  // The 3D suit is a bonus: the page works without it.
  import('./scenes/home.js').then((m) => m.default($('#bg'))).catch((e) => console.warn('3D unavailable', e));
  import('./targets.js').then((m) => m.default()).catch(() => {});
}
boot();
