// Input: keyboard + mouse (pointer lock), touch (left stick, drag to look, buttons) and gamepad.
// Every frame, read() returns what the player asked for. Only the player's own input turns the view.
// Which key or button does what comes from settings.js (the player can change them).
import { stick, deadzone } from './walk.js';
import { keysFor, padFor } from './settings.js';
import { createHolds } from './holds.js';

const LOOK_MOUSE = 0.0022, LOOK_TOUCH = 0.0055, LOOK_PAD = 2.4;
let SENS = 1;
const ANSWERS = ['answer1', 'answer2', 'answer3'];

export function createControls(el, { onInteract, onBack, onSkip } = {}) {
  // held keys, timed in real time: a tap between two slow frames still counts, and a hold lasts as long as it was held
  const keys = createHolds();
  let lookDX = 0, lookDY = 0, interactEdge = false, backEdge = false;
  let touchStick = null, touchLook = null, stickVec = { forward: 0, right: 0, run: false };
  let enabled = true, padPrev = {};
  // toggle-run: the run key flips running on and off (it stops by itself when the player stops)
  let runMode = 'hold', runOn = false, runKeyEdge = false, wasMoving = false;
  // mouse smoothing: the view eases toward the mouse over a few frames
  let smoothing = false, smX = 0, smY = 0, rawDX = 0, rawDY = 0;
  // code -> actions, rebuilt when the bindings change
  let byCode = new Map();
  const rebuild = () => {
    byCode = new Map();
    for (const a of ['forward', 'backward', 'left', 'right', 'turnLeft', 'turnRight', 'run', 'use', 'pause', 'skip', ...ANSWERS]) {
      for (const c of keysFor(a)) { if (!byCode.has(c)) byCode.set(c, new Set()); byCode.get(c).add(a); }
    }
  };
  rebuild();
  const is = (code, a) => !!byCode.get(code)?.has(a);
  const touchUI = document.createElement('div');
  touchUI.className = 'fp-touch';
  touchUI.innerHTML = '<div class="fp-stick"><i></i></div><button type="button" class="fp-use" hidden>Use</button>';
  el.append(touchUI);
  const knob = touchUI.querySelector('.fp-stick i'), stickEl = touchUI.querySelector('.fp-stick'), useBtn = touchUI.querySelector('.fp-use');
  useBtn.addEventListener('click', (e) => { e.stopPropagation(); interactEdge = true; onInteract?.(); });

  const isTouch = () => matchMedia('(hover: none)').matches || 'ontouchstart' in window;

  const kd = (e) => {
    const k = e.code;
    if (e.target.closest?.('textarea, input[type=text], input:not([type]), select') && k !== 'Escape') return;
    if (e.target.closest?.('input[type=range], input[type=checkbox]') && k !== 'Escape') return;
    // Back (step away from a console, pause, resume) and skip work even while walking is disabled.
    if (k === 'Escape' || is(k, 'pause')) { backEdge = true; onBack?.(); return; }
    // answering a question: click the matching option (the HUD also takes plain 1 2 3)
    const ans = ANSWERS.findIndex((a) => is(k, a));
    if (ans >= 0 && !e.repeat) { const b = el.querySelectorAll('.fp-choice-opts button')[ans]; if (b) { e.preventDefault(); b.click(); return; } }
    if (is(k, 'skip')) { onSkip?.(); if (!enabled) return; }
    if (!enabled) return;
    // Enter on a focused button presses that button, not "use"
    if (is(k, 'use') && !(k === 'Enter' && e.target.closest?.('button, a'))) { interactEdge = true; onInteract?.(); }
    if (is(k, 'run') && !e.repeat) runKeyEdge = true;
    if (byCode.has(k) && !e.target.closest?.('button, a')) e.preventDefault();
    keys.press(k);
  };
  const ku = (e) => keys.release(e.code);
  const mm = (e) => { if (document.pointerLockElement === el && enabled) { rawDX += e.movementX * LOOK_MOUSE * SENS; rawDY += e.movementY * LOOK_MOUSE * SENS; } };
  const click = (e) => {
    if (!enabled || isTouch() || e.target !== el.querySelector('canvas.fp-three')) return;
    if (document.pointerLockElement !== el) el.requestPointerLock?.()?.catch?.(() => {});
  };
  // Touch: a stick appears where the left thumb lands; anywhere else drags the view.
  const ts = (e) => {
    if (!enabled) return;
    for (const t of e.changedTouches) {
      if (t.target.closest('button, .fp-panel, .fp-menu, input, select')) continue;
      if (!touchStick && t.clientX < innerWidth * 0.42 && t.clientY > innerHeight * 0.35) {
        touchStick = { id: t.identifier, x: t.clientX, y: t.clientY };
        stickEl.style.left = `${t.clientX}px`; stickEl.style.top = `${t.clientY}px`; stickEl.classList.add('on');
      } else if (!touchLook) touchLook = { id: t.identifier, x: t.clientX, y: t.clientY };
    }
  };
  const tm = (e) => {
    for (const t of e.changedTouches) {
      if (touchStick && t.identifier === touchStick.id) {
        const dx = t.clientX - touchStick.x, dy = t.clientY - touchStick.y, m = Math.hypot(dx, dy), R = 56, k = m > R ? R / m : 1;
        knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
        stickVec = stick(dx, dy, R);
        e.preventDefault();
      } else if (touchLook && t.identifier === touchLook.id) {
        rawDX += (t.clientX - touchLook.x) * LOOK_TOUCH * SENS; rawDY += (t.clientY - touchLook.y) * LOOK_TOUCH * SENS;
        touchLook.x = t.clientX; touchLook.y = t.clientY; e.preventDefault();
      }
    }
  };
  const te = (e) => {
    for (const t of e.changedTouches) {
      if (touchStick && t.identifier === touchStick.id) { touchStick = null; stickVec = { forward: 0, right: 0, run: false }; knob.style.transform = ''; stickEl.classList.remove('on'); }
      if (touchLook && t.identifier === touchLook.id) touchLook = null;
    }
  };
  const onBlur = () => keys.clear();
  addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('blur', onBlur);
  document.addEventListener('mousemove', mm);
  el.addEventListener('click', click);
  el.addEventListener('touchstart', ts, { passive: false }); el.addEventListener('touchmove', tm, { passive: false });
  el.addEventListener('touchend', te); el.addEventListener('touchcancel', te);

  function read(dt) {
    // each action: the share of the time since the last frame that one of its keys was down (0..1), and
    // that time in seconds. Walking scales by the share; keyboard turning turns for exactly as long as the key
    // was held (capped at half a second a frame, so a long hitch never spins the view).
    const hs = keys.sample();
    const k = (a) => { let f = 0; for (const c of keysFor(a)) f = Math.max(f, hs.frac(c)); return f; };
    const kHeld = (a) => { let s = 0; for (const c of keysFor(a)) s = Math.max(s, hs.held(c)); return Math.min(0.5, s); };
    let forward = k('forward') - k('backward');
    let right = k('right') - k('left');
    const turnSec = dt > 0 ? kHeld('turnRight') - kHeld('turnLeft') : 0;
    let run = k('run') > 0;
    if (runMode === 'toggle') { if (runKeyEdge) runOn = !runOn; run = runOn; }
    runKeyEdge = false;
    if (touchStick) { forward = stickVec.forward; right = stickVec.right; run = stickVec.run; }
    // gamepad
    const gp = navigator.getGamepads?.()[0];
    if (gp && gp.mapping === 'standard') {
      const [lx, ly] = deadzone(gp.axes[0] || 0, gp.axes[1] || 0), [rx, ry] = deadzone(gp.axes[2] || 0, gp.axes[3] || 0);
      const a = gp.buttons[padFor('use')]?.pressed, r = gp.buttons[padFor('run')]?.pressed;
      if (runMode === 'toggle' && r && !padPrev.r) runOn = !runOn;
      if (lx || ly) { forward = -ly; right = lx; run = Math.hypot(lx, ly) > 0.92 || (runMode === 'toggle' ? runOn : r); }
      lookDX += rx * Math.abs(rx) * LOOK_PAD * SENS * dt; lookDY += ry * Math.abs(ry) * LOOK_PAD * 0.7 * SENS * dt;
      if (a && !padPrev.a && enabled) { interactEdge = true; onInteract?.(); }
      // back and pause are handled by the menu/panel navigator (ui/padnav.js), not here
      padPrev = { a, r };
    }
    // stopping ends a toggled run
    const moving = !!(forward || right);
    if (runOn && !moving && wasMoving) runOn = false;
    wasMoving = moving;
    // mouse and drag look, eased when smoothing is on (about 50 ms)
    if (smoothing && dt > 0) {
      const kk = 1 - Math.exp(-dt / 0.05);
      smX += (rawDX / dt - smX) * kk; smY += (rawDY / dt - smY) * kk;
      lookDX += smX * dt; lookDY += smY * dt;
    } else { lookDX += rawDX; lookDY += rawDY; }
    rawDX = 0; rawDY = 0;
    const out = { forward: enabled ? forward : 0, right: enabled ? right : 0, run, lookDX: lookDX + turnSec * 1.8, lookDY, interact: interactEdge, back: backEdge };
    lookDX = 0; lookDY = 0; interactEdge = false; backEdge = false;
    return out;
  }

  return {
    read,
    setSensitivity(v) { SENS = v; },
    /** Look speed, run mode, smoothing and the bindings, from the player's settings. */
    setSettings(s) { SENS = s.sens; runMode = s.runMode; smoothing = !!s.smoothing; if (runMode === 'hold') runOn = false; if (!smoothing) { smX = 0; smY = 0; } rebuild(); },
    get running() { return runOn; },
    setEnabled(v) { enabled = v; if (!v) { keys.clear(); runOn = false; rawDX = rawDY = smX = smY = 0; touchStick = null; stickVec = { forward: 0, right: 0, run: false }; stickEl.classList.remove('on'); if (document.pointerLockElement === el) document.exitPointerLock?.(); } },
    showUse(label) { useBtn.hidden = !label || !isTouch(); if (label) useBtn.textContent = label; },
    unlock() { if (document.pointerLockElement === el) document.exitPointerLock?.(); },
    get locked() { return document.pointerLockElement === el; },
    isTouch,
    dispose() {
      removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('blur', onBlur); document.removeEventListener('mousemove', mm);
      el.removeEventListener('click', click); el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm);
      el.removeEventListener('touchend', te); el.removeEventListener('touchcancel', te); touchUI.remove();
      if (document.pointerLockElement === el) document.exitPointerLock?.();
    },
  };
}
