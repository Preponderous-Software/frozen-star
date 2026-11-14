import { h, loop, slider, stat } from '../ui/dom.js';
import { Infall } from '../physics/infall.js';
import { HOLES, formatDuration, formatAccel, secondsFromM } from '../physics/units.js';
import { tidalStretch } from '../physics/body.js';
import { viewport } from '../ui/view3d.js';
import { yawPitchBasis, fallerVelocity } from '../render/raytracer.js';

// What you see while falling. Milestones are radii in units of M.
const CAPTIONS = [
  [19.9, 'You let go of the station. Ahead: the shadow, ringed by light that has looped around the hole.'],
  [12, 'The shadow already looks bigger than the hole really is. Its edge is light skimming the photon sphere, 1.5 rₛ out.'],
  [5, 'Look at the disk. The side coming toward you is brighter and bluer; the side moving away is dim and red.'],
  [3, 'You are passing the photon sphere. Here, light can orbit the hole.'],
  [2.15, 'The horizon is just ahead. There is nothing there to see or feel.'],
  [1.99, 'You crossed the horizon. Nothing happened. You can still see the universe behind you; it just cannot see you.'],
  [1.2, 'Look back up. The outside universe is shrinking into a bright patch overhead. Every path forward leads to r = 0.'],
  [0.4, 'The singularity is not a place ahead of you. It is a moment in your future, like tomorrow.'],
];
const R_END = 0.3;

export default {
  id: 'into-the-dark', num: 6, title: 'Into the Dark',
  kicker: 'Fall in yourself. The view is ray-traced through curved spacetime.',
  goals: ['Cross the horizon', 'Look back up from inside', 'Ride it to the end'],
  mount(root, ctx) {
    const f = new Infall(20), hole = HOLES[1], E = f.E;
    const dir = norm([0.15, 0.32, -1]);
    let tau = 0, paused = true, caption = -1, lookedUp = false, done = false, t = 0;
    const vp = viewport({ label: 'First-person view while falling into the black hole', className: 'tall' });
    const cap = h('div.caption', 'Press Fall to let go. Drag the view to look around.');
    const hud = h('div.hud');
    const sTau = stat('Your clock'), sR = stat('Distance'), sStation = stat('Station sees you at'), sTide = stat('Tidal stretch');
    hud.append(sTau.el, sR.el, sStation.el, sTide.el);
    vp.el.append(cap, hud);
    const speed = slider('Playback', { id: 'id-speed', min: 0.25, max: 8, step: 0.25, value: 3, fmt: (v) => `${v} M/s` });
    const go = h('button.primary#id-go', 'Fall');
    const up = h('button#id-up', 'Look up');
    const ahead = h('button#id-ahead', 'Look ahead');
    const disk = h('input#id-disk', { type: 'checkbox', checked: true });
    const grid = h('input#id-grid', { type: 'checkbox' });
    go.addEventListener('click', () => {
      if (done) { tau = 0; done = false; caption = -1; }
      paused = !paused; go.textContent = paused ? 'Resume' : 'Pause';
    });
    up.addEventListener('click', () => { vp.look.yaw = Math.PI; vp.look.pitch = 0; });
    ahead.addEventListener('click', () => { vp.look.yaw = 0; vp.look.pitch = 0; });
    root.append(
      h('div.controls', go, speed.el, up, ahead, h('label.check', { for: 'id-disk' }, disk, 'Accretion disk'), h('label.check', { for: 'id-grid' }, grid, 'Sky grid')),
      vp.el,
      h('p.fine', `You fall from rest at 10 rₛ around ${hole.name}. Every pixel follows a real light ray backwards through Painlevé–Gullstrand coordinates, which stay well-behaved through the horizon, then shifts its colour by the true redshift.`),
    );

    const stop = loop((dt) => {
      t += dt;
      if (!paused && !done) tau = Math.min(f.tauEnd, tau + dt * speed.value);
      const r = Math.max(R_END, f.rOfTau(tau));
      if (r <= R_END && !done) { done = true; paused = true; go.textContent = 'Fall again'; ctx.goal(2, true); finale(); }
      if (r < 2) ctx.goal(0, true);
      const lookingUp = Math.cos(vp.look.yaw) * Math.cos(vp.look.pitch) < -0.3;
      if (r < 2 && lookingUp && !lookedUp) { lookedUp = true; ctx.goal(1, true); }
      while (caption + 1 < CAPTIONS.length && r <= CAPTIONS[caption + 1][0] && tau > 0) { caption++; cap.textContent = CAPTIONS[caption][1]; }
      const seen = f.seenAt(tau);
      sTau.set(`${tau.toFixed(2)} M · ${formatDuration(secondsFromM(tau, hole.mass))}`);
      sR.set(`${(r / 2).toFixed(3)} rₛ${r < 2 ? ' <span class="bad-t">inside</span>' : ''}`);
      sStation.set(seen.lnz > 9 ? 'gone from view' : `${(seen.r / 2).toFixed(seen.r < 2.01 ? 5 : 2)} rₛ`);
      sTide.set(formatAccel(tidalStretch(r, hole.mass)));
      if (vp.view) {
        const pos = dir.map((v) => v * r);
        vp.view.set({ cam: pos, basis: yawPitchBasis(dir.map((v) => -v), vp.look.yaw, vp.look.pitch), V: fallerVelocity(pos, E), disk: disk.checked, grid: grid.checked, time: t, fov: 1.5, steps: 700 });
        vp.render(dt);
      }
    });

    function finale() {
      ctx.debrief({
        title: 'What falling in is really like',
        body: [
          `From letting go to the end took ${formatDuration(secondsFromM(f.tauEnd, hole.mass))} on your clock, about ${formatDuration(secondsFromM(f.tauEnd - f.tauH, hole.mass))} of it inside the horizon.`,
          'The horizon was not a surface. It is the boundary of the region from which light can no longer get out, and you only know you passed it by doing the arithmetic.',
          'Meanwhile the station saw you slow, redden and fade just above the horizon. Both accounts describe the same fall; they differ only in which light reaches whom.',
        ],
      });
    }
    return () => { stop(); vp.dispose(); };
  },
};

function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l); }
