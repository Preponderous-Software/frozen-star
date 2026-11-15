// The first-person game: two stacked canvases. Underneath, the general-relativistic ray tracer draws
// the sky around Erebus as seen from the ship; on top, three.js draws the ship with transparent
// windows. Both share one camera, so looking through a window shows the real, lensed sky.
import * as THREE from 'three';
import { h } from '../ui/dom.js';
import { BlackHoleView, hoverVelocity, LOW_GPU } from '../render/raytracer.js';
import { buildShip } from './ship.js';
import { createControls } from './controls.js';
import { createHud } from './hud.js';
import { step, EYE } from './walk.js';
import { shipPosition, toHole, fromHole, SEC_PER_M, R_STATION, DISK_OUTER } from './world.js';
import { hoverRate } from '../physics/body.js';
import { runStory } from './story.js';

const DEBUG = typeof location !== 'undefined' && /[?&]debug\b/.test(location.search);
const T0 = performance.now();
const TIME_SCALE = DEBUG ? Number(new URLSearchParams(location.search).get('timescale')) || 1 : 1;
const mark = (m) => { if (DEBUG) console.log(`[fs ${(performance.now() - T0).toFixed(0)}ms] ${m}`); };

export function mountGame(root, { checkpoint } = {}) {
  mark('mount');
  const el = h('div.fp-root');
  const skyCanvas = h('canvas.fp-sky', { 'aria-hidden': 'true' });
  const threeCanvas = h('canvas.fp-three', { 'aria-label': 'Inside the research vessel Tern' });
  const panel = h('div.fp-panel', { hidden: true });
  const menuBtn = h('button.fp-menu-btn', { type: 'button', 'aria-label': 'Menu' }, '☰');
  const menu = h('div.fp-menu', { hidden: true });
  el.append(skyCanvas, threeCanvas, panel, menuBtn, menu);
  root.replaceChildren(el);
  document.body.classList.add('fp-active');

  // ---- renderers ----
  const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, alpha: true, antialias: !LOW_GPU, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 2000);
  camera.rotation.order = 'YXZ';
  mark('renderer'); const ship = buildShip(); mark('ship built');
  scene.add(ship.group);
  let sky = null;
  try { sky = new BlackHoleView(skyCanvas, { scale: LOW_GPU ? 0.2 : 0.6 }); sky.set({ diskOuter: DISK_OUTER, steps: 520, exposure: 1.6 }); }
  catch (e) { skyCanvas.replaceWith(h('div.fp-nosky', 'The view outside needs WebGL 2.')); }

  // ---- markers: points of light seen through the windows (a falling probe, a capsule) ----
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const markers = new Set();

  // ---- state ----
  const g = {
    THREE, scene, camera, ship, sky, el, panel,
    time: 0, mode: 'walk', shipR: R_STATION, flags: {}, handlers: {},
    me: { x: 3.1, z: 4.8, yaw: 0, pitch: 0, vx: 0, vz: 0 },
    eye: EYE, clocks: { ship: 0, relay: 0 }, physicsPaused: false, physicsTime: 0,
    skyOverride: null, screenDraw: {}, aborted: false, ticks: new Set(),
  };
  const hud = createHud(el);
  g.hud = hud;
  const controls = createControls(el, { onBack: () => { if (g.mode === 'console') closeApp(); } });
  g.controls = controls;

  // ---- story helpers ----
  const waiters = [];
  g.wait = (sec) => new Promise((res, rej) => waiters.push({ t: g.time + sec, res, rej }));
  g.until = (fn) => new Promise((res, rej) => waiters.push({ fn, res, rej }));
  g.say = (who, text, opts) => (g.aborted ? Promise.reject(new Error('aborted')) : hud.say(who, text, opts));
  g.objective = (t) => hud.objective(t);
  g.on = (id, fn) => { g.handlers[id] = fn; };
  g.enable = (id, on = true) => { const it = ship.interactables.find((i) => i.id === id); if (it) it.disabled = !on; };
  g.unlockDoor = (id, on = true) => { const d = ship.doors.find((x) => x.id === id); if (d) d.locked = !on; };
  g.inRoom = (id) => { const r = ship.rooms.find((x) => x.id === id); if (!r) return false; const [x0, z0, x1, z1] = r.box; return g.me.x > x0 && g.me.x < x1 && g.me.z > z0 && g.me.z < z1; };
  g.addMarker = (fn) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); scene.add(s); const m = { fn, s }; markers.add(m); return () => { scene.remove(s); markers.delete(m); }; };
  g.save = (cp) => { try { localStorage.setItem('frozen-star.fp.v1', JSON.stringify({ cp, flags: g.flags })); } catch { /* storage off */ } };
  g.physicsNow = () => g.physicsTime / SEC_PER_M; // in units of M

  // camera tweening for cutscenes and consoles
  let tween = null;
  g.pose = { pos: new THREE.Vector3(), yaw: 0, pitch: 0 };
  g.tweenTo = (pos, yaw, pitch, sec = 1) => new Promise((res) => { tween = { from: { pos: g.pose.pos.clone(), yaw: g.pose.yaw, pitch: g.pose.pitch }, to: { pos: pos.clone(), yaw, pitch }, t: 0, sec, res }; });
  const lookAngles = (from, to) => { const d = to.clone().sub(from); return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }; };
  g.lookAngles = lookAngles;

  // ---- consoles ----
  let appDispose = null, appResolve = null, walkPose = null;
  async function openApp(it, factory) {
    if (g.mode === 'console') return;
    walkPose = { ...g.me };
    g.mode = 'console'; controls.setEnabled(false); hud.crosshair(false); hud.prompt(null); controls.showUse(null);
    g.pose.pos.set(g.me.x, g.eye, g.me.z); g.pose.yaw = g.me.yaw; g.pose.pitch = g.me.pitch;
    const a = lookAngles(it.focus.pos, it.focus.look);
    await g.tweenTo(it.focus.pos, unwrap(a.yaw, g.pose.yaw), a.pitch, 0.7);
    panel.replaceChildren(); panel.hidden = false;
    const close = h('button.fp-close', { type: 'button', onclick: () => closeApp() }, '← Step back');
    const body = h('div.fp-app');
    panel.append(h('div.fp-panel-head', close, h('span.fine', controls.isTouch() ? '' : 'Esc or Q to step back')), body);
    appDispose = factory(body, g) || null;
    return new Promise((r) => { appResolve = r; });
  }
  async function closeApp() {
    if (g.mode !== 'console') return;
    appDispose?.(); appDispose = null; panel.hidden = true; panel.replaceChildren();
    g.mode = 'tweening';
    await g.tweenTo(new THREE.Vector3(walkPose.x, g.eye, walkPose.z), walkPose.yaw, walkPose.pitch, 0.5);
    g.me = { ...walkPose, vx: 0, vz: 0 }; g.mode = 'walk'; controls.setEnabled(true); hud.crosshair(true);
    appResolve?.(); appResolve = null;
  }
  g.openApp = openApp; g.closeApp = closeApp;
  const unwrap = (a, ref) => { while (a - ref > Math.PI) a -= 2 * Math.PI; while (a - ref < -Math.PI) a += 2 * Math.PI; return a; };

  // ---- interaction ----
  let focusIt = null;
  function findInteractable() {
    const eye = new THREE.Vector3(g.me.x, g.eye, g.me.z);
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(g.me.pitch, g.me.yaw, 0, 'YXZ'));
    let best = null, bestScore = 0.82;
    for (const it of ship.interactables) {
      if (it.disabled || !g.handlers[it.id]) continue;
      const to = it.pos.clone().sub(eye), d = to.length();
      if (d > it.radius) continue;
      const score = to.normalize().dot(dir) + 0.06 * (1 - d / it.radius);
      if (score > bestScore) { bestScore = score; best = it; }
    }
    return best;
  }
  function interact() {
    if (g.mode !== 'walk' || !focusIt) return;
    const fn = g.handlers[focusIt.id];
    fn?.(focusIt);
  }

  // ---- menu ----
  menuBtn.addEventListener('click', () => { menu.hidden = !menu.hidden; if (!menu.hidden) controls.unlock(); });
  menu.append(
    h('p.eyebrow', 'Paused'),
    h('button', { type: 'button', onclick: () => { menu.hidden = true; } }, 'Resume'),
    h('a.button', { href: '#title' }, 'Leave the ship'),
    h('button', { type: 'button', onclick: () => { try { localStorage.removeItem('frozen-star.fp.v1'); } catch { /* */ } location.hash = '#title'; } }, 'Forget my progress'),
    h('p.fine', 'WASD or arrows to walk, mouse to look (click to capture it), E to use, Shift to run. On touch: left thumb walks, drag to look.'),
  );

  // ---- main loop ----
  const tmpV = new THREE.Vector3(), frustum = new THREE.Frustum(), projM = new THREE.Matrix4(), wBox = new THREE.Box3();
  let last = performance.now(), raf = 0, alive = true, skyAvg = 16, skyFrames = 0, screenTimer = 0;
  function resize() {
    const w = el.clientWidth, hh = el.clientHeight;
    renderer.setPixelRatio(Math.min(LOW_GPU ? 0.75 : 1.5, devicePixelRatio || 1));
    renderer.setSize(w, hh, false);
    camera.aspect = w / Math.max(1, hh); camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(el); resize();

  let frameN = 0;
  function frame(now) {
    if (!alive) return;
    if (frameN < 3) mark('frame ' + frameN); frameN++;
    const dt = Math.min(0.1, (now - last) / 1000) * TIME_SCALE; last = now;
    g.time += dt; g.dt = dt;
    if (!g.physicsPaused) g.physicsTime += dt;
    // clocks: the ship's own and a relay far away (runs faster by 1/√(1 − 2M/r))
    g.clocks.ship += dt; g.clocks.relay += dt / hoverRate(g.shipR);
    for (let i = waiters.length - 1; i >= 0; i--) {
      const w = waiters[i];
      if ((w.t != null && g.time >= w.t) || (w.fn && w.fn())) { waiters.splice(i, 1); w.res(); }
    }
    for (const t of g.ticks) t(dt);
    const inp = controls.read(dt);
    if (g.mode === 'walk') {
      g.me.yaw -= inp.lookDX; g.me.pitch = Math.max(-1.45, Math.min(1.45, g.me.pitch - inp.lookDY));
      g.me = step(g.me, inp, dt, ship.colliders);
      camera.position.set(g.me.x, g.eye, g.me.z); camera.rotation.set(g.me.pitch, g.me.yaw, 0);
      focusIt = findInteractable();
      const label = focusIt?.label;
      hud.prompt(label ? (controls.isTouch() ? label : `<kbd>E</kbd> ${label}`) : null);
      controls.showUse(label || null);
      if (inp.interact) interact();
    } else {
      if (tween) {
        tween.t += dt; const k = Math.min(1, tween.t / tween.sec), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        g.pose.pos.lerpVectors(tween.from.pos, tween.to.pos, e);
        g.pose.yaw = tween.from.yaw + (tween.to.yaw - tween.from.yaw) * e; g.pose.pitch = tween.from.pitch + (tween.to.pitch - tween.from.pitch) * e;
        if (k >= 1) { const r = tween.res; tween = null; r(); }
      }
      if (g.mode === 'console' && !tween) { g.pose.yaw -= inp.lookDX * 0.25; g.pose.pitch = Math.max(-1, Math.min(1, g.pose.pitch - inp.lookDY * 0.25)); }
      camera.position.copy(g.pose.pos); camera.rotation.set(g.pose.pitch, g.pose.yaw, 0);
    }
    // doors
    for (const d of ship.doors) {
      const near = Math.hypot(g.me.x - d.center[0], g.me.z - d.center[1]) < 1.8 && !d.locked && g.mode !== 'cutscene';
      d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt * 6);
      const off = d.open * (d.width - 0.05);
      if (d.axis === 'x') d.panel.position.x = d.closed + off; else d.panel.position.z = d.closed + off;
      d.coll.off = d.open > 0.7;
    }
    camera.updateMatrixWorld();
    // markers
    const dirToHole = new THREE.Vector3(...fromHole(norm(shipPosition(g.shipR).map((v) => -v))));
    for (const m of markers) {
      const st = m.fn();
      m.s.visible = !!st && st.visible !== false;
      if (!m.s.visible) continue;
      const dir = st.dir ? new THREE.Vector3(...st.dir) : dirToHole;
      m.s.position.copy(camera.position).addScaledVector(dir, 300);
      const size = 300 * Math.tan(st.size ?? 0.006);
      m.s.scale.set(size, size, 1);
      m.s.material.color.setRGB(st.rgb[0], st.rgb[1], st.rgb[2]);
      m.s.material.opacity = Math.min(1, st.flux);
    }
    // screens (about 20 times a second)
    screenTimer += dt;
    if (screenTimer > 0.05) {
      screenTimer = 0;
      for (const [id, s] of Object.entries(ship.screens)) {
        const fn = g.screenDraw[id];
        if (fn) { fn(s.ctx, s.w, s.h, g); s.tex.needsUpdate = true; }
      }
    }
    // sky: only when a window is in view (or the story owns the view)
    if (sky) {
      let need = !!g.skyOverride;
      if (!need) {
        projM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(projM);
        need = ship.windows.some((w) => frustum.intersectsBox(wBox.setFromObject(w)));
      }
      if (need) {
        if (g.skyOverride) sky.set(g.skyOverride(g));
        else {
          const q = camera.quaternion;
          const r = toHole(tmpV.set(1, 0, 0).applyQuaternion(q).toArray()), u = toHole(tmpV.set(0, 1, 0).applyQuaternion(q).toArray()), f = toHole(tmpV.set(0, 0, -1).applyQuaternion(q).toArray());
          const pos = shipPosition(g.shipR);
          sky.set({ cam: pos, basis: [r, u, f], V: hoverVelocity(pos), fov: THREE.MathUtils.degToRad(camera.fov), time: g.time, disk: true });
        }
        const t0 = performance.now(); sky.render(); sky.gl.finish?.();
        skyAvg = skyAvg * 0.9 + (performance.now() - t0) * 0.1;
        if (++skyFrames % 20 === 0) { const s = sky.state.scale; if (skyAvg > 22 && s > 0.25) sky.set({ scale: s * 0.85 }); else if (skyAvg < 9 && s < 0.9) sky.set({ scale: s * 1.1 }); }
      }
    }
    threeCanvas.style.visibility = g.skyOverride && g.hideShip ? 'hidden' : 'visible';
    if (frameN <= 3) mark('pre-render');
    if (!(g.skyOverride && g.hideShip)) renderer.render(scene, camera);
    if (frameN <= 3) mark('rendered');
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  document.body.dataset.ready = '1';

  // ---- story ----
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('frozen-star.fp.v1')); } catch { /* */ }
  const urlCp = new URLSearchParams(location.search).get('cp');
  const start = urlCp || checkpoint || saved?.cp || 'start';
  if (/[?&]debug\b/.test(location.search)) window.__fs = g;
  if (saved?.flags) Object.assign(g.flags, saved.flags);
  runStory(g, start).catch((e) => { if (!g.aborted) console.error(e); });

  return () => {
    alive = false; g.aborted = true; cancelAnimationFrame(raf); ro.disconnect();
    for (const w of waiters) w.rej(new Error('aborted'));
    appDispose?.(); controls.dispose(); hud.dispose(); renderer.dispose(); sky?.dispose();
    document.body.classList.remove('fp-active');
  };
}

function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l); }
