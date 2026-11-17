(() => {
  'use strict';

  // ================= Constants =================
  const LANDMARKS = window.GB_LANDMARKS || [];
  const CAMPUS_CENTER = [37.8716, -122.2595];
  const MAP_BOUNDS = [[37.848, -122.292], [37.894, -122.226]];
  // Area Wander Mode samples from: campus, Southside, Northside, Downtown.
  const WANDER = { s: 37.8628, n: 37.8795, w: -122.2715, e: -122.2475 };
  const STICKER_THRESHOLD = 2500;
  const HINT_PENALTY = 0.7;

  const MODES = {
    classic: {
      name: 'Campus Classic', emoji: '🔔', accent: '#fdb515', hex: 'p-gingham-red',
      rounds: 5, scale: 300, pool: 'landmarks', timer: 0,
      blurb: 'Five famous spots around campus. Take your time, look around, and find your bearings.'
    },
    wander: {
      name: 'Wander Mode', emoji: '🧭', accent: '#9ad43a', hex: 'p-gingham-green',
      rounds: 5, scale: 450, pool: 'random', timer: 0,
      blurb: 'Dropped on any random street around campus, Southside, Northside, or Downtown. For true Berkeley locals.'
    },
    sprint: {
      name: 'Bear Sprint', emoji: '⏱️', accent: '#ff7b86', hex: 'p-gingham-gold',
      rounds: 5, scale: 300, pool: 'landmarks', timer: 45,
      blurb: 'Landmarks against the clock. You get 45 seconds per spot. Hurry before class starts!'
    },
    daily: {
      name: 'Daily Stroll', emoji: '📅', accent: '#6fb4ff', hex: 'p-gingham-blue',
      rounds: 5, scale: 300, pool: 'daily', timer: 0,
      blurb: "Today's 5 spots are the same for everyone. Play, then share your score with friends."
    }
  };
  const MODE_ORDER = ['classic', 'wander', 'sprint', 'daily'];

  const LOADING_LINES = [
    'Winding up the Campanile clock…',
    'Dodging flyers on Sproul…',
    'Shooing squirrels off the path…',
    'Stitching the map together…',
    'Finding a parking spot (just kidding)…',
    'Climbing the hill to Evans…',
    'Following Strawberry Creek…'
  ];

  // Each map style is a stack of tile layers (no API keys needed).
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  const TILES = {
    storybook: [{
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      opt: { maxZoom: 19, className: 'tiles-storybook', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }
    }],
    satellite: [
      { url: ESRI + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', opt: { maxZoom: 19, attribution: 'Imagery &copy; Esri' } },
      { url: ESRI + 'Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', opt: { maxZoom: 19, opacity: 0.85 } }
    ]
  };

  // ================= Tiny helpers =================
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('gb.' + k); return v == null ? d : JSON.parse(v); } catch { return d; }
    },
    set(k, v) { try { localStorage.setItem('gb.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
  };
  const toRad = d => d * Math.PI / 180;
  function haversine(a, b) {
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function offsetPoint(p, meters, angle) {
    return {
      lat: p.lat + (meters * Math.cos(angle)) / 111320,
      lng: p.lng + (meters * Math.sin(angle)) / (111320 * Math.cos(toRad(p.lat)))
    };
  }
  function scoreFor(d, scale) {
    if (d <= 12) return 5000;
    return Math.round(5000 * Math.exp(-(d - 12) / scale));
  }
  const fmtNum = n => Math.round(n).toLocaleString('en-US');
  function fmtDist(m) {
    if (settings.units === 'metric') return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
    const ft = m * 3.28084;
    return ft < 1000 ? `${Math.round(ft)} ft` : `${(m / 1609.344).toFixed(2)} mi`;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd = Math.random) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function dateKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const dailySeed = () => Number(dateKey().replace(/-/g, ''));
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ================= Persistent state =================
  const settings = Object.assign({ sound: true, units: 'imperial', layer: 'storybook' }, store.get('settings', {}));
  Sfx.setEnabled(settings.sound);
  const stats = store.get('stats', {});
  MODE_ORDER.forEach(m => { stats[m] = Object.assign({ best: 0, plays: 0, closest: null }, stats[m]); });
  let stickers = new Set(store.get('stickers', []));
  let daily = store.get('daily', { date: null, score: 0, streak: 0, best: 0 });

  const saveSettings = () => store.set('settings', settings);
  const saveStats = () => store.set('stats', stats);
  const saveStickers = () => store.set('stickers', Array.from(stickers));

  // ================= Toast + confetti =================
  let toastTimer = null;
  function toast(msg, ms = 3200) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  }
  function confetti(n = 80) {
    const box = $('#confetti');
    const colors = ['#fdb515', '#2f7fe3', '#e8505b', '#9ad43a', '#ff9de0', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const b = document.createElement('div');
      b.className = 'confetti-bit';
      b.style.left = Math.random() * 100 + 'vw';
      b.style.background = colors[i % colors.length];
      b.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
      b.style.setProperty('--rot', (Math.random() * 1080 - 540) + 'deg');
      b.style.setProperty('--t', (1.8 + Math.random() * 1.6) + 's');
      b.style.animationDelay = Math.random() * 0.4 + 's';
      if (Math.random() < 0.4) b.style.borderRadius = '50%';
      box.appendChild(b);
      setTimeout(() => b.remove(), 4200);
    }
  }

  // ================= Screens + modals =================
  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  }
  function showLoading(text, sub = '') {
    $('#loading-text').textContent = text;
    $('#loading-sub').textContent = sub;
    $('#loading').hidden = false;
  }
  const setLoadingSub = sub => { $('#loading-sub').textContent = sub; };
  const hideLoading = () => { $('#loading').hidden = true; };

  function openModal(id, opts = {}) {
    const m = $('#modal-' + id);
    if (id === 'settings') prepSettings(opts);
    if (id === 'stickers') renderStickers();
    m.hidden = false;
    Sfx.open();
  }
  function closeModal(m) { m.hidden = true; Sfx.close(); }
  $$('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(m); });
  });

  // ================= Menu =================
  let selectedMode = MODE_ORDER.includes(store.get('lastMode')) ? store.get('lastMode') : 'classic';

  function buildSceneDecor() {
    // String lights
    const g = $('.lights .bulbs');
    const cols = ['#ffd860', '#ff7b86', '#7bc1ff', '#9ad43a', '#ffffff'];
    const path = $('.lights path');
    const len = path.getTotalLength();
    let html = '';
    for (let i = 1; i < 24; i++) {
      const p = path.getPointAtLength((len / 24) * i);
      const c = cols[i % cols.length];
      html += `<circle class="bulb" cx="${p.x}" cy="${p.y + 7}" r="6" fill="${c}" style="animation-delay:${-(i * 0.37) % 2.4}s;filter:drop-shadow(0 0 6px ${c})"/>`;
    }
    g.innerHTML = html;
    // Fireflies
    const ff = $('.fireflies');
    for (let i = 0; i < 22; i++) {
      const f = document.createElement('span');
      f.className = 'firefly';
      f.style.left = (5 + Math.random() * 90) + '%';
      f.style.top = (45 + Math.random() * 50) + '%';
      const r = () => (Math.random() * 120 - 60) + 'px';
      ['--dx1', '--dy1', '--dx2', '--dy2', '--dx3', '--dy3'].forEach(v => f.style.setProperty(v, r()));
      f.style.setProperty('--dur', (7 + Math.random() * 8) + 's');
      f.style.setProperty('--delay', -(Math.random() * 10) + 's');
      f.style.setProperty('--delay2', -(Math.random() * 3) + 's');
      ff.appendChild(f);
    }
    $('#orb-day').textContent = new Date().getDate();
  }

  function selectMode(id, { silent = false } = {}) {
    if (!MODES[id]) return;
    const changed = id !== selectedMode;
    selectedMode = id;
    store.set('lastMode', id);
    $$('.mode-btn').forEach(b => b.classList.toggle('selected', b.dataset.mode === id));
    const m = MODES[id];
    $('#orb-hex').setAttribute('fill', `url(#${m.hex})`);
    $$('.orb-icon').forEach(g => g.classList.toggle('on', g.dataset.icon === id));
    if (changed) {
      const orb = $('.orb');
      orb.classList.remove('spin'); void orb.getBoundingClientRect(); orb.classList.add('spin');
      const card = $('.mode-card');
      card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
      if (!silent) Sfx.hover();
    }
    renderCard(id);
  }

  function renderCard(id) {
    const m = MODES[id];
    const s = stats[id];
    const card = $('.mode-card');
    card.style.setProperty('--accent', m.accent);
    $('#card-title').textContent = m.name;
    $('#card-emoji').textContent = m.emoji;
    $('#card-blurb').textContent = m.blurb;
    const closest = s.closest == null ? '—' : fmtDist(s.closest);
    if (id === 'classic') {
      const pct = LANDMARKS.length ? Math.round((stickers.size / LANDMARKS.length) * 100) : 0;
      setCard(`${pct}%`, 'Sticker book', fmtNum(s.best), 'Best score', closest, 'Closest guess');
    } else if (id === 'daily') {
      const today = daily.date === dateKey();
      const streak = today || daily.date === dateKey(new Date(Date.now() - 864e5)) ? daily.streak : 0;
      setCard(today ? fmtNum(daily.score) : 'New!', today ? "Today's score" : "Today's stroll awaits",
        `${streak} day${streak === 1 ? '' : 's'}`, 'Streak 🔥', fmtNum(daily.best || 0), 'Best daily');
    } else {
      setCard(fmtNum(s.best), 'Best score', String(s.plays), 'Games played', closest, 'Closest guess');
    }
  }
  function setCard(big, bigLabel, s1, s1Label, s2, s2Label) {
    $('#card-big').textContent = big;
    $('#card-big-label').textContent = bigLabel;
    $('#card-s1').textContent = s1;
    $('#card-s1-label').textContent = s1Label;
    $('#card-s2').textContent = s2;
    $('#card-s2-label').textContent = s2Label;
  }

  $$('.mode-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => selectMode(btn.dataset.mode));
    btn.addEventListener('focus', () => selectMode(btn.dataset.mode));
    btn.addEventListener('click', () => {
      // On touch, the first tap selects a mode and the second tap starts it.
      if (btn.dataset.mode !== selectedMode) { selectMode(btn.dataset.mode); return; }
      startGame(btn.dataset.mode);
    });
  });
  $('#btn-play').addEventListener('click', () => startGame(selectedMode));
  $('#btn-stickers').addEventListener('click', () => openModal('stickers'));
  $('#btn-howto').addEventListener('click', () => openModal('howto'));
  $('#btn-settings').addEventListener('click', () => openModal('settings'));
  $$('.foot-btn').forEach(b => b.addEventListener('mouseenter', () => Sfx.hover()));

  // ================= Settings =================
  function prepSettings() {
    renderSettingsControls();
  }
  function renderSettingsControls() {
    $('#tg-sound').setAttribute('aria-checked', String(settings.sound));
    $$('#seg-units button').forEach(b => b.classList.toggle('on', b.dataset.units === settings.units));
  }
  $('#tg-sound').addEventListener('click', () => {
    settings.sound = !settings.sound;
    Sfx.setEnabled(settings.sound);
    saveSettings(); renderSettingsControls();
    Sfx.click();
  });
  $$('#seg-units button').forEach(b => b.addEventListener('click', () => {
    settings.units = b.dataset.units; saveSettings(); renderSettingsControls(); renderCard(selectedMode); Sfx.click();
  }));
  $('#btn-save-settings').addEventListener('click', () => {
    closeModal($('#modal-settings'));
    toast('Settings saved');
  });
  $('#btn-reset').addEventListener('click', () => {
    if (!confirm('Reset all scores, stickers and streaks?')) return;
    stickers = new Set(); saveStickers();
    MODE_ORDER.forEach(m => { stats[m] = { best: 0, plays: 0, closest: null }; }); saveStats();
    daily = { date: null, score: 0, streak: 0, best: 0 }; store.set('daily', daily);
    renderCard(selectedMode);
    toast('Progress reset. Fresh start!');
  });

  // ================= Sticker book =================
  function renderStickers() {
    const grid = $('#sticker-grid');
    $('#sticker-count').textContent = `${stickers.size} / ${LANDMARKS.length}`;
    grid.innerHTML = LANDMARKS.map((l, i) => {
      const got = stickers.has(l.id);
      const r = ((i * 37) % 7) - 3;
      return got
        ? `<div class="stk" style="--r:${r}deg"><div class="sticker">${l.emoji}</div><h4>${escapeHtml(l.name)}</h4><p>${escapeHtml(l.fact)}</p></div>`
        : `<div class="stk locked" style="--r:${r}deg"><div class="sticker">?</div><h4>???</h4><p>Somewhere in ${escapeHtml(l.zone)}</p></div>`;
    }).join('');
  }

  // ================= Street View (keyless Google Maps embed) =================
  // Panorama ids and their exact positions are precomputed by tools/build-panos.js,
  // so scoring is measured against the real panorama, not the landmark's pin.
  const PANOS = window.GB_PANOS || { landmarks: {}, wander: [] };

  function embedUrl(r) {
    return `https://www.google.com/maps/embed?pb=!6m8!1m7!1s${encodeURIComponent(r.pano)}!2m2!1d${r.lat}!2d${r.lng}!3f${r.heading.toFixed(1)}!4f0!5f0.8`;
  }

  function buildRounds(modeId) {
    const m = MODES[modeId];
    const rnd = modeId === 'daily' ? mulberry32(dailySeed()) : Math.random;
    const minGap = m.pool === 'random' ? 300 : 120;
    const candidates = m.pool === 'random'
      ? PANOS.wander.map(p => ({ ...p, landmark: null }))
      : LANDMARKS.filter(l => PANOS.landmarks[l.id]).map(l => ({ ...PANOS.landmarks[l.id], landmark: l }));
    const picked = [];
    for (const c of shuffle(candidates, rnd)) {
      if (picked.length >= m.rounds) break;
      if (picked.every(q => haversine(c, q) > minGap)) picked.push({ ...c, heading: rnd() * 360 });
    }
    return picked;
  }

  // ================= Leaflet maps =================
  let guessMap = null, guessLayer = null, guessMarker = null, hintCircle = null;
  let resultMap = null, resultLayers = null;
  let summaryMap = null, summaryLayers = null;
  const tileLayers = {};

  function pinIcon(kind, label) {
    return L.divIcon({
      className: 'gb-pin-wrap',
      html: `<div class="gb-pin-drop"><div class="gb-pin gb-pin-${kind}"><span>${label}</span></div></div>`,
      iconSize: [44, 56], iconAnchor: [22, 52]
    });
  }
  function makeMap(el, opts = {}) {
    return L.map(el, Object.assign({
      zoomControl: true, attributionControl: true,
      minZoom: 13, maxZoom: 19, maxBounds: MAP_BOUNDS, maxBoundsViscosity: 0.8,
      wheelPxPerZoomLevel: 90
    }, opts)).setView(CAMPUS_CENTER, 15);
  }
  const newTiles = name => L.layerGroup(TILES[name].map(t => L.tileLayer(t.url, t.opt)));

  function ensureGuessMap() {
    if (guessMap) return;
    guessMap = makeMap('guess-map', { zoomControl: true });
    Object.keys(TILES).forEach(k => { tileLayers[k] = newTiles(k); });
    setLayer(settings.layer in TILES ? settings.layer : 'storybook');
    guessMap.on('click', e => placeGuess(e.latlng));
    new ResizeObserver(() => guessMap.invalidateSize({ animate: false })).observe($('#guess-map'));
  }
  function setLayer(name) {
    Object.entries(tileLayers).forEach(([k, l]) => { if (k !== name && guessMap.hasLayer(l)) guessMap.removeLayer(l); });
    if (!guessMap.hasLayer(tileLayers[name])) tileLayers[name].addTo(guessMap);
    settings.layer = name; saveSettings();
    $$('.layer-switch button').forEach(b => b.classList.toggle('on', b.dataset.layer === name));
  }
  $$('.layer-switch button').forEach(b => b.addEventListener('click', () => { setLayer(b.dataset.layer); Sfx.click(); }));

  // Results/summary maps follow the player's chosen layer, minus the satellite labels issue.
  function ensureResultMap() {
    if (resultMap) return;
    resultMap = makeMap('result-map');
    newTiles(settings.layer === 'satellite' ? 'satellite' : 'storybook').addTo(resultMap);
    resultLayers = L.layerGroup().addTo(resultMap);
  }
  function ensureSummaryMap() {
    if (summaryMap) return;
    summaryMap = makeMap('summary-map');
    newTiles('storybook').addTo(summaryMap);
    summaryLayers = L.layerGroup().addTo(summaryMap);
  }

  // ---- Corner map expand/collapse (GeoGuessr-style) ----
  const wrap = $('#guess-wrap');
  let collapseTimer = null;
  const isMobile = () => window.matchMedia('(max-width: 720px)').matches;
  wrap.addEventListener('mouseenter', () => {
    if (isMobile()) return;
    clearTimeout(collapseTimer);
    if (!wrap.classList.contains('expanded')) Sfx.whoosh();
    wrap.classList.add('expanded');
  });
  wrap.addEventListener('mouseleave', () => {
    if (isMobile()) return;
    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => wrap.classList.remove('expanded'), 450);
  });
  $('#btn-lock').addEventListener('click', () => { wrap.classList.toggle('locked'); Sfx.click(); });
  $('#btn-map-open').addEventListener('click', () => toggleMobileMap(true));
  $('#btn-map-close').addEventListener('click', () => toggleMobileMap(false));
  function toggleMobileMap(open) {
    wrap.classList.toggle('mobile-open', open);
    $('#btn-map-open').hidden = open;
    if (open) { Sfx.whoosh(); setTimeout(() => guessMap && guessMap.invalidateSize(), 30); }
  }

  // ================= Game state =================
  let game = null; // { mode, rounds, idx, total, guess, timeLeft }
  let timerId = null;
  let hudScore = 0;

  function startGame(modeId) {
    const rounds = buildRounds(modeId);
    if (rounds.length < 3) { toast('Hmm, no Street View spots are available for this mode.'); return; }
    Sfx.click();
    game = { mode: modeId, rounds, idx: 0, total: 0, guess: null };
    hudScore = 0;
    $('#hud-score').textContent = '0';
    showScreen('game');
    ensureGuessMap();
    startRound();
  }

  // Swaps in a fresh embed iframe for the round. With onReady, shows the yarn
  // loader until the panorama has had a moment to paint.
  let panoLoadTimer = null;
  function loadPano(r, onReady) {
    const old = $('#pano-frame');
    const frame = document.createElement('iframe');
    frame.id = 'pano-frame';
    frame.title = 'Street View';
    frame.allow = 'accelerometer; gyroscope; fullscreen';
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    if (onReady) {
      showLoading(LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)], `Heading to spot ${game.idx + 1} of ${game.rounds.length}…`);
      clearTimeout(panoLoadTimer);
      let ready = false;
      const finish = () => {
        if (ready) return;
        ready = true;
        clearTimeout(panoLoadTimer);
        hideLoading();
        onReady();
      };
      frame.onload = () => { clearTimeout(panoLoadTimer); panoLoadTimer = setTimeout(finish, 1100); };
      panoLoadTimer = setTimeout(finish, 9000);
    }
    frame.src = embedUrl(r);
    old.replaceWith(frame);
  }

  function startRound() {
    const r = game.rounds[game.idx];
    const m = MODES[game.mode];
    game.guess = null;
    r.hinted = false;
    showScreen('game');
    $('#result').classList.remove('active');
    wrap.classList.remove('expanded');
    toggleMobileMap(false);


    if (guessMarker) { guessMarker.remove(); guessMarker = null; }
    if (hintCircle) { hintCircle.remove(); hintCircle = null; }
    guessMap.invalidateSize();
    guessMap.setView(CAMPUS_CENTER, 15, { animate: false });

    $('#hud-round').textContent = `${game.idx + 1} / ${game.rounds.length}`;
    $('#btn-hint').disabled = false;
    updateGuessBtn();

    stopTimer();
    $('#hud-timer-pill').hidden = !m.timer;
    if (m.timer) { game.timeLeft = m.timer; renderTimer(); }
    loadPano(r, () => {
      if (m.timer && game && game.rounds[game.idx] === r) startTimer(m.timer);
      Sfx.whoosh();
    });
  }

  function placeGuess(latlng) {
    if (!game || $('#result').classList.contains('active')) return;
    game.guess = { lat: latlng.lat, lng: latlng.lng };
    if (guessMarker) guessMarker.setLatLng(latlng);
    else guessMarker = L.marker(latlng, { icon: pinIcon('guess', '🐻'), keyboard: false }).addTo(guessMap);
    // Re-trigger the drop animation.
    const el = guessMarker.getElement();
    if (el) { const d = el.querySelector('.gb-pin-drop'); d.style.animation = 'none'; void d.offsetWidth; d.style.animation = ''; }
    Sfx.pin();
    updateGuessBtn();
  }
  function updateGuessBtn() {
    const btn = $('#btn-guess');
    const ready = !!(game && game.guess);
    btn.disabled = !ready;
    btn.classList.toggle('ready', ready);
    btn.textContent = ready ? 'Guess! 📍' : 'Drop a pin on the map';
  }
  $('#btn-guess').addEventListener('click', () => submitGuess());

  $('#btn-return').addEventListener('click', returnToStart);
  function returnToStart() {
    if (!game || $('#result').classList.contains('active')) return;
    loadPano(game.rounds[game.idx]);
    Sfx.click();
  }

  $('#btn-hint').addEventListener('click', useHint);
  function useHint() {
    if (!game || !guessMap) return;
    const r = game.rounds[game.idx];
    if (r.hinted) return;
    r.hinted = true;
    $('#btn-hint').disabled = true;
    const center = offsetPoint(r, Math.random() * 140, Math.random() * Math.PI * 2);
    hintCircle = L.circle([center.lat, center.lng], {
      radius: 260, color: '#e8505b', weight: 4, dashArray: '8 8', fillColor: '#fdb515', fillOpacity: 0.15, className: 'gb-hint'
    }).addTo(guessMap);
    if (isMobile()) toggleMobileMap(true); else wrap.classList.add('expanded');
    guessMap.flyTo([center.lat, center.lng], 16, { duration: 0.8 });
    toast("🐾 Sniff sniff… it's somewhere inside the circle!");
    Sfx.sticker();
  }

  $('#btn-quit').addEventListener('click', () => {
    if (game && !confirm('Leave this game? Your progress this round will be lost.')) return;
    quitToMenu();
  });
  function quitToMenu() {
    stopTimer();
    clearTimeout(panoLoadTimer);
    hideLoading();
    game = null;
    $('#result').classList.remove('active');
    showScreen('menu');
    renderCard(selectedMode);
  }

  // ---- Timer ----
  function startTimer(seconds) {
    game.timeLeft = seconds;
    renderTimer();
    const endAt = Date.now() + seconds * 1000;
    timerId = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      if (left !== game.timeLeft) {
        game.timeLeft = left;
        renderTimer();
        if (left <= 10 && left > 0) Sfx.tick();
      }
      if (left <= 0) { stopTimer(); submitGuess(true); }
    }, 200);
  }
  function stopTimer() { clearInterval(timerId); timerId = null; }
  function renderTimer() {
    const t = game.timeLeft;
    $('#hud-timer').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    $('#hud-timer-pill').classList.toggle('urgent', t <= 10);
  }

  // ================= Guess + results =================
  function reactionFor(d) {
    if (d == null) return { text: "Time's up! ⏰", sfx: 'sad' };
    if (d <= 15) return { text: 'PERFECT! Are you a tour guide?!', sfx: 'great' };
    if (d <= 50) return { text: 'Incredible!', sfx: 'great' };
    if (d <= 120) return { text: 'So close!', sfx: 'good' };
    if (d <= 300) return { text: 'Nice one!', sfx: 'good' };
    if (d <= 700) return { text: 'Not bad!', sfx: 'meh' };
    return { text: 'A little lost… 🐻', sfx: 'sad' };
  }

  function nearestLandmark(p) {
    let best = null, bestD = Infinity;
    LANDMARKS.forEach(l => { const d = haversine(p, l); if (d < bestD) { bestD = d; best = l; } });
    return { landmark: best, dist: bestD };
  }

  function submitGuess(timedOut = false) {
    if (!game || $('#result').classList.contains('active')) return;
    if (!game.guess && !timedOut) return;
    stopTimer();
    const m = MODES[game.mode];
    const r = game.rounds[game.idx];
    r.guess = game.guess;
    r.dist = r.guess ? haversine(r.guess, r) : null;
    let pts = r.dist == null ? 0 : scoreFor(r.dist, m.scale);
    if (r.hinted) pts = Math.round(pts * HINT_PENALTY);
    r.points = pts;
    game.total += pts;

    r.newSticker = false;
    if (r.landmark && pts >= STICKER_THRESHOLD && !stickers.has(r.landmark.id)) {
      stickers.add(r.landmark.id); saveStickers(); r.newSticker = true;
    }
    if (r.dist != null && (stats[game.mode].closest == null || r.dist < stats[game.mode].closest)) {
      stats[game.mode].closest = r.dist; saveStats();
    }
    showResult(r);
  }

  function showResult(r) {
    const total = game.rounds.length;
    $('#result').classList.add('active');
    ensureResultMap();
    resultMap.invalidateSize();
    resultLayers.clearLayers();

    const actual = L.latLng(r.lat, r.lng);
    L.marker(actual, { icon: pinIcon('actual', '★') }).addTo(resultLayers);
    if (r.guess) {
      const g = L.latLng(r.guess.lat, r.guess.lng);
      L.polyline([g, actual], { color: '#003262', weight: 5, opacity: 0.85, className: 'gb-line' }).addTo(resultLayers);
      L.marker(g, { icon: pinIcon('guess', '🐻') }).addTo(resultLayers);
    }

    // Card content
    const react = reactionFor(r.dist);
    $('#rc-round').textContent = `Round ${game.idx + 1} / ${total}`;
    $('#rc-react').textContent = react.text;
    $('#rc-dist').innerHTML = r.dist == null
      ? 'No pin was dropped this round.'
      : `Your pin was <b>${fmtDist(r.dist)}</b> away${r.hinted ? '<span class="hint-note">🐾 Hint used: 30% off</span>' : ''}`;
    let lm = r.landmark, lmPrefix = '';
    if (!lm) {
      const near = nearestLandmark(r);
      lm = near.landmark;
      lmPrefix = `Nearest landmark (${fmtDist(near.dist)} away): `;
    }
    $('#rc-sticker').textContent = lm ? lm.emoji : '📍';
    $('#rc-lm-name').textContent = lm ? lmPrefix + lm.name : 'Somewhere in Berkeley';
    $('#rc-lm-fact').textContent = lm ? lm.fact : '';
    $('#rc-new').hidden = !r.newSticker;
    $('#btn-next').textContent = game.idx + 1 >= total ? 'See results 🏆' : 'Next spot ▶';

    // Fit map around both pins, leaving room for the card.
    requestAnimationFrame(() => {
      const cardH = $('.result-card').offsetHeight;
      const pts = r.guess ? [actual, L.latLng(r.guess.lat, r.guess.lng)] : [actual];
      if (pts.length > 1) {
        resultMap.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [60, 60], paddingBottomRight: [60, cardH + 50], maxZoom: 18, animate: false });
      } else {
        resultMap.setView(actual, 17, { animate: false });
        resultMap.panBy([0, cardH / 2], { animate: false });
      }
    });

    countUp($('#rc-points'), r.points, 900);
    $('#rc-bar').style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => { $('#rc-bar').style.width = (r.points / 50) + '%'; }));
    Sfx[react.sfx]();
    if (r.newSticker) setTimeout(() => Sfx.sticker(), 700);
    if (r.points >= 4500) confetti(90);

    // HUD score
    const from = hudScore;
    hudScore = game.total;
    countUp($('#hud-score'), hudScore, 900, from);
    const pill = $('.pill-score');
    pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
  }

  function countUp(el, to, ms, from = 0) {
    const start = performance.now();
    const step = now => {
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmtNum(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  $('#btn-next').addEventListener('click', nextRound);
  function nextRound() {
    if (!game) return;
    Sfx.click();
    game.idx++;
    if (game.idx >= game.rounds.length) showSummary();
    else startRound();
  }

  // ================= Summary =================
  function showSummary() {
    const m = MODES[game.mode];
    const total = game.total;
    const maxScore = game.rounds.length * 5000;
    const s = stats[game.mode];
    s.plays += 1;
    const isBest = total > s.best;
    if (isBest) s.best = total;
    saveStats();

    if (game.mode === 'daily') {
      const today = dateKey();
      if (daily.date !== today) {
        const yesterday = dateKey(new Date(Date.now() - 864e5));
        daily.streak = daily.date === yesterday ? (daily.streak || 0) + 1 : 1;
        daily.date = today;
        daily.score = total;
        daily.best = Math.max(daily.best || 0, total);
        store.set('daily', daily);
      }
    }

    $('#result').classList.remove('active');
    showScreen('summary');
    ensureSummaryMap();
    summaryMap.invalidateSize();
    summaryLayers.clearLayers();
    const all = [];
    game.rounds.forEach((r, i) => {
      const a = L.latLng(r.lat, r.lng);
      all.push(a);
      L.marker(a, { icon: pinIcon('actual', String(i + 1)) }).addTo(summaryLayers);
      if (r.guess) {
        const g = L.latLng(r.guess.lat, r.guess.lng);
        all.push(g);
        L.polyline([g, a], { color: '#003262', weight: 4, opacity: 0.8, className: 'gb-line' }).addTo(summaryLayers);
        L.marker(g, { icon: pinIcon('guess', String(i + 1)) }).addTo(summaryLayers);
      }
    });
    requestAnimationFrame(() => {
      const card = $('.summary-card');
      const mobile = isMobile();
      summaryMap.fitBounds(L.latLngBounds(all), {
        paddingTopLeft: [50, 50],
        paddingBottomRight: mobile ? [50, card.offsetHeight + 40] : [card.offsetWidth + 90, 50],
        maxZoom: 17, animate: false
      });
    });

    const frac = total / maxScore;
    const starCount = frac >= 0.8 ? 3 : frac >= 0.5 ? 2 : frac >= 0.2 ? 1 : 0;
    $$('#sum-stars span').forEach((st, i) => {
      st.classList.remove('on');
      if (i < starCount) setTimeout(() => { st.classList.add('on'); Sfx.pin(); }, 500 + i * 350);
    });
    const titles = ['Keep exploring!', 'Nice stroll!', 'Great job!', 'Campus legend!'];
    $('#sum-title').textContent = `${m.name}: ${titles[starCount]}`;
    $('.sum-total small').textContent = `/ ${fmtNum(maxScore)}`;
    countUp($('#sum-total'), total, 1400);
    $('#sum-best').hidden = !(isBest && s.plays > 1);
    $('#sum-rounds').innerHTML = game.rounds.map((r, i) => {
      const name = r.landmark ? r.landmark.name : 'Near ' + nearestLandmark(r).landmark.name;
      const dist = r.dist == null ? 'No guess' : fmtDist(r.dist) + ' away';
      return `<li><span class="num">${i + 1}</span><span class="where">${escapeHtml(name)}<small>${dist}</small></span><span class="pts">${fmtNum(r.points)}</span></li>`;
    }).join('');

    Sfx.fanfare();
    if (starCount >= 2) confetti(starCount === 3 ? 160 : 80);
  }

  function shareText() {
    const m = MODES[game ? game.mode : selectedMode];
    const squares = game.rounds.map(r => r.points >= 4000 ? '🟩' : r.points >= 2500 ? '🟨' : r.points >= 1000 ? '🟧' : '🟥').join('');
    const label = game.mode === 'daily' ? `Daily Stroll ${dateKey()}` : m.name;
    return `🐻 Golden Bearings · ${label}\n${squares}  ${fmtNum(game.total)} / ${fmtNum(game.rounds.length * 5000)}`;
  }
  $('#btn-share').addEventListener('click', async () => {
    if (!game) return;
    const text = shareText();
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard! 📋');
    } catch {
      prompt('Copy your score:', text);
    }
  });
  $('#btn-again').addEventListener('click', () => { const mode = game ? game.mode : selectedMode; game = null; startGame(mode); });
  $('#btn-menu').addEventListener('click', () => { Sfx.click(); quitToMenu(); });

  // ================= Keyboard =================
  document.addEventListener('keydown', e => {
    const openModalEl = $$('.modal').find(m => !m.hidden);
    if (e.key === 'Escape' && openModalEl) { closeModal(openModalEl); return; }
    if (openModalEl || e.target.closest('input, textarea')) return;
    const active = $('.screen.active');
    const resultOpen = $('#result').classList.contains('active');

    if (active && active.id === 'menu' && $('#loading').hidden) {
      const i = MODE_ORDER.indexOf(selectedMode);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); selectMode(MODE_ORDER[(i + 1) % MODE_ORDER.length]); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); selectMode(MODE_ORDER[(i + MODE_ORDER.length - 1) % MODE_ORDER.length]); }
      else if (e.key === 'Enter' && !e.target.closest('button')) { startGame(selectedMode); }
      return;
    }
    if (resultOpen) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); nextRound(); }
      return;
    }
    if (active && active.id === 'game' && game) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); submitGuess(); }
      else if (e.key === 'r' || e.key === 'R') returnToStart();
      else if (e.key === 'h' || e.key === 'H') useHint();
      else if (e.key === 'm' || e.key === 'M') {
        if (isMobile()) toggleMobileMap(!wrap.classList.contains('mobile-open'));
        else wrap.classList.toggle('locked');
      }
    }
  });

  // ================= Boot =================
  buildSceneDecor();
  selectMode(selectedMode, { silent: true });
  if (!store.get('seenIntro', false)) {
    store.set('seenIntro', true);
    setTimeout(() => openModal('howto'), 600);
  }
})();
