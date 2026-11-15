// Frozen Star: shell, routing and chapter frame.
import { h, $ } from './ui/dom.js';
import { getStars, award, totalStars } from './progress.js';
import { BlackHoleView, lookBasis, hoverVelocity } from './render/raytracer.js';
import twoClocks from './chapters/two-clocks.js';
import lastWords from './chapters/last-words.js';
import rescue from './chapters/rescue.js';
import tides from './chapters/tides.js';
import hover from './chapters/hover.js';
import bendLight from './chapters/bend-light.js';
import intoTheDark from './chapters/into-the-dark.js';
import evaporation from './chapters/evaporation.js';
import observatory from './chapters/observatory.js';
import { mountGame } from './game/game.js';
import { settingsForm, controlsTable, ACTS } from './game/settings-ui.js';
import { loadSettings } from './game/settings.js';
import { padNav } from './ui/padnav.js';
import { RESTORE_WAIT_MS } from './ui/view3d.js';

export const CHAPTERS = [twoClocks, lastWords, rescue, tides, hover, bendLight, intoTheDark, evaporation];
const app = $('#app');
let dispose = null;
const SAVE_KEY = 'frozen-star.fp.v1';
const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function starRow(n, of = 3) { return h('span.stars', { 'aria-label': `${n} of ${of} stars` }, Array.from({ length: of }, (_, i) => h('i' + (i < n ? '.on' : '')))); }

function updateTotal() { const el = $('#total'); if (el) el.textContent = `${totalStars()} / ${CHAPTERS.length * 3}`; }

function readSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } }

// ---- which input the player is using, so hints show the right buttons ----
// body[data-input] is 'keys', 'mouse', 'touch' or 'pad' (padnav.js sets 'pad').
function trackInput() {
  const set = (v) => { if (document.body.dataset.input !== v) document.body.dataset.input = v; };
  if (window.matchMedia?.('(pointer: coarse)').matches) set('touch');
  addEventListener('keydown', (e) => { if (!e.repeat) set('keys'); }, true);
  addEventListener('pointerdown', (e) => set(e.pointerType === 'touch' || e.pointerType === 'pen' ? 'touch' : 'mouse'), true);
}

/** Where the black hole sits on screen behind the menu: right of the menu when wide, above it when tall. */
function heroFrame(w, hgt) {
  const aspect = w / Math.max(1, hgt);
  if (aspect >= 1.15) return { fov: 0.9, x: aspect > 1.9 ? 0.71 : 0.68, y: 0.5 };
  // portrait and square: widen the view so the disk fits, and lift the hole above the menu
  const fov = Math.min(1.7, 2 * Math.atan(Math.tan(0.5) / aspect));
  return { fov, x: 0.5, y: aspect < 0.6 ? 0.17 : aspect < 0.8 ? 0.24 : 0.34 };
}

/**
 * The animated black hole behind the menus. Calls onLit(true) once the first frames are on screen, onLit(false)
 * when there is no ray tracer (the painted glow stays), and onLost('waiting' | 'gone') if the GPU context is
 * taken away. If it comes back, the view rebuilds itself and onLit(true) fires again. Returns a disposer.
 */
function heroBackdrop(canvas, onLit, onLost) {
  let view = null, raf = 0, alive = true, t = 0, last = performance.now(), avg = 16, frames = 0, giveUp = 0;
  const lost = () => {
    frames = 0; onLost?.('waiting');
    clearTimeout(giveUp); giveUp = setTimeout(() => { if (view?.lost) onLost?.('gone'); }, RESTORE_WAIT_MS);
  };
  const restored = () => {
    clearTimeout(giveUp);
    // a still backdrop has stopped its loop: start it again so the restored view draws (and re-checks its speed)
    if (alive && canvas.dataset.still) { delete canvas.dataset.still; avg = 16; raf = requestAnimationFrame(tick); }
  };
  try { view = new BlackHoleView(canvas, { scale: 0.5, onLost: lost, onRestored: restored }); view.set({ steps: 500, fov: 0.9 }); } catch (e) {
    view = null; if (e?.reason === 'lost') onLost?.('gone');
  }
  if (!view) { onLit?.(false); return () => {}; }
  const reduce = reduceMotion();
  const tick = (now) => {
    if (!alive) return;
    t += reduce ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
    raf = requestAnimationFrame(tick);
    if (view.lost) return; // keep ticking: the view draws again by itself if the context is restored
    const { fov, x, y } = heroFrame(canvas.clientWidth, canvas.clientHeight);
    const a = -0.35 + t * 0.05, r = 32, pos = [Math.sin(a) * r, 2.6 + Math.sin(t * 0.07) * 0.8, -Math.cos(a) * r];
    // aim off the hole so it lands at screen point (x, y); the shader maps uv.y in [-0.5, 0.5] across fov
    const k = 2 * Math.tan(fov / 2) * r, aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const side = (x - 0.5) * aspect * k, lift = (y - 0.5) * k;
    const target = [-Math.cos(a) * side, -1.2 + lift, -Math.sin(a) * side];
    view.set({ cam: pos, basis: lookBasis(pos, target), V: hoverVelocity(pos), time: t, disk: true, fov });
    const dtMs = (now - (tick.prev || now)); tick.prev = now;
    try { view.render(); } catch { alive = false; cancelAnimationFrame(raf); onLit?.(false); return; }
    avg = avg * 0.85 + dtMs * 0.15;
    if (++frames === 2) onLit?.(true);
    if (frames % 15 === 0) { const sc = view.state.scale; if (avg > 36 && sc > 0.2) view.set({ scale: Math.max(0.2, sc * (avg > 100 ? 0.5 : 0.8)) }); else if (avg < 22 && sc < 0.75) view.set({ scale: sc * 1.07 }); }
    // A starved GPU stalls the page's main thread on every frame, and clicks on the menu then land seconds
    // late (a playtest saw "the first click did nothing"). If even the smallest render is that slow, keep
    // the last frame as a still picture and stop drawing, so the menu answers at once.
    if ((frames > 20 && avg > 90 && view.state.scale <= 0.2) || (frames > 6 && avg > 400)) { cancelAnimationFrame(raf); canvas.dataset.still = '1'; return; }
  };
  raf = requestAnimationFrame(tick);
  return () => { alive = false; clearTimeout(giveUp); cancelAnimationFrame(raf); view?.dispose(); };
}

const ROMAN = ['Prologue', 'Chapter I', 'Chapter II', 'Chapter III', 'Chapter IV', 'Epilogue'];

function titleScreen() {
  document.body.classList.add('fs-menu');
  const canvas = h('canvas.hero-rt', { 'aria-hidden': 'true' });
  const save = readSave();
  const actIndex = (cp) => ACTS.findIndex((a) => a[0] === cp);
  const finished = save?.cp === 'epilogue' || !!save?.flags?.finished;
  const isDesktop = /Electron/.test(navigator.userAgent);
  const panel = h('div.menu-panel', { hidden: true, role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'menu-panel-title' });
  let opener = null;
  const startAt = (cp, fresh) => {
    try {
      if (fresh) localStorage.removeItem(SAVE_KEY);
      else if (cp) localStorage.setItem(SAVE_KEY, JSON.stringify({ cp, flags: { finished, stats: save?.flags?.stats || {} } }));
    } catch { /* storage off: the game starts from the beginning */ }
    location.hash = '#ship';
  };
  const item = (label, sub, onclick, cls = '') => h('button.menu-item' + cls, { type: 'button', onclick }, h('b', label), sub ? h('span', sub) : null);
  const LOCK = '<svg viewBox="0 0 12 14" width="11" height="13" aria-hidden="true"><path d="M3 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="1" y="6" width="10" height="7.5" rx="1.6" fill="currentColor"/></svg>';
  const here = save ? Math.max(0, actIndex(save.cp)) : -1;
  const items = [
    save ? item('Continue', `${ROMAN[here] || 'Aboard the Tern'} · ${ACTS[here]?.[1] || ''}`.replace(/ · $/, ''), () => startAt(null), '.primary')
      : item('Wake up', 'Start the story · about 20 minutes', () => startAt(null, true), '.primary'),
    save ? item('New game', 'Start again from the dream', (e) => showPanel('new', e.currentTarget)) : null,
    item('Chapters', save ? (finished ? 'Replay any part of the story' : 'Replay the parts you have reached') : 'See the story ahead', (e) => showPanel('acts', e.currentTarget)),
    item('Training simulations', 'Eight short lessons, with stars to earn', () => { location.hash = '#training'; }),
    item('Observatory', 'A free camera around a black hole', () => { location.hash = '#observatory'; }),
    item('Settings', 'Look speed, sound, subtitles, controls', (e) => showPanel('settings', e.currentTarget)),
    item('About', 'The physics, and who made it', (e) => showPanel('about', e.currentTarget)),
    isDesktop ? item('Quit', null, () => window.close(), '.quiet') : null,
  ].filter(Boolean);

  const head = (eyebrow, title) => h('div.panel-head',
    h('div', h('p.eyebrow', eyebrow), h('h3#menu-panel-title', title)),
    h('button.panel-x', { type: 'button', 'aria-label': 'Close', onclick: () => closePanel() }, '✕'));
  const backBtn = () => h('button.fp-wide', { type: 'button', onclick: () => closePanel() }, 'Back');

  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true;
    panel.parentElement?.classList.remove('panel-open');
    for (const b of items) b.classList.remove('open');
    (opener && items.includes(opener) ? opener : items[0]).focus({ preventScroll: true });
  }
  function showPanel(which, from) {
    const wasHidden = panel.hidden;
    opener = from || document.activeElement?.closest?.('.menu-item') || opener;
    for (const b of items) b.classList.toggle('open', b === opener);
    if (which === 'settings') {
      const tabs = h('div.panel-tabs', { role: 'tablist' });
      const body = h('div.panel-body');
      const show = (name) => {
        for (const t of tabs.children) { const on = t.dataset.tab === name; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; }
        const title = panel.querySelector('#menu-panel-title'); if (title) title.textContent = name === 'controls' ? 'Controls' : 'Options';
        body.replaceChildren(name === 'controls'
          ? h('div.controls-ref', controlsTable(), h('p.fp-note', 'Keys cannot be changed yet. A gamepad works anywhere a mouse does: the d-pad moves through menus, A chooses, B goes back.'))
          : settingsForm(loadSettings(), null));
        body.querySelector('.fp-settings > .eyebrow')?.remove();
      };
      for (const [k, l] of [['game', 'Options'], ['controls', 'Controls']]) {
        const t = h('button.panel-tab', { type: 'button', role: 'tab', 'data-tab': k, onclick: () => show(k) }, l);
        t.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); const o = t.dataset.tab === 'game' ? 'controls' : 'game'; show(o); tabs.querySelector(`[data-tab=${o}]`).focus(); } });
        tabs.append(t);
      }
      panel.replaceChildren(head('Settings', 'Options'), tabs, body, backBtn());
      show('game');
    } else if (which === 'about') {
      panel.replaceChildren(head('About', 'Frozen Star'),
        h('div.panel-body.prose',
          h('p', 'Everything in the game follows Einstein\'s general relativity, his theory of gravity as curved space and time. It uses the exact answer the theory gives for a black hole that does not spin, found by Karl Schwarzschild in 1916.'),
          h('p', 'That one answer sets how long things take to fall, how light stretches and reddens as it climbs out, the rescue deadline, the tides that pull on a body, and how slowly a clock runs near the hole. Every pixel outside the windows is a ray of light followed backwards through that curved space.'),
          h('p', 'Erebus is made up, but it is built to real numbers: it has the mass of 120,000 Suns, and its horizon is about 354,000 km from the centre, almost as far as the Moon is from the Earth. The lessons measure time in M, the time light takes to cross half that distance: 0.59 seconds for Erebus. Nothing is sped up or slowed down: what you see happens at its true speed.'),
          h('h4', 'Credits'),
          h('dl.credits',
            h('dt', 'Created by'), h('dd', 'Daniel McCoy Stephenson, Preponderous Software'),
            h('dt', 'Code and writing'), h('dd', 'Drafted with Claude (Anthropic) for Preponderous Software'),
            h('dt', 'Playtesting'), h('dd', 'AI playtesters, run with ', h('a', { href: 'https://github.com/Preponderous-Software/playtester', target: '_blank', rel: 'noopener' }, 'playtester')),
            h('dt', 'Engine'), h('dd', 'three.js (MIT) and a hand-written WebGL2 ray tracer'),
            h('dt', 'Type'), h('dd', 'Bricolage Grotesque and IBM Plex (SIL Open Font License)')),
          h('h4', 'Further reading'),
          h('ul.refs',
            h('li', 'Misner, Thorne & Wheeler, ', h('i', 'Gravitation'), ' (1973)'),
            h('li', 'Hamilton & Lisle, ', h('i', 'The river model of black holes'), ' (2008)'),
            h('li', 'Page, ', h('i', 'Particle emission rates from a black hole'), ' (1976)')),
          h('p.fine', 'Open source under the MIT license: ', h('a', { href: 'https://github.com/Preponderous-Software/frozen-star', target: '_blank', rel: 'noopener' }, 'github.com/Preponderous-Software/frozen-star'), '.')),
        backBtn());
    } else if (which === 'new') {
      panel.replaceChildren(head('New game', 'Start again?'),
        h('div.panel-body.prose',
          h('p', `Your story is saved at ${ROMAN[here] || 'the start'}${ACTS[here] ? `, ${ACTS[here][1]}` : ''}. Starting again erases it and begins from the dream.`),
          h('p.fine', 'Training stars and settings are kept.')),
        h('div.panel-actions',
          h('button.danger.fp-wide', { type: 'button', onclick: () => startAt(null, true) }, 'Erase and start again'),
          h('button.fp-wide', { type: 'button', onclick: () => closePanel() }, 'Keep my story')));
    } else {
      // Acts unlock as the story reaches them; the rest are listed, locked, so players know what lies ahead.
      // The Prologue is always open: it is where the story starts.
      const reached = finished ? ACTS.length - 1 : Math.max(0, here);
      panel.replaceChildren(head('Chapters', finished ? 'Every chapter' : save ? 'The story so far' : 'The story ahead'),
        h('ol.act-list', ACTS.map(([cp, name, sub], i) => {
          const open = i <= reached;
          const b = h('button.act' + (open ? '' : '.locked') + (i === here && !finished ? '.here' : ''), { type: 'button', disabled: !open, onclick: () => startAt(cp, i === 0 && !save) },
            h('span.act-n', ROMAN[i]), h('b', name), h('span.act-sub', open ? sub : [h('i.lock', { html: LOCK }), 'Reach it in the story to unlock']),
            i === here && !finished ? h('em', 'You are here') : null);
          return h('li', b);
        })),
        h('p.fp-note', 'Playing an earlier chapter moves your save back to it.'),
        backBtn());
    }
    panel.hidden = false;
    panel.parentElement?.classList.add('panel-open'); // a class, not :has(): Chrome left the old fill on the primary item
    if (wasHidden) { panel.classList.remove('in'); void panel.offsetWidth; panel.classList.add('in'); }
    panel.scrollTop = 0;
    panel.querySelector('.panel-body button, .panel-body input, .act:not(:disabled), .panel-tab, .panel-actions button')?.focus({ preventScroll: true });
  }

  const hints = h('div.menu-hints', { 'aria-hidden': 'true' },
    h('span.hint-keys', h('kbd', '↑'), h('kbd', '↓'), ' choose ', h('kbd', 'Enter'), ' select ', h('kbd', 'Esc'), ' back'),
    h('span.hint-pad', h('kbd.pad', 'A'), ' select ', h('kbd.pad.b', 'B'), ' back'));
  const status = h('p.rt-status', { 'aria-hidden': 'true' }, h('i'), 'Tracing light around Erebus');
  const el = h('div.title-screen.menu-screen',
    h('div.hero-glow', { 'aria-hidden': 'true' }),
    canvas,
    h('div.menu-left',
      h('p.eyebrow', 'A game about general relativity'),
      h('h1', 'Frozen Star'),
      h('p.lede', 'You wake aboard a research ship holding station above a black hole. Today you find out whether things really fall in.'),
      h('nav.menu-items', { 'aria-label': 'Main menu' }, items),
      h('p.fine.menu-foot', 'Keyboard and mouse, touch or gamepad · ', h('a', { href: 'https://danielstephenson.dev/play' }, 'More games'))),
    panel, hints, status);
  // the glow stands in for the black hole until (or unless) the ray tracer has drawn
  const placeGlow = () => { const f = heroFrame(innerWidth, innerHeight); el.style.setProperty('--hx', `${f.x * 100}%`); el.style.setProperty('--hy', `${f.y * 100}%`); };
  placeGlow(); addEventListener('resize', placeGlow);
  app.replaceChildren(el);
  const keys = (e) => {
    if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); closePanel(); return; }
    if (!['ArrowDown', 'ArrowUp'].includes(e.key) || e.target.closest?.('input, [role=radiogroup], [role=tablist]')) return;
    const list = [...el.querySelectorAll(panel.hidden ? '.menu-items .menu-item' : '.menu-panel button:not(:disabled), .menu-panel input, .menu-panel a')].filter((b) => b.offsetParent && b.tabIndex >= 0);
    const i = list.indexOf(document.activeElement);
    const next = list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length];
    next?.focus(); next?.scrollIntoView?.({ block: 'nearest' }); e.preventDefault();
  };
  addEventListener('keydown', keys);
  if (!window.matchMedia?.('(pointer: coarse)').matches) items[0].focus({ preventScroll: true });
  // if the GPU context is lost the painted glow takes over; if it never comes back, say so and offer a reload
  const glNote = h('p.gl-note', { hidden: true, role: 'status' }, 'The graphics driver restarted. ',
    h('button', { type: 'button', onclick: () => location.reload() }, 'Reload'), ' to bring the black hole back.');
  el.append(glNote);
  const stop = heroBackdrop(canvas,
    (ok) => { el.classList.toggle('lit', ok); el.classList.toggle('no-rt', !ok); if (ok) glNote.hidden = true; },
    (state) => { el.classList.remove('lit'); el.classList.add('no-rt'); glNote.hidden = state !== 'gone'; });
  const stopPad = padNav({ container: () => (panel.hidden ? el.querySelector('.menu-items') : panel), onBack: closePanel });
  document.body.dataset.ready = '1';
  return () => { stop(); stopPad(); removeEventListener('keydown', keys); removeEventListener('resize', placeGlow); document.body.classList.remove('fs-menu'); };
}

/** Arrow keys move between the cards of a grid, by row and column as laid out on screen. */
function gridKeys(root, sel) {
  const onKey = (e) => {
    const d = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
    const cards = [...root.querySelectorAll(sel)];
    const i = cards.indexOf(document.activeElement);
    if (!d || i < 0) return;
    const r0 = cards[i].getBoundingClientRect();
    let best = null, bestD = Infinity;
    for (const c of cards) {
      if (c === cards[i]) continue;
      const r = c.getBoundingClientRect(), dx = r.left - r0.left, dy = r.top - r0.top;
      if ((d[0] && Math.sign(dx) !== d[0]) || (d[1] && Math.sign(dy) !== d[1]) || (d[0] && Math.abs(dy) > r0.height / 2) || (d[1] && Math.abs(dy) < r0.height / 2)) continue;
      const dist = Math.abs(dx) + Math.abs(dy) * 2;
      if (dist < bestD) { bestD = dist; best = c; }
    }
    if (best) { e.preventDefault(); best.focus(); best.scrollIntoView({ block: 'nearest' }); }
  };
  root.addEventListener('keydown', onKey);
  return () => root.removeEventListener('keydown', onKey);
}

function trainingScreen() {
  const el = h('div.title-screen.training',
    h('section.chapters',
      h('a.back', { href: '#title' }, '← Main menu'),
      h('div.section-head', h('div', h('p.eyebrow', 'Expedition library'), h('h2', 'Training simulations')), h('span.fine.total', 'Stars ', h('b#total'))),
      h('p.fine', 'Short, focused lessons. They are also on the lab terminal aboard the Tern.'),
      h('ol.chapter-grid', CHAPTERS.map((c) => h('li', h('a.chapter-card', { href: `#${c.id}` },
        h('span.num', String(c.num)), h('b', c.title), h('span.kick', c.kicker), starRow(getStars(c.id))))))),
    h('section.about',
      h('div', h('h3', 'Real physics'), h('p', 'Exact Schwarzschild geometry. Fall times, redshifts, tides and rescue deadlines come from closed-form solutions, checked by unit tests.')),
      h('div', h('h3', 'Real light'), h('p', 'The 3D views trace a light ray for every pixel through curved spacetime, including inside the horizon, with true Doppler and gravitational colour shifts.')),
      h('div', h('h3', 'Real black holes'), h('p', 'Cygnus X-1, Sagittarius A*, M87* and TON 618, at their measured masses. Pick the wrong one and the tides will tell you.'))));
  app.replaceChildren(el); updateTotal(); window.scrollTo(0, 0);
  if (!window.matchMedia?.('(pointer: coarse)').matches) el.querySelector('.chapter-card')?.focus({ preventScroll: true });
  const stopKeys = gridKeys(el, '.chapter-card');
  const onEsc = (e) => { if (e.key === 'Escape') location.hash = '#title'; };
  addEventListener('keydown', onEsc);
  const stopPad = padNav({ container: () => el.querySelector('.chapter-grid'), onBack: () => { location.hash = '#title'; } });
  document.body.dataset.ready = '1';
  return () => { stopKeys(); stopPad(); removeEventListener('keydown', onEsc); };
}

function chapterScreen(ch) {
  const isSandbox = !ch.goals.length;
  const idx = CHAPTERS.indexOf(ch), next = CHAPTERS[idx + 1];
  const backTo = isSandbox ? '#title' : '#training';
  const met = ch.goals.map(() => false);
  const goalEls = ch.goals.map((g, i) => h('li', { id: `goal-${i}` }, h('i'), g));
  const body = h('div.ch-body');
  const debrief = h('section.debrief', { hidden: true });
  const el = h('div.chapter',
    h('div.ch-head',
      h('a.back', { href: backTo }, isSandbox ? '← Main menu' : '← Training simulations'),
      h('div.ch-title', isSandbox ? h('span.num', 'Sandbox') : h('span.num', `Chapter ${ch.num}`), h('h2', ch.title), h('p.kick', ch.kicker)),
      isSandbox ? null : h('ul.goals', goalEls)),
    body, debrief);
  app.replaceChildren(el);
  window.scrollTo(0, 0);
  const prev = getStars(ch.id);
  for (let i = 0; i < prev && i < goalEls.length; i++) goalEls[i].classList.add('was');
  const ctx = {
    goal(i, ok) {
      if (!ok || met[i]) return;
      met[i] = true; goalEls[i].classList.add('met');
      const n = met.filter(Boolean).length; if (award(ch.id, n)) updateTotal();
    },
    debrief({ title, body: paras }) {
      debrief.replaceChildren(
        h('p.eyebrow', 'Debrief'), h('h3', title), ...paras.filter(Boolean).map((p) => h('p', p)),
        h('div.debrief-actions',
          next ? h('a.button.primary', { href: `#${next.id}` }, `Next: ${next.title}`) : h('a.button.primary', { href: '#ship' }, 'Board the Tern'),
          h('a.button', { href: '#training' }, 'All lessons')));
      debrief.hidden = false;
      if (debrief.getBoundingClientRect().top > innerHeight) debrief.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
    },
  };
  const stop = ch.mount(body, ctx);
  // a gamepad can work the lesson's controls; B leaves it
  const stopPad = padNav({ container: () => el, onBack: () => { location.hash = backTo; } });
  document.body.dataset.ready = '1';
  return () => { stopPad(); stop?.(); };
}

// ---- routing, with a short fade between screens ----
const veil = $('#veil');
let routeSeq = 0, firstRoute = true;

function mount() {
  dispose?.(); dispose = null;
  const id = location.hash.slice(1);
  document.body.dataset.screen = id === 'ship' ? 'ship' : id === 'training' ? 'training' : [...CHAPTERS, observatory].some((c) => c.id === id) ? 'chapter' : 'title';
  if (id === 'ship') { document.title = 'Frozen Star'; dispose = mountGame(app); return; }
  if (id === 'training') { document.title = 'Training · Frozen Star'; dispose = trainingScreen(); return; }
  const ch = [...CHAPTERS, observatory].find((c) => c.id === id);
  document.title = ch ? `${ch.title} · Frozen Star` : 'Frozen Star';
  dispose = ch ? chapterScreen(ch) : titleScreen();
}

function route() {
  const seq = ++routeSeq;
  if (firstRoute || reduceMotion() || !veil) { firstRoute = false; mount(); return; }
  delete document.body.dataset.ready;
  veil.classList.add('on');
  setTimeout(() => {
    if (seq !== routeSeq) return;
    mount();
    // a moment for the new screen to paint before the veil lifts
    setTimeout(() => { if (seq === routeSeq) veil.classList.remove('on'); }, 60);
  }, 200);
}

trackInput();
window.addEventListener('hashchange', route);
route();
if (/[?&]probe\b/.test(location.search)) import('./game/probe.js').then((m) => m.startProbe());
