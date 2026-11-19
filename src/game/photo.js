// Photo mode: world time stops, the HUD goes, and the camera floats free a little way around the ship.
// A few looks (field of view, exposure, the sky alone, a vignette) and a PNG of what is on screen.
// Nothing here runs while photo mode is off, apart from a key listener and one gamepad button check.
//
// The picture is two stacked canvases: the ray-traced sky underneath and three.js (the ship, with
// see-through windows) on top. Neither keeps its buffer after the frame is shown, so capture() draws
// both afresh and copies them into one canvas in the same task, sky first.
import { h } from '../ui/dom.js';
import { hoverVelocity } from '../render/raytracer.js';
import { shipPosition, toHole } from './world.js';
import { step } from './walk.js';
import { unlock } from './discoveries.js';
import { moveKeysText } from './settings.js';

const REACH = 3; // metres the camera may float from where photo mode began
const Y_MIN = 0.35, Y_MAX = 2.35;
const FOV_MIN = 25, FOV_MAX = 110;
const EV = 2; // exposure range, in stops either way
const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function createPhoto(g, { el, THREE, camera, scene, renderer, sky, skyCanvas, threeCanvas, controls, audio, resize, invertY }) {
  let on = false, saved = null, anchor = null, cam = null, bar = null, vig = null, padPrev = {}, selectPrev = false, busy = false;
  const look = { fov: 70, ev: 0, noShip: false, vignette: false };
  const held = new Set();
  const v = new THREE.Vector3();

  // the sky seen from the ship, aimed along the photo camera (the same view the game draws through the windows)
  const skyParams = () => {
    const q = camera.quaternion;
    const r = toHole(v.set(1, 0, 0).applyQuaternion(q).toArray()), u = toHole(v.set(0, 1, 0).applyQuaternion(q).toArray()), f = toHole(v.set(0, 0, -1).applyQuaternion(q).toArray());
    const pos = shipPosition(g.shipR);
    return { cam: pos, basis: [r, u, f], V: hoverVelocity(pos), fov: THREE.MathUtils.degToRad(camera.fov), time: g.time, disk: true };
  };

  function applyLook() {
    const k = 2 ** look.ev;
    if (sky) sky.set({ exposure: saved.skyExposure * k });
    renderer.toneMappingExposure = saved.toneExposure * k;
    g.skyOverride = look.noShip ? skyParams : saved.skyOverride;
    g.hideShip = look.noShip ? true : saved.hideShip;
    vig.hidden = !look.vignette;
    if (!bar) return;
    for (const [k2, b] of Object.entries(bar.toggles)) b.setAttribute('aria-pressed', String(!!look[k2]));
    bar.fov.input.value = look.fov; bar.fov.out.textContent = `${Math.round(look.fov)}°`;
    bar.ev.input.value = look.ev; bar.ev.out.textContent = `${look.ev > 0 ? '+' : look.ev < 0 ? '−' : ''}${Math.abs(look.ev).toFixed(1)} EV`;
  }

  function range(label, min, max, stepV, key) {
    const out = h('output');
    const input = h('input', { type: 'range', min, max, step: stepV, value: look[key], 'aria-label': label });
    input.addEventListener('input', () => { look[key] = +input.value; applyLook(); });
    return { el: h('label.ph-range', h('span', label), input, out), input, out };
  }

  // touch has no R and F keys: two hold-to-move buttons raise and lower the camera instead
  function riseBtn(label, code, glyph) {
    const b = h('button.ph-rise', { type: 'button', 'aria-label': `Camera ${label.toLowerCase()} (hold)` }, glyph);
    const on = (e) => { e.preventDefault(); held.add(code); }, off = () => held.delete(code);
    b.addEventListener('pointerdown', on); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, off);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    return b;
  }

  function buildBar() {
    const toggle = (label, key) => h('button.ph-toggle', { type: 'button', 'aria-pressed': 'false', onclick: () => { look[key] = !look[key]; applyLook(); } }, label);
    const fov = range('Field of view', FOV_MIN, FOV_MAX, 1, 'fov'), ev = range('Exposure', -EV, EV, 0.1, 'ev');
    const toggles = { noShip: toggle('Sky only', 'noShip'), vignette: toggle('Vignette', 'vignette') };
    const savedLine = h('p.ph-saved', { role: 'status', hidden: true });
    const b = h('div.ph-bar', { role: 'toolbar', 'aria-label': 'Photo mode' },
      h('div.ph-row', h('p.eyebrow', 'Photo mode'), h('span.ph-keys',
        h('span.hint-keys', `Drag or click to look · ${moveKeysText()} move · R F up and down · C save · H hide · P done`),
        h('span.hint-pad', 'Sticks move and look · LB RB down and up · A save · X Y looks · B done'),
        h('span.hint-touch', 'Drag to look · left thumb to move'))),
      h('div.ph-row', fov.el, ev.el),
      h('div.ph-row', toggles.noShip, toggles.vignette, riseBtn('Up', 'KeyR', '▲'), riseBtn('Down', 'KeyF', '▼'),
        h('button.ph-save', { type: 'button', onclick: () => capture() }, 'Save picture'),
        h('button.ph-done', { type: 'button', onclick: () => exit() }, 'Done')),
      // the last save stays named here, so the confirmation cannot be missed (the toast fades)
      savedLine);
    return Object.assign(b, { fov, ev, toggles, savedLine });
  }

  const onKey = (e) => {
    if (e.target.closest?.('textarea, input[type=text]')) return;
    if (e.type === 'keyup') { held.delete(e.code); return; }
    held.add(e.code);
    if (e.repeat) return;
    if (e.code === 'KeyC') capture();
    else if (e.code === 'KeyH') bar.hidden = !bar.hidden;
    else if (e.code === 'KeyN') { look.noShip = !look.noShip; applyLook(); }
    else if (e.code === 'KeyV') { look.vignette = !look.vignette; applyLook(); }
  };
  const onSkyClick = () => { if (!controls.isTouch() && document.pointerLockElement !== el) el.requestPointerLock?.()?.catch?.(() => {}); };

  function enter() {
    if (on || g.mode !== 'walk' || g.paused || g.hud.choosing || g.aborted) return false;
    on = true;
    saved = { fov: camera.fov, skyOverride: g.skyOverride, hideShip: g.hideShip, skyExposure: sky?.state.exposure ?? 1, toneExposure: renderer.toneMappingExposure };
    cam = { x: g.me.x, z: g.me.z, y: g.eye, yaw: g.me.yaw, pitch: g.me.pitch, vx: 0, vz: 0 };
    anchor = { x: cam.x, z: cam.z };
    Object.assign(look, { fov: Math.round(camera.fov), ev: 0, noShip: false, vignette: false });
    vig = h('div.ph-vignette', { hidden: true, 'aria-hidden': 'true' });
    bar = buildBar();
    el.append(vig, bar);
    el.classList.add('fp-photo');
    applyLook();
    g.hud.prompt(null); controls.showUse(null); audio.duck(true);
    addEventListener('keydown', onKey); addEventListener('keyup', onKey);
    skyCanvas.addEventListener('click', onSkyClick);
    g.photo = api;
    return true;
  }

  function exit() {
    if (!on) return;
    on = false;
    removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); held.clear();
    skyCanvas.removeEventListener('click', onSkyClick);
    if (sky) sky.set({ exposure: saved.skyExposure });
    renderer.toneMappingExposure = saved.toneExposure;
    g.skyOverride = saved.skyOverride; g.hideShip = saved.hideShip;
    bar?.remove(); vig?.remove(); bar = null; vig = null;
    el.classList.remove('fp-photo');
    audio.duck(false);
    resize(); // puts the field of view back
    g.photo = null;
  }

  /** Called by the game loop instead of walking while photo mode is on. dt is real time (world time is stopped). */
  function update(dt, inp) {
    cam.yaw -= inp.lookDX;
    cam.pitch = Math.max(-1.5, Math.min(1.5, cam.pitch - inp.lookDY * (invertY() ? -1 : 1)));
    let rise = (held.has('KeyR') ? 1 : 0) - (held.has('KeyF') ? 1 : 0);
    const gp = navigator.getGamepads?.()[0];
    if (gp && gp.mapping === 'standard') {
      const b = (i) => !!gp.buttons[i]?.pressed;
      rise += (b(5) ? 1 : 0) - (b(4) ? 1 : 0);
      if (b(14)) look.fov = Math.max(FOV_MIN, look.fov - 30 * dt);
      if (b(15)) look.fov = Math.min(FOV_MAX, look.fov + 30 * dt);
      if (b(12)) look.ev = Math.min(EV, look.ev + 1.2 * dt);
      if (b(13)) look.ev = Math.max(-EV, look.ev - 1.2 * dt);
      if (b(12) || b(13) || b(14) || b(15)) applyLook();
      if (b(0) && !padPrev.a) capture();
      if (b(2) && !padPrev.x) { look.vignette = !look.vignette; applyLook(); }
      if (b(3) && !padPrev.y) { look.noShip = !look.noShip; applyLook(); }
      if (b(1) && !padPrev.b) { padPrev = {}; exit(); return; }
      padPrev = { a: b(0), b: b(1), x: b(2), y: b(3) };
    }
    // float: walls still stop the camera, and it stays within a few metres of where it started
    const next = step(cam, { forward: inp.forward, right: inp.right, run: false }, dt, g.ship.colliders);
    cam.x = next.x; cam.z = next.z; cam.vx = next.vx; cam.vz = next.vz;
    const dx = cam.x - anchor.x, dz = cam.z - anchor.z, d = Math.hypot(dx, dz);
    if (d > REACH) { cam.x = anchor.x + (dx / d) * REACH; cam.z = anchor.z + (dz / d) * REACH; }
    cam.y = Math.max(Y_MIN, Math.min(Y_MAX, cam.y + rise * 1.1 * dt));
    camera.position.set(cam.x, cam.y, cam.z); camera.rotation.set(cam.pitch, cam.yaw, 0);
    if (camera.fov !== look.fov) { camera.fov = look.fov; camera.updateProjectionMatrix(); }
    const want = saved.skyExposure * 2 ** look.ev;
    if (sky && sky.state.exposure !== want) sky.set({ exposure: want }); // in case anything else set it this frame
  }

  /** Draw both layers at full quality and composite them into one PNG. Resolves with the Blob. */
  async function capture() {
    if (!on || busy) return null;
    busy = true;
    let note = null;
    try {
      // the full-quality sky can take a second or so on a small GPU: say so, and let that paint first
      note = h('div.ph-developing', { role: 'status' }, 'Developing…'); el.append(note);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const pr = Math.min(2, devicePixelRatio || 1), w = el.clientWidth, hh = el.clientHeight;
      const W = Math.round(w * pr), H = Math.round(hh * pr);
      camera.updateMatrixWorld();
      renderer.setPixelRatio(pr); renderer.setSize(w, hh, false);
      const out = document.createElement('canvas'); out.width = W; out.height = H;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (sky && !sky.lost) {
        // one frame at full resolution (one sky pixel per picture pixel) and a generous step budget,
        // whatever the live adaptive scale is; the state is set directly so the low-GPU cap in set()
        // does not apply to this single frame. The live values come straight back afterwards.
        const { scale: scale0, steps: steps0 } = sky.state;
        sky.set(g.skyOverride ? g.skyOverride(g) : skyParams());
        sky.state.scale = pr / (devicePixelRatio || 1); sky.state.steps = Math.max(steps0, 640);
        const timer = sky.timer; sky.timer = null; // keep this one-off frame out of the adaptive GPU timing
        try { sky.render(null); } finally { sky.timer = timer; } // the whole frame, not just the window rectangles
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(skyCanvas, 0, 0, W, H);
        sky.state.scale = scale0; sky.state.steps = steps0;
      }
      if (!look.noShip) { renderer.render(scene, camera); ctx.drawImage(threeCanvas, 0, 0, W, H); }
      if (look.vignette) {
        const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) / 2);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.72)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
      resize(); // the game's own resolution again
      note.remove(); note = null;
      const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
      if (!blob) throw new Error('no image');
      api.last = blob;
      // named in local time, the time on the player's own clock
      const d = new Date(), two = (n) => String(n).padStart(2, '0');
      const name = `frozen-star-${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}-${two(d.getMinutes())}-${two(d.getSeconds())}.png`;
      const a = h('a', { href: URL.createObjectURL(blob), download: name });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      if (!reduceMotion()) { const f = h('div.ph-flash', { 'aria-hidden': 'true' }); el.append(f); setTimeout(() => f.remove(), 450); }
      if (bar?.savedLine) { bar.savedLine.hidden = false; bar.savedLine.textContent = `Saved ${name} to your Downloads folder.`; }
      g.hud.toast(`Saved ${name}`, { sub: 'In your Downloads folder (or wherever your browser saves files).', sec: 6 });
      unlock('shutterbug');
      return blob;
    } catch (e) {
      console.warn('photo capture failed', e);
      g.hud.toast('Could not save the picture');
      return null;
    } finally { busy = false; note?.remove(); }
  }

  const onP = (e) => {
    if (e.code !== 'KeyP' || e.repeat || e.target.closest?.('textarea, input[type=text]')) return;
    if (on) exit(); else enter();
  };
  addEventListener('keydown', onP);

  const api = {
    get on() { return on; },
    last: null,
    enter, exit, update, capture,
    toggle() { return on ? exit() : enter(); },
    /** The gamepad's Select (Back) button toggles photo mode. One button read a frame. */
    pollPad() {
      const s = !!navigator.getGamepads?.()[0]?.buttons[8]?.pressed;
      if (s && !selectPrev) { if (on) exit(); else enter(); }
      selectPrev = s;
    },
    dispose() { exit(); removeEventListener('keydown', onP); },
  };
  return api;
}

if (typeof document !== 'undefined' && !document.querySelector('link[data-fs="photo"]')) {
  document.head.append(h('link', { rel: 'stylesheet', href: new URL('./photo.css', import.meta.url).href, 'data-fs': 'photo' }));
}
