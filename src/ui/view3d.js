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
    view.render();
    const now = performance.now(), ms = now - (render.prev || now); render.prev = now;
    avg = avg * 0.85 + ms * 0.15; frames++;
    if (frames > 10 && frames % 15 === 0) {
      const s = view.state.scale;
      if (avg > 36 && s > 0.2) view.set({ scale: Math.max(0.2, s * 0.8) });
      else if (avg < 22 && s < 1) view.set({ scale: Math.min(1, s * 1.07) });
    }
  }
  return { el, canvas, view, look: look.st, render, error, dispose() { look.dispose(); view?.dispose(); } };
}
