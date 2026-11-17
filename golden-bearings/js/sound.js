// Tiny synthesized sound kit (no audio files needed).
window.Sfx = (() => {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!enabled) return null;
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, to = null, dur = 0.15, type = 'sine', vol = 0.18, delay = 0 }) {
    const c = ac();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.3, vol = 0.12, from = 400, to = 2400, delay = 0 }) {
    const c = ac();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.Q.value = 1.2;
    filt.frequency.setValueAtTime(from, t0);
    filt.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(gain).connect(c.destination);
    src.start(t0);
  }

  const notes = (seq, opts = {}) =>
    seq.forEach((f, i) => tone({ freq: f, dur: opts.dur || 0.18, type: opts.type || 'triangle', vol: opts.vol || 0.16, delay: i * (opts.gap || 0.09) }));

  return {
    setEnabled(v) { enabled = !!v; },
    get enabled() { return enabled; },
    hover() { tone({ freq: 720, to: 980, dur: 0.07, type: 'triangle', vol: 0.05 }); },
    click() { tone({ freq: 380, to: 820, dur: 0.12, type: 'triangle', vol: 0.16 }); tone({ freq: 1200, dur: 0.05, type: 'sine', vol: 0.05, delay: 0.05 }); },
    pin() { tone({ freq: 260, to: 620, dur: 0.11, type: 'sine', vol: 0.2 }); tone({ freq: 620, to: 480, dur: 0.12, type: 'sine', vol: 0.12, delay: 0.1 }); },
    whoosh() { noise({ dur: 0.35, vol: 0.1 }); },
    tick() { tone({ freq: 1400, dur: 0.04, type: 'square', vol: 0.04 }); },
    open() { tone({ freq: 500, to: 900, dur: 0.14, type: 'sine', vol: 0.14 }); },
    close() { tone({ freq: 800, to: 420, dur: 0.12, type: 'sine', vol: 0.12 }); },
    great() { notes([523, 659, 784, 1047], { gap: 0.08 }); },
    good() { notes([523, 659, 784], { gap: 0.09 }); },
    meh() { notes([440, 494], { gap: 0.12 }); },
    sad() { notes([392, 330, 262], { gap: 0.14, type: 'sine' }); },
    fanfare() { notes([523, 659, 784, 1047, 784, 1047, 1319], { gap: 0.11, dur: 0.22 }); },
    sticker() { notes([880, 1175, 1568], { gap: 0.06, type: 'sine', vol: 0.12 }); }
  };
})();
