// Playtester probe (Preponderous-Software/playtester, docs/PROBE_CONTRACT.md). Only with ?probe:
// about twice a second the page posts what the player sees to tools/serve.py (--probe-dir), which
// writes state.json and events.jsonl. It reads the game and never changes it; failures are ignored.
import { VERSION } from '../version.js';
const post = (path, body) => { fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {}); };

export function startProbe() {
  const t0 = performance.now();
  let lastScreen = null, lastObjective = null, objNumber = 0;
  const tick = () => { const g = window.__fsGame; return Math.max(0, Math.round((g ? g.time : (performance.now() - t0) / 1000) * 60)); };
  const event = (type, fields = {}) => post('/__probe/event', { type, tick: tick(), wallTimeMs: Date.now(), ...fields });

  function screenNow() {
    const g = window.__fsGame, hash = location.hash.slice(1);
    if (hash !== 'ship' || !g) return (hash === 'title' || hash === '') && document.querySelector('.disc-view') ? 'DISCOVERIES' : hash === 'title' || hash === '' ? 'TITLE' : hash === 'training' ? 'TRAINING' : hash === 'observatory' ? 'OBSERVATORY' : 'LESSON';
    if (g.paused) return g.menuView === 'discoveries' ? 'DISCOVERIES' : 'PAUSE';
    if (g.hud.choosing) return 'CHOICE';
    if (g.photo?.on) return 'PHOTO';
    if (g.skyOverride && g.hideShip) return 'DREAM';
    if (document.querySelector('.fp-logbook')) return 'LOGBOOK';
    return { walk: 'WORLD', console: 'CONSOLE', cutscene: 'CUTSCENE', tweening: 'CUTSCENE' }[g.mode] || 'WORLD';
  }

  function nearest(g) {
    const out = {}, cos = Math.cos, sin = Math.sin, me = g.me;
    const fx = -sin(me.yaw), fz = -cos(me.yaw);
    for (const it of g.ship.interactables) {
      if (it.disabled || !g.handlers[it.id]) continue;
      const dx = it.pos.x - me.x, dz = it.pos.z - me.z, d = Math.hypot(dx, dz);
      // bearing: + to the right of where the player faces
      const ang = Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz) * 180 / Math.PI;
      const kind = it.console ? 'console' : 'item';
      (out[kind] ||= []).push({ name: it.id, label: it.label, distance: +d.toFixed(2), bearing: +ang.toFixed(1) });
    }
    for (const d of g.ship.doors) {
      const dx = d.center[0] - me.x, dz = d.center[1] - me.z, dist = Math.hypot(dx, dz);
      const ang = Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz) * 180 / Math.PI;
      (out.door ||= []).push({ name: d.id, distance: +dist.toFixed(2), bearing: +ang.toFixed(1), locked: d.locked });
    }
    for (const k of Object.keys(out)) out[k].sort((a, b) => a.distance - b.distance);
    return out;
  }

  function hook(g) {
    if (g.__probeHooked) return; g.__probeHooked = true;
    event('world', { how: 'created', seed: 0 });
    const say = g.hud.say.bind(g.hud);
    g.hud.say = (who, text, opts) => { event('dialogue', { who, text }); return say(who, text, opts); };
    const save = g.save; g.save = (cp) => { event('checkpoint', { checkpoint: cp }); return save(cp); };
    const card = g.hud.card.bind(g.hud); g.hud.card = (title, sub, sec) => { event('card', { title, subtitle: sub || null }); return card(title, sub, sec); };
  }

  setInterval(() => {
    try {
      const g = window.__fsGame && location.hash === '#ship' ? window.__fsGame : null;
      if (g) hook(g);
      const screen = screenNow();
      if (screen !== lastScreen) { event('screen', { from: lastScreen, to: screen }); lastScreen = screen; }
      const objText = g ? document.querySelector('.fp-objective:not([hidden]) b')?.textContent || null : null;
      if (objText !== lastObjective) {
        if (lastObjective && g) event('objective_completed', { number: objNumber, title: lastObjective });
        if (objText) { objNumber++; event('objective_started', { number: objNumber, title: objText }); }
        lastObjective = objText;
      }
      const st = { wallTimeMs: Date.now(), version: VERSION, screen, world: !!g };
      if (g) Object.assign(st, {
        tick: tick(), seed: 0,
        player: { x: +g.me.x.toFixed(3), z: +g.me.z.toFixed(3), y: 0, yawDeg: +(g.me.yaw * 180 / Math.PI).toFixed(1), speed: 2.2 },
        objective: objText ? { number: objNumber, title: objText, completed: false } : null,
        room: ['bridge', 'corridor', 'quarters', 'lab'].find((r) => g.inRoom(r)) || null,
        mode: g.mode, paused: g.paused, prompt: document.querySelector('.fp-prompt:not([hidden])')?.textContent || null,
        subtitles: [...document.querySelectorAll('.fp-line:not(.old)')].map((l) => l.textContent),
        panel: g.mode === 'console' ? document.querySelector('.fp-app')?.innerText.slice(0, 600) || null : null,
        shipAltitudeRs: +(g.shipR / 2).toFixed(3),
        fps: Math.round(1 / Math.max(1e-3, g.dt || 0.016)),
        nearest: nearest(g),
      });
      post('/__probe/state', st);
    } catch { /* never take the game down */ }
  }, 500);
}
