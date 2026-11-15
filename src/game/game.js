// The first-person game: two stacked canvases. Underneath, the general-relativistic ray tracer draws
// the sky around Erebus as seen from the ship; on top, three.js draws the ship with transparent
// windows. Both share one camera, so looking through a window shows the real, lensed sky.
import * as THREE from 'three';
import { h } from '../ui/dom.js';
import { BlackHoleView, AdaptiveScale, hoverVelocity, LOW_GPU } from '../render/raytracer.js';
import { buildShip } from './ship.js';
import { createControls } from './controls.js';
import { createHud } from './hud.js';
import { step, EYE } from './walk.js';
import { shipPosition, toHole, fromHole, SEC_PER_M, R_STATION, DISK_OUTER } from './world.js';
import { hoverRate } from '../physics/body.js';
import { runStory } from './story.js';
import { createAudio } from './audio.js';
import { loadSettings, applyDisplay, keyHtml, keyText } from './settings.js';
import { settingsForm, controlsForm } from './settings-ui.js';
import { padNav } from '../ui/padnav.js';
import { createPhoto } from './photo.js';
import { watchGame, noteUse, onUnlock, discoveriesView } from './discoveries.js';

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 2000);
  camera.rotation.order = 'YXZ';
  mark('renderer'); const ship = buildShip(); mark('ship built');
  scene.add(ship.group);
  let sky = null;
  try { sky = new BlackHoleView(skyCanvas, { scale: LOW_GPU ? 0.2 : 0.45, parallel: true }); sky.set({ diskOuter: DISK_OUTER, steps: 520, exposure: 1.6 }); }
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
  const audio = createAudio(); g.audio = audio;
  const controls = createControls(el, { onBack: () => { if (g.skipCutscene && !g.paused) g.skipCutscene(); else if (g.photo) g.photo.exit(); else if (g.mode === 'console') closeApp(); else if (g.paused) resume(); else if (g.mode === 'walk') setPaused(true); }, onSkip: () => { if (g.skipCutscene && !g.paused) g.skipCutscene(); else if (!g.paused && !g.photo) hud.skip(); } });
  // ---- settings ----
  let settings = loadSettings();
  function applySettings() {
    controls.setSettings(settings); audio.setVolume(settings.volume);
    applyDisplay(el, settings); g.settings = settings;
    resize?.();
  }
  g.controls = controls;

  // ---- story helpers ----
  const waiters = [];
  g.wait = (sec) => new Promise((res, rej) => waiters.push({ t: g.time + sec, res, rej }));
  g.until = (fn) => new Promise((res, rej) => waiters.push({ fn, res, rej }));
  g.say = (who, text, opts) => (g.aborted ? Promise.reject(new Error('aborted')) : hud.say(who, text, opts));
  let objState = null;
  // an objective's idle hint: it fires only while that objective stands (and opts.when() holds), and a new
  // objective takes the old hint off the screen
  g.objective = (t, opts = {}) => { hud.unsay('objhint'); hud.objective(t); objState = t && opts.hint ? { hint: opts.hint, after: opts.after ?? 40, since: g.time, hinted: false, when: opts.when } : null; };
  g.on = (id, fn) => { g.handlers[id] = fn; };
  g.enable = (id, on = true) => { const it = ship.interactables.find((i) => i.id === id); if (it) it.disabled = !on; };
  g.unlockDoor = (id, on = true) => { const d = ship.doors.find((x) => x.id === id); if (d) d.locked = !on; };
  g.inRoom = (id) => { const r = ship.rooms.find((x) => x.id === id); if (!r) return false; const [x0, z0, x1, z1] = r.box; return g.me.x > x0 && g.me.x < x1 && g.me.z > z0 && g.me.z < z1; };
  g.addMarker = (fn) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); scene.add(s); const m = { fn, s }; markers.add(m); return () => { scene.remove(s); markers.delete(m); }; };
  g.save = (cp) => { try { localStorage.setItem('frozen-star.fp.v1', JSON.stringify({ cp, flags: g.flags })); hud.toast('Progress saved'); } catch { /* storage off */ } };
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
    // a close-up screen must fit beside the panel: step back from it a little
    const fd = it.focus.pos.distanceTo(it.focus.look), fpos = fd < 2.5 ? it.focus.look.clone().lerp(it.focus.pos, fd < 1.5 ? 1.3 : 1.55) : it.focus.pos;
    const a = lookAngles(fpos, it.focus.look);
    // the panel covers the right of the screen: turn a little so the thing you use sits in the free part
    // (on narrow screens it covers the bottom 62%, so look down a little instead)
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    if (innerWidth > 760) a.yaw -= Math.atan((Math.min(560, innerWidth * 0.48) / innerWidth) * tv * camera.aspect);
    else a.pitch -= Math.atan(0.62 * tv);
    const tween = g.tweenTo(fpos, unwrap(a.yaw, g.pose.yaw), a.pitch, 0.7);
    // the panel opens while the camera is still settling: a quarter second of real time, so it opens promptly
    // however slow the frames are (game time crawls when frames are slow)
    await Promise.race([tween, new Promise((r) => setTimeout(r, 250))]);
    panel.replaceChildren(); panel.hidden = false; audio.open();
    const close = h('button.fp-close', { type: 'button', onclick: () => closeApp() }, '← Step back');
    const body = h('div.fp-app');
    panel.append(h('div.fp-panel-head', close, h('span.fine', controls.isTouch() ? '' : `${keyText('pause')} to step back`)), body);
    appDispose = factory(body, g) || null;
    return new Promise((r) => { appResolve = r; });
  }
  async function closeApp() {
    if (g.mode !== 'console') return;
    appDispose?.(); appDispose = null; panel.hidden = true; panel.replaceChildren(); audio.close();
    // stepping back with a click: take the mouse back for looking at once (a key press cannot; the hint says to click)
    if (!controls.isTouch() && !g.paused && navigator.userActivation?.isActive) el.requestPointerLock?.()?.catch?.(() => {});
    g.mode = 'tweening';
    await g.tweenTo(new THREE.Vector3(walkPose.x, g.eye, walkPose.z), walkPose.yaw, walkPose.pitch, 0.5);
    g.me = { ...walkPose, vx: 0, vz: 0 }; g.mode = 'walk'; controls.setEnabled(true); hud.crosshair(true);
    appResolve?.(); appResolve = null;
  }
  g.openApp = openApp; g.closeApp = closeApp;
  const unwrap = (a, ref) => { while (a - ref > Math.PI) a -= 2 * Math.PI; while (a - ref < -Math.PI) a += 2 * Math.PI; return a; };

  // ---- interaction ----
  let focusIt = null;
  // Does a wall (or a closed door) stand between two floor points? The last 0.25 m is ignored, so
  // things mounted on a wall still count from in front of it.
  function wallBetween(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
    if (len < 0.3) return false;
    const tMax = (len - 0.25) / len;
    for (const w of ship.walls) {
      if (w.off) continue;
      const [ax, az, bx, bz] = w.box || w;
      let t0 = 0, t1 = tMax;
      for (const [p, d, lo, hi] of [[x0, dx, ax, bx], [z0, dz, az, bz]]) {
        if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) { t0 = 1; break; } continue; }
        let ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      }
      if (t0 <= t1) return true;
    }
    return false;
  }
  function findInteractable() {
    const eye = new THREE.Vector3(g.me.x, g.eye, g.me.z);
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(g.me.pitch, g.me.yaw, 0, 'YXZ'));
    let best = null, bestScore = -1;
    for (const it of ship.interactables) {
      if (it.disabled || !g.handlers[it.id]) continue;
      const to = it.pos.clone().sub(eye), d = to.length();
      if (Math.hypot(to.x, to.z) > it.radius) continue; // reach is measured across the floor, so low things on a desk count
      if (wallBetween(eye.x, eye.z, it.pos.x, it.pos.z)) continue; // never through a wall or a closed door
      // the look must land near the thing sideways: a cone that narrows with distance (about 32° at 1 m,
      // 22° at 2 m). Up and down stays lenient, so a desk item counts without staring at the floor.
      const hd = Math.hypot(to.x, to.z), hl = Math.hypot(dir.x, dir.z) || 1;
      if (hd > 0.05 && (to.x * dir.x + to.z * dir.z) / (hd * hl) < Math.cos(Math.min(0.6, 0.14 + Math.atan(0.45 / Math.max(0.3, d))))) continue;
      const cos = to.normalize().dot(dir);
      if (cos < 0.75) continue; // and the look must be roughly on it up and down too
      const score = cos + 0.06 * (1 - d / it.radius);
      if (score > bestScore) { bestScore = score; best = it; }
    }
    return best;
  }
  function interact() {
    if (g.mode !== 'walk' || !focusIt) return;
    const fn = g.handlers[focusIt.id];
    audio.click();
    noteUse(focusIt.id, g);
    fn?.(focusIt);
  }

  // ---- pause menu ----
  g.paused = false;
  const isDesktop = /Electron/.test(navigator.userAgent);
  function setPaused(p) {
    g.paused = p; menu.hidden = !p; audio.duck(p); el.classList.toggle('fp-paused', p);
    if (p) { controls.unlock(); renderMenu('main'); }
  }
  function togglePause() { setPaused(!g.paused); }
  function resume() {
    setPaused(false);
    if (!controls.isTouch() && g.mode === 'walk') el.requestPointerLock?.()?.catch?.(() => {});
  }
  g.pause = setPaused;
  const stopPad = padNav({
    container: () => (g.paused ? menu : hud.choosing ? el.querySelector('.fp-choice') : el.querySelector('.fp-logbook') || (g.mode === 'console' ? panel : null)),
    onBack: () => { if (g.skipCutscene && !g.paused) g.skipCutscene(); else if (g.paused) resume(); else if (g.mode === 'console') closeApp(); },
    onStart: () => { if (g.photo) g.photo.exit(); else if (g.paused) resume(); else if (g.mode === 'walk' || g.mode === 'console') setPaused(true); },
  });
  menuBtn.addEventListener('click', () => (g.paused ? resume() : setPaused(true)));
  let wasLocked = false;
  const onLockChange = () => {
    const locked = document.pointerLockElement === el;
    if (wasLocked && !locked && g.mode === 'walk' && !g.paused && !hud.choosing && !menuSuppress && !g.photo) setPaused(true);
    wasLocked = locked;
  };
  let menuSuppress = false;
  document.addEventListener('pointerlockchange', onLockChange);

  function renderMenu(view) {
    g.menuView = view;
    const btn = (label, fn, id) => h('button', { type: 'button', id, onclick: fn }, label);
    if (view === 'main') {
      menu.replaceChildren(...[
        h('p.eyebrow', 'Paused'),
        h('h3', 'Frozen Star'),
        btn('Resume', resume, 'fp-resume'),
        g.mode === 'walk' && !hud.choosing ? btn('Photo mode', () => { setPaused(false); photo.enter(); }, 'fp-photo-btn') : null,
        btn('Discoveries', () => renderMenu('discoveries'), 'fp-disc-btn'),
        btn('Settings', () => renderMenu('settings'), 'fp-settings'),
        btn('Controls', () => renderMenu('controls')),
        btn('Main menu', (e) => {
          // two clicks: anything since the last chapter checkpoint is lost
          if (e.currentTarget.dataset.armed) { location.hash = '#title'; return; }
          e.currentTarget.dataset.armed = '1'; e.currentTarget.textContent = 'Main menu: click again (you go back to the last chapter)';
        }),
        isDesktop ? btn('Quit', () => window.close()) : null,
        h('p.fine', 'Progress saves automatically at each chapter.')].filter(Boolean));
      menu.querySelector('#fp-resume').focus();
    } else if (view === 'controls') {
      menu.replaceChildren(controlsForm(settings, () => applySettings(), { onBack: () => renderMenu('main') }));
    } else if (view === 'discoveries') {
      menu.replaceChildren(h('p.eyebrow', 'Discoveries'), discoveriesView(), btn('Back', () => renderMenu('main'), 'fp-disc-back'));
      menu.querySelector('#fp-disc-back').focus({ preventScroll: true }); menu.scrollTop = 0;
    } else if (view === 'settings') {
      menu.replaceChildren(settingsForm(settings, () => applySettings(), { onBack: () => renderMenu('main') }));
    }
  }

  // ---- main loop ----
  const tmpV = new THREE.Vector3(), frustum = new THREE.Frustum(), projM = new THREE.Matrix4(), wBox = new THREE.Box3();
  let skyRect = null;
  // sky render scale: [lowest, highest, GPU budget per frame in ms] for each graphics setting
  const QUALITY = { low: [0.2, 0.3, 5], auto: [0.2, 0.85, 12], high: [0.5, 1, 22] };
  const skyStart = LOW_GPU ? 0.2 : 0.45;
  const skyScale = { win: new AdaptiveScale({ scale: skyStart }), full: new AdaptiveScale({ scale: skyStart }) };
  let skyMode = null;
  let stillFrames = 0;
  let last = performance.now(), raf = 0, alive = true, screenTimer = 0, stepDist = 0, frameAvg = 16, dprTimer = 0;
  let dpr = Math.min(LOW_GPU ? 0.75 : 1.5, devicePixelRatio || 1);
  const raycaster = new THREE.Raycaster();
  const way = h('div.fp-way', { hidden: true }, h('i'), h('span'));
  el.append(way);
  g.waypoint = null;
  const brackets = new Map();
  const focusBox = h('div.fp-focus', { hidden: true }, h('i'));
  el.append(focusBox);
  // toggle-run: a small chip while running is switched on
  const runChip = h('div.fp-run', { hidden: true, 'aria-hidden': 'true' }, 'RUN');
  el.append(runChip);
  // the controls hint stays until the player has both walked and looked around, then fades
  let ctlHint = null;
  g.controlsHint = (html) => { hud.hint(html); ctlHint = html ? { html: el.querySelector('.fp-hint').innerHTML, moved: 0, looked: 0, fading: false } : null; };
  function resize() {
    stillFrames = 0; // a resized canvas is cleared: draw it again
    const w = el.clientWidth, hh = el.clientHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, hh, false);
    camera.aspect = w / Math.max(1, hh);
    // keep at least ~80° across on tall (portrait) screens
    const hfov = THREE.MathUtils.degToRad(80);
    camera.fov = camera.aspect < 1.15 ? Math.min(105, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / camera.aspect))) : settings.fov;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(el); applySettings();
  const photo = createPhoto(g, { el, THREE, camera, scene, renderer, sky, skyCanvas, threeCanvas, controls, audio, resize, invertY: () => settings.invertY });
  g.ticks.add(watchGame(g));
  const stopDisc = onUnlock((d) => hud.toast(`Discovery · ${d.title}`, { sub: d.fact, cls: 'disc-toast', sec: 5 }));

  let frameN = 0;
  function frame(now) {
    if (!alive) return;
    if (frameN < 3) mark('frame ' + frameN); frameN++;
    // never negative: after a long synchronous start (shader link, ship build) the first rAF timestamp can
    // predate `last` by seconds, and a negative step used to push game time below zero
    const realDt = Math.max(0, Math.min(0.1, (now - last) / 1000)) * TIME_SCALE; last = now;
    photo.pollPad();
    const dt = g.paused || photo.on ? 0 : realDt; // photo mode stops world time
    hud.tick(dt);
    g.time += dt; g.dt = dt;
    if (!g.physicsPaused) g.physicsTime += dt;
    // clocks: the ship's own and a relay far away (runs faster by 1/√(1 − 2M/r))
    g.clocks.ship += dt; g.clocks.relay += dt / hoverRate(g.shipR);
    for (let i = waiters.length - 1; i >= 0; i--) {
      const w = waiters[i];
      if ((w.t != null && g.time >= w.t) || (w.fn && w.fn())) { waiters.splice(i, 1); w.res(); }
    }
    for (const t of g.ticks) t(dt);
    if (objState && !objState.hinted && g.mode === 'walk' && !g.paused && g.time - objState.since > objState.after && (!objState.when || objState.when())) { objState.hinted = true; hud.say('WREN', objState.hint, { key: 'objhint' }); }
    else if (objState?.hinted && objState.when && !objState.when()) hud.unsay('objhint');
    const inp = controls.read(photo.on ? realDt : dt);
    // without pointer lock the mouse does not turn the view: say so whenever that is the case, so a lost lock
    // never leaves the view looking stuck
    hud.lookHint(g.mode === 'walk' && !g.paused && !photo.on && !controls.isTouch() && !controls.locked && !hud.choosing && g.time > 1 && !el.querySelector('.fp-logbook'));
    if (g.mode !== 'walk' || g.paused) focusBox.hidden = true;
    runChip.hidden = !(settings.runMode === 'toggle' && controls.running && g.mode === 'walk' && !g.paused && !photo.on);
    if (photo.on) photo.update(realDt, inp);
    else if (g.mode === 'walk' && g.paused) {
      camera.position.set(g.me.x, g.eye, g.me.z); camera.rotation.set(g.me.pitch, g.me.yaw, 0);
      hud.prompt(null); controls.showUse(null);
    } else if (g.mode === 'walk') {
      g.me.yaw -= inp.lookDX; g.me.pitch = Math.max(-1.45, Math.min(1.45, g.me.pitch - inp.lookDY * (settings.invertY ? -1 : 1)));
      const px = g.me.x, pz = g.me.z;
      g.me = step(g.me, inp, dt, ship.colliders);
      stepDist += Math.hypot(g.me.x - px, g.me.z - pz);
      if (ctlHint && !ctlHint.fading) {
        ctlHint.moved += Math.hypot(g.me.x - px, g.me.z - pz); ctlHint.looked += Math.abs(inp.lookDX) + Math.abs(inp.lookDY);
        const hintEl = el.querySelector('.fp-hint');
        if (hintEl.hidden || hintEl.innerHTML !== ctlHint.html) ctlHint = null; // something else took the hint line
        else if (ctlHint.moved > 2 && ctlHint.looked > 0.6) {
          ctlHint.fading = true; hintEl.classList.add('out');
          setTimeout(() => { if (hintEl.innerHTML === ctlHint?.html) hud.hint(null); hintEl.classList.remove('out'); ctlHint = null; }, 900);
        }
      }
      if (stepDist > (inp.run ? 0.95 : 0.75)) { stepDist = 0; audio.step(inp.run ? 1.2 : 0.8); }
      camera.position.set(g.me.x, g.eye, g.me.z); camera.rotation.set(g.me.pitch, g.me.yaw, 0);
      focusIt = findInteractable();
      const label = focusIt?.label;
      if (focusIt) {
        camera.updateMatrixWorld(); // the matrices may still hold last frame's pose (e.g. the console view)
        const v = focusIt.pos.clone().project(camera);
        focusBox.hidden = v.z > 1;
        focusBox.style.transform = `translate(${((v.x + 1) / 2) * el.clientWidth}px, ${((1 - v.y) / 2) * el.clientHeight}px)`;
      } else focusBox.hidden = true;
      hud.prompt(label && !controls.isTouch() ? `${keyHtml('use')} ${label}` : null);
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
    for (const b of ship.blinkers) b.mat.emissiveIntensity = settings.reduceFlash ? 0.7 + 0.25 * Math.sin(g.time * b.rate * 1.5 + b.phase) : 0.25 + 1.6 * (0.5 + 0.5 * Math.sin(g.time * b.rate * 6.283 + b.phase)) ** 3;
    // doors
    for (const d of ship.doors) {
      const near = Math.hypot(g.me.x - d.center[0], g.me.z - d.center[1]) < 1.8 && !d.locked && g.mode !== 'cutscene';
      if (near && !d.wasNear) audio.door();
      d.wasNear = near;
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
      // tracking bracket on the glass, if the light is seen through a window
      let br = brackets.get(m);
      if (st.label) {
        if (!br) { br = h('div.fp-track', h('i'), h('span')); el.append(br); brackets.set(m, br); }
        const v = m.s.position.clone().project(camera);
        let show = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        if (show) {
          raycaster.set(camera.position, m.s.position.clone().sub(camera.position).normalize());
          const hit = raycaster.intersectObjects(ship.group.children, true).find((x) => x.object.visible);
          show = !hit || ship.windows.includes(hit.object);
        }
        br.hidden = !show;
        if (show) { br.style.transform = `translate(${((v.x + 1) / 2) * el.clientWidth}px, ${((1 - v.y) / 2) * el.clientHeight}px)`; br.querySelector('span').innerHTML = st.label; }
      } else if (br) br.hidden = true;
    }
    for (const [m, br] of brackets) if (!markers.has(m) || !m.s.visible) br.hidden = true;
    // waypoint toward the objective
    if (g.waypoint && g.mode === 'walk') {
      const wp = g.waypoint.pos || g.waypoint;
      const d3 = Math.hypot(wp.x - g.me.x, wp.z - g.me.z);
      if (d3 < (g.waypoint.near ?? 1.6)) way.hidden = true;
      else {
        const v = wp.clone().project(camera), W = el.clientWidth, H = el.clientHeight;
        const behind = v.z > 1;
        let x = v.x, y = v.y;
        if (behind) { x = -x; y = -y; }
        const onScreen = !behind && Math.abs(x) < 0.85 && Math.abs(y) < 0.8;
        if (!onScreen) { const k = 0.85 / Math.max(Math.abs(x) / 0.92, Math.abs(y) / 0.82, 1e-6); x *= k; y *= k; if (behind && Math.hypot(x, y) < 0.5) { x = 0; y = -0.8; } }
        way.hidden = false; way.classList.toggle('edge', !onScreen);
        way.style.transform = `translate(${((x + 1) / 2) * W}px, ${((1 - y) / 2) * H}px)`;
        way.querySelector('i').style.transform = onScreen ? '' : `rotate(${Math.atan2(-y, x)}rad)`;
        way.querySelector('span').textContent = `${g.waypoint.label || ''} ${d3.toFixed(0)} m`;
      }
    } else way.hidden = true;
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
    // behind the pause menu or the logbook the view holds still: after a couple of frames stop drawing it, so
    // the page stays responsive (wheel scrolling, clicks) even where each frame is slow
    const still = (g.paused || !!el.querySelector('.fp-logbook')) && !photo.on;
    stillFrames = still ? stillFrames + 1 : 0;
    const idle = stillFrames > 2;
    if (sky && !g.skyHold && !idle) {
      let need = !!g.skyOverride;
      if (!need) {
        projM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(projM);
        // trace only the screen rectangle that visible windows cover
        const rects = [];
        for (const w of ship.windows) {
          wBox.setFromObject(w);
          if (!frustum.intersectsBox(wBox)) continue;
          need = true;
          let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
          for (let k = 0; k < 8; k++) {
            const c = tmpV.set(k & 1 ? wBox.max.x : wBox.min.x, k & 2 ? wBox.max.y : wBox.min.y, k & 4 ? wBox.max.z : wBox.min.z).project(camera);
            if (c.z > 1 || c.z < -1) { x0 = 0; y0 = 0; x1 = 1; y1 = 1; break; } // a corner behind the camera: whole screen
            x0 = Math.min(x0, (c.x + 1) / 2); x1 = Math.max(x1, (c.x + 1) / 2); y0 = Math.min(y0, (c.y + 1) / 2); y1 = Math.max(y1, (c.y + 1) / 2);
          }
          rects.push([x0 - 0.01, y0 - 0.01, x1 + 0.01, y1 + 0.01]);
        }
        skyRect = need ? rects : null;
      }
      if (need) {
        // the full-screen views (dream, epilogue) start at the lowest scale and grow: the first frame of the
        // dream must come fast, even on a weak or busy machine
        const mode = g.skyOverride ? 'full' : 'win';
        const ctl = skyScale[mode], [lo, hi, budgetMs] = QUALITY[settings.quality] || QUALITY.auto;
        Object.assign(ctl, { lo, hi, budgetMs });
        if (mode !== skyMode) { skyMode = mode; ctl.reset(); if (mode === 'full') ctl.scale = lo; sky.set({ scale: ctl.scale }); }
        if (g.skyOverride) sky.set(g.skyOverride(g));
        else {
          const q = camera.quaternion;
          const r = toHole(tmpV.set(1, 0, 0).applyQuaternion(q).toArray()), u = toHole(tmpV.set(0, 1, 0).applyQuaternion(q).toArray()), f = toHole(tmpV.set(0, 0, -1).applyQuaternion(q).toArray());
          const pos = shipPosition(g.shipR);
          sky.set({ cam: pos, basis: [r, u, f], V: hoverVelocity(pos), fov: THREE.MathUtils.degToRad(camera.fov), time: g.time, disk: true });
        }
        if (sky.render(g.skyOverride ? null : skyRect)) g.skyFrames = (g.skyFrames || 0) + 1;
        // adapt the sky's resolution. The window rectangles and the full-screen views (dream, epilogue)
        // trace very different numbers of pixels, so each keeps its own scale.
        const fresh = sky.gpuMs != null && performance.now() - sky.gpuAt < 1000;
        sky.set({ scale: ctl.update((realDt / TIME_SCALE) * 1000, fresh ? sky.gpuMs : null) });
      }
    }
    threeCanvas.style.visibility = g.skyOverride && g.hideShip ? 'hidden' : 'visible';
    if (frameN <= 3) mark('pre-render');
    if (!(g.skyOverride && g.hideShip) && !idle) renderer.render(scene, camera);
    if (frameN <= 3) mark('rendered');
    audio.scene(g);
    // adaptive resolution for the ship view: aim for 30+ fps
    const frameMs = (realDt / TIME_SCALE) * 1000;
    if (!(frameMs > 60 && frameMs > 3 * frameAvg)) frameAvg = frameAvg * 0.95 + frameMs * 0.05; // skip one-off hitches
    dprTimer += realDt / TIME_SCALE;
    if (dprTimer > 2) {
      dprTimer = 0;
      const max = Math.min(LOW_GPU ? 0.75 : 1.5, devicePixelRatio || 1);
      const next = frameAvg > 38 ? Math.max(0.6, dpr * 0.8) : frameAvg < 20 ? Math.min(max, dpr * 1.15) : dpr;
      if (Math.abs(next - dpr) > 0.02) { dpr = next; resize(); }
    }
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
  if (/[?&]probe\b/.test(location.search)) window.__fsGame = g;
  if (saved?.flags) Object.assign(g.flags, saved.flags);
  ship.bay.attach(g); // the capsule bay follows the story: Ines in pre-flight, out in the capsule, docked
  runStory(g, start).catch((e) => { if (!g.aborted) console.error(e); });

  return () => {
    alive = false; g.aborted = true; cancelAnimationFrame(raf); ro.disconnect(); stopPad(); document.removeEventListener('pointerlockchange', onLockChange);
    for (const w of waiters) w.rej(new Error('aborted'));
    photo.dispose(); stopDisc(); appDispose?.(); controls.dispose(); hud.dispose(); renderer.dispose(); sky?.dispose(); audio.dispose();
    document.body.classList.remove('fp-active');
  };
}

function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l); }
