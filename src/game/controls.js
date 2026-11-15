// Input: keyboard + mouse (pointer lock), touch (left stick, drag to look, buttons) and gamepad.
// Every frame, read() returns what the player asked for. Only the player's own input turns the view.
import { stick, deadzone } from './walk.js';

const LOOK_MOUSE = 0.0022, LOOK_TOUCH = 0.0055, LOOK_PAD = 2.4;
let SENS = 1;

export function createControls(el, { onInteract, onBack, onSkip } = {}) {
  const keys = new Set();
  let lookDX = 0, lookDY = 0, interactEdge = false, backEdge = false;
  let touchStick = null, touchLook = null, stickVec = { forward: 0, right: 0, run: false };
  let enabled = true, padPrev = {};
  const touchUI = document.createElement('div');
  touchUI.className = 'fp-touch';
  touchUI.innerHTML = '<div class="fp-stick"><i></i></div><button type="button" class="fp-use" hidden>Use</button>';
  el.append(touchUI);
  const knob = touchUI.querySelector('.fp-stick i'), stickEl = touchUI.querySelector('.fp-stick'), useBtn = touchUI.querySelector('.fp-use');
  useBtn.addEventListener('click', (e) => { e.stopPropagation(); interactEdge = true; onInteract?.(); });

  const isTouch = () => matchMedia('(hover: none)').matches || 'ontouchstart' in window;

  const kd = (e) => {
    if (e.target.closest?.('input, select, textarea')) return;
    const k = e.code;
    // Back (step away from a console, pause, resume) and skip work even while walking is disabled.
    if (k === 'Escape' || k === 'KeyQ') { backEdge = true; onBack?.(); return; }
    if (k === 'Space') { onSkip?.(); if (!enabled) return; }
    if (!enabled) return;
    if (k === 'KeyE' || k === 'Enter') { interactEdge = true; onInteract?.(); }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space'].includes(k)) e.preventDefault();
    keys.add(k);
  };
  const ku = (e) => keys.delete(e.code);
  const mm = (e) => { if (document.pointerLockElement === el && enabled) { lookDX += e.movementX * LOOK_MOUSE * SENS; lookDY += e.movementY * LOOK_MOUSE * SENS; } };
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
        lookDX += (t.clientX - touchLook.x) * LOOK_TOUCH * SENS; lookDY += (t.clientY - touchLook.y) * LOOK_TOUCH * SENS;
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
  addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('blur', () => keys.clear());
  document.addEventListener('mousemove', mm);
  el.addEventListener('click', click);
  el.addEventListener('touchstart', ts, { passive: false }); el.addEventListener('touchmove', tm, { passive: false });
  el.addEventListener('touchend', te); el.addEventListener('touchcancel', te);

  function read(dt) {
    const k = (c) => keys.has(c);
    let forward = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
    let right = (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0);
    let turn = (k('ArrowRight') ? 1 : 0) - (k('ArrowLeft') ? 1 : 0);
    let run = k('ShiftLeft') || k('ShiftRight');
    if (touchStick) { forward = stickVec.forward; right = stickVec.right; run = stickVec.run; }
    // gamepad
    const gp = navigator.getGamepads?.()[0];
    if (gp && gp.mapping === 'standard') {
      const [lx, ly] = deadzone(gp.axes[0] || 0, gp.axes[1] || 0), [rx, ry] = deadzone(gp.axes[2] || 0, gp.axes[3] || 0);
      if (lx || ly) { forward = -ly; right = lx; run = Math.hypot(lx, ly) > 0.92 || gp.buttons[10]?.pressed; }
      lookDX += rx * Math.abs(rx) * LOOK_PAD * SENS * dt; lookDY += ry * Math.abs(ry) * LOOK_PAD * 0.7 * SENS * dt;
      const a = gp.buttons[0]?.pressed, b = gp.buttons[1]?.pressed;
      if (a && !padPrev.a) { interactEdge = true; onInteract?.(); }
      // B is handled by the menu/panel navigator (ui/padnav.js), not here
      padPrev = { a, b };
    }
    const out = { forward: enabled ? forward : 0, right: enabled ? right : 0, run, lookDX: lookDX + turn * 1.8 * dt, lookDY, interact: interactEdge, back: backEdge };
    lookDX = 0; lookDY = 0; interactEdge = false; backEdge = false;
    return out;
  }

  return {
    read,
    setSensitivity(v) { SENS = v; },
    setEnabled(v) { enabled = v; if (!v) { keys.clear(); touchStick = null; stickVec = { forward: 0, right: 0, run: false }; stickEl.classList.remove('on'); if (document.pointerLockElement === el) document.exitPointerLock?.(); } },
    showUse(label) { useBtn.hidden = !label || !isTouch(); if (label) useBtn.textContent = label; },
    unlock() { if (document.pointerLockElement === el) document.exitPointerLock?.(); },
    get locked() { return document.pointerLockElement === el; },
    isTouch,
    dispose() {
      removeEventListener('keydown', kd); removeEventListener('keyup', ku); document.removeEventListener('mousemove', mm);
      el.removeEventListener('click', click); el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm);
      el.removeEventListener('touchend', te); el.removeEventListener('touchcancel', te); touchUI.remove();
      if (document.pointerLockElement === el) document.exitPointerLock?.();
    },
  };
}
