// A quiet custom cursor: a dot that sits exactly on the pointer and a ring that drifts after it.
// Only on devices with a real mouse; touch screens keep their normal behaviour.
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const dot = document.createElement('div'); dot.className = 'cur-dot';
  const ring = document.createElement('div'); ring.className = 'cur-ring';
  document.body.append(ring, dot);
  document.documentElement.classList.add('has-cursor');

  let x = -100, y = -100, rx = -100, ry = -100, seen = false;
  const show = (on) => { dot.style.opacity = ring.style.opacity = on ? 1 : 0; };
  show(false);

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    x = e.clientX; y = e.clientY;
    if (!seen) { rx = x; ry = y; seen = true; }
    const el = e.target instanceof Element ? e.target : null;
    // Inside an embedded page the browser's own cursor takes over.
    show(!(el && el.tagName === 'IFRAME'));
    ring.classList.toggle('on', !!(el && el.closest('a, button, [role="button"], .card, canvas.clickable')));
  }, { passive: true });
  window.addEventListener('pointerdown', () => ring.classList.add('down'));
  window.addEventListener('pointerup', () => ring.classList.remove('down'));
  document.documentElement.addEventListener('mouseleave', () => show(false));
  document.documentElement.addEventListener('mouseenter', () => show(true));

  const loop = () => {
    rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
    dot.style.transform = `translate3d(${x}px,${y}px,0)`;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
