// A ray-traced viewport with drag-to-look and automatic quality scaling.
import { h } from './dom.js';
import { BlackHoleView, attachLook } from '../render/raytracer.js';

export function viewport({ label = 'Ray-traced view of the black hole', className = '' } = {}) {
  const canvas = h('canvas.rt', { 'aria-label': label });
  const el = h('div.viewport' + (className ? '.' + className : ''), canvas);
  let view = null, error = null;
  try { view = new BlackHoleView(canvas); } catch (e) { error = e; el.append(h('div.no-gl', h('b', 'The 3D view needs WebGL 2.'), h('p', String(e.message || e)))); }
  const look = attachLook(canvas);
  // Adaptive resolution: aim for ~30 fps, never below a quarter-res render.
  let avg = 16, frames = 0;
  function render(dt) {
    if (!view) return;
    const t0 = performance.now();
    view.render();
    view.gl.finish?.();
    const ms = performance.now() - t0;
    avg = avg * 0.9 + ms * 0.1; frames++;
    if (frames > 10 && frames % 15 === 0) {
      const s = view.state.scale;
      if (avg > 34 && s > 0.3) view.set({ scale: Math.max(0.3, s * 0.82) });
      else if (avg < 14 && s < 1) view.set({ scale: Math.min(1, s * 1.12) });
    }
  }
  return { el, canvas, view, look: look.st, render, error, dispose() { look.dispose(); view?.dispose(); } };
}
