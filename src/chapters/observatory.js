import { h, loop, slider, stat } from '../ui/dom.js';
import { viewport } from '../ui/view3d.js';
import { lookBasis, hoverVelocity } from '../render/raytracer.js';
import { sig } from '../physics/units.js';

export default {
  id: 'observatory', num: 0, title: 'Observatory',
  kicker: 'A free camera around a black hole. Every pixel is a traced light ray.',
  goals: [],
  mount(root) {
    const vp = viewport({ label: 'Free camera around a black hole', className: 'tall' });
    const dist = slider('Distance', { id: 'ob-dist', min: Math.log10(1.05), max: Math.log10(60), step: 0.001, value: Math.log10(15), fmt: (v) => `${sig(10 ** v)} rₛ` });
    const motion = h('select#ob-motion', h('option', { value: 'hover' }, 'Hovering (rockets on)'), h('option', { value: 'fall' }, 'Falling freely from far away'));
    const checks = [['disk', 'Accretion disk', true], ['grid', 'Sky grid', false], ['shift', 'Colour shifts', true], ['spin', 'Auto-orbit', true]]
      .map(([id, label, on]) => ({ id, input: h(`input#ob-${id}`, { type: 'checkbox', checked: on }), label }));
    const sShadow = stat('Shadow size'), sMode = stat('You are'), sNote = h('p.fine');
    vp.el.append(h('div.hud', sShadow.el, sMode.el));
    root.append(
      h('div.controls', dist.el, h('label', { for: 'ob-motion' }, h('span', 'Motion'), motion), checks.map((c) => h('label.check', { for: `ob-${c.id}` }, c.input, c.label))),
      vp.el, sNote);
    let t = 0, orbit = 0;
    const stop = loop((dt) => {
      t += dt;
      const on = Object.fromEntries(checks.map((c) => [c.id, c.input.checked]));
      if (on.spin) orbit += dt * 0.08;
      let r = 2 * 10 ** dist.value;
      const mode = motion.value === 'hover' && r > 2 ? 'hover' : 'fall';
      const yaw = orbit + vp.look.yaw, pitch = Math.max(-1.45, Math.min(1.45, 0.12 + vp.look.pitch));
      const pos = [Math.sin(yaw) * Math.cos(pitch) * r, Math.sin(pitch) * r, -Math.cos(yaw) * Math.cos(pitch) * r];
      // Angular radius of the shadow for a hovering observer: sin α = (3√3/r)·√(1 − 2/r) (for r ≥ 3); larger closer in.
      const sinA = (3 * Math.sqrt(3) / r) * Math.sqrt(Math.max(0, 1 - 2 / r));
      const alpha = r >= 3 ? Math.asin(Math.min(1, sinA)) : Math.PI - Math.asin(Math.min(1, sinA));
      sShadow.set(mode === 'hover' ? `${sig((alpha * 2 * 180) / Math.PI)}° across` : '–');
      sMode.set(mode === 'hover' ? 'hovering' : r < 2 ? 'inside, falling' : 'falling');
      sNote.textContent = mode === 'hover'
        ? 'Hovering means fighting the inflow of space. Drag to orbit. Close in, the shadow fills most of the sky.'
        : 'Falling freely, you move with the inflow, so the shadow looks smaller than when hovering at the same spot. Inside the horizon only falling is possible.';
      if (vp.view) {
        vp.view.set({ cam: pos, basis: lookBasis(pos, [0, 0, 0]), V: mode === 'hover' ? hoverVelocity(pos) : [0, 0, 0], disk: on.disk, grid: on.grid, shift: on.shift, time: t, fov: 1.1 });
        vp.render(dt);
      }
    });
    return () => { stop(); vp.dispose(); };
  },
};
