// A ray-traced viewport with drag-to-look and automatic quality scaling.
import { h } from './dom.js';
import { BlackHoleView, attachLook } from '../render/raytracer.js';

/** How long to wait for the browser to hand a lost GPU context back before offering a reload. */
export const RESTORE_WAIT_MS = 4000;

/** The honest message for a view whose GPU context is gone: a driver restart, not a missing feature. */
export function driverRestartedNote({ waiting = false } = {}) {
  return h('div.no-gl.gl-lost', { role: 'status' },
    h('b', 'The graphics driver restarted'),
    h('p', waiting
      ? 'The 3D view stopped when the graphics driver restarted. Waiting for it to come back…'
      : 'The 3D view stopped when the graphics driver restarted, and the browser has not given it back. Reloading the page usually brings it back. Your progress is saved.'),
    waiting ? null : h('button.fp-wide', { type: 'button', onclick: () => location.reload() }, 'Reload'));
}

export function viewport({ label = 'Ray-traced view of the black hole', className = '' } = {}) {
  const canvas = h('canvas.rt', { 'aria-label': label });
  const el = h('div.viewport' + (className ? '.' + className : ''), canvas);
  let view = null, error = null, note = null, giveUp = 0;
  const showNote = (n) => { note?.remove(); note = n; if (n) el.append(n); };
  const onLost = () => {
    showNote(driverRestartedNote({ waiting: true }));
    clearTimeout(giveUp);
    giveUp = setTimeout(() => { if (view?.lost) showNote(driverRestartedNote()); }, RESTORE_WAIT_MS);
  };
  const onRestored = () => { clearTimeout(giveUp); showNote(null); };
  try { view = new BlackHoleView(canvas, { onLost, onRestored }); } catch (e) {
    error = e;
    showNote(e.reason === 'lost' ? driverRestartedNote()
      : h('div.no-gl', h('b', 'The 3D view needs WebGL 2.'), h('p', String(e.message || e))));
  }
  const look = attachLook(canvas);
  // Adaptive resolution: aim for ~30 fps, never below a quarter-res render.
  let avg = 16, frames = 0;
  function render(dt) {
    if (!view || view.lost) { render.prev = 0; return; }
    view.render();
    const now = performance.now(), ms = now - (render.prev || now); render.prev = now;
    avg = avg * 0.85 + ms * 0.15; frames++;
    if (frames > 10 && frames % 15 === 0) {
      const s = view.state.scale;
      if (avg > 36 && s > 0.2) view.set({ scale: Math.max(0.2, s * 0.8) });
      else if (avg < 22 && s < 1) view.set({ scale: Math.min(1, s * 1.07) });
    }
  }
  return { el, canvas, view, look: look.st, render, error, dispose() { clearTimeout(giveUp); look.dispose(); view?.dispose(); } };
}
