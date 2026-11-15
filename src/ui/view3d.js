// A ray-traced viewport with drag-to-look and automatic quality scaling.
import { h } from './dom.js';
import { BlackHoleView, AdaptiveScale, attachLook } from '../render/raytracer.js';

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
  // Adaptive resolution: aim for 30 fps or better, never below a fifth-res render (see AdaptiveScale).
  const ctl = view ? new AdaptiveScale({ lo: 0.2, hi: 1, scale: view.state.scale, budgetMs: 14 }) : null;
  function render(dt) {
    if (!view || view.lost) { render.prev = 0; return; }
    view.render();
    const now = performance.now(), ms = now - (render.prev || now); render.prev = now;
    const fresh = view.gpuMs != null && now - view.gpuAt < 1000;
    if (ms > 0) view.set({ scale: ctl.update(ms, fresh ? view.gpuMs : null) });
  }
  return { el, canvas, view, look: look.st, render, error, dispose() { clearTimeout(giveUp); look.dispose(); view?.dispose(); } };
}
