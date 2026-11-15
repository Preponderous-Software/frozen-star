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
import { settingsForm, ACTS } from './game/settings-ui.js';
import { loadSettings } from './game/settings.js';
import { padNav } from './ui/padnav.js';

export const CHAPTERS = [twoClocks, lastWords, rescue, tides, hover, bendLight, intoTheDark, evaporation];
const app = $('#app');
let dispose = null;

function starRow(n, of = 3) { return h('span.stars', { 'aria-label': `${n} of ${of} stars` }, Array.from({ length: of }, (_, i) => h('i' + (i < n ? '.on' : '')))); }

function updateTotal() { const el = $('#total'); if (el) el.textContent = `${totalStars()} / ${CHAPTERS.length * 3}`; }

function readSave() { try { return JSON.parse(localStorage.getItem('frozen-star.fp.v1')); } catch { return null; } }

/** The animated black hole behind the menus. Returns a disposer. */
function heroBackdrop(canvas) {
  let view = null, raf = 0, alive = true, t = 0, last = performance.now(), avg = 16, frames = 0;
  try { view = new BlackHoleView(canvas, { scale: 0.5 }); view.set({ steps: 500, fov: 0.9 }); } catch { canvas.remove(); }
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const tick = (now) => {
    if (!alive || !view) return;
    t += reduce ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
    const a = -0.35 + t * 0.05, r = 32, pos = [Math.sin(a) * r, 2.6 + Math.sin(t * 0.07) * 0.8, -Math.cos(a) * r];
    view.set({ cam: pos, basis: lookBasis(pos, [Math.cos(a) * 9, -1.2, Math.sin(a) * 9]), V: hoverVelocity(pos), time: t, disk: true });
    const dtMs = (now - (tick.prev || now)); tick.prev = now; view.render();
    avg = avg * 0.85 + dtMs * 0.15;
    if (++frames % 15 === 0) { const sc = view.state.scale; if (avg > 36 && sc > 0.2) view.set({ scale: Math.max(0.2, sc * 0.8) }); else if (avg < 22 && sc < 0.75) view.set({ scale: sc * 1.07 }); }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { alive = false; cancelAnimationFrame(raf); view?.dispose(); };
}

function titleScreen() {
  document.body.classList.add('fs-menu');
  const canvas = h('canvas.hero-rt', { 'aria-hidden': 'true' });
  const save = readSave();
  const actOf = (cp) => ACTS.find((a) => a[0] === cp);
  const finished = save?.cp === 'epilogue' || save?.flags?.finished;
  const isDesktop = /Electron/.test(navigator.userAgent);
  const panel = h('div.menu-panel', { hidden: true });
  const startAt = (cp, fresh) => {
    try {
      if (fresh) localStorage.removeItem('frozen-star.fp.v1');
      else if (cp) localStorage.setItem('frozen-star.fp.v1', JSON.stringify({ cp, flags: { finished: !!finished, stats: save?.flags?.stats || {} } }));
    } catch { /* storage off: the game starts from the beginning */ }
    location.hash = '#ship';
  };
  const item = (label, sub, onclick, primary) => h('button.menu-item' + (primary ? '.primary' : ''), { type: 'button', onclick }, h('b', label), sub ? h('span', sub) : null);
  let confirming = false;
  const items = [
    save ? item('Continue', actOf(save.cp)?.[1] || 'aboard the Tern', () => startAt(null), true) : item('Wake up', 'Start the story', () => startAt(null, true), true),
    save ? item('New game', 'Start again from the dream', (e) => {
      if (!confirming) { confirming = true; e.currentTarget.querySelector('span').textContent = 'Click again to erase your progress'; return; }
      startAt(null, true);
    }) : null,
    save ? item('Chapters', finished ? 'Replay any part of the story' : 'Replay the parts you have reached', () => showPanel('acts')) : null,
    item('Settings', null, () => showPanel('settings')),
    item('Training simulations', 'Eight short lessons', () => { location.hash = '#training'; }),
    item('Observatory', 'A free camera around a black hole', () => { location.hash = '#observatory'; }),
    item('About', 'The physics and references behind it', () => showPanel('about')),
    isDesktop ? item('Quit', null, () => window.close()) : null,
  ].filter(Boolean);
  function showPanel(which) {
    panel.hidden = false;
    for (const b of items) b.classList.toggle('open', b === document.activeElement);
    if (which === 'settings') panel.replaceChildren(settingsForm(loadSettings(), null, { onBack: () => { panel.hidden = true; } }));
    else if (which === 'about') panel.replaceChildren(h('p.eyebrow', 'About'), h('h3', 'Frozen Star'),
      h('p', 'Everything in the game follows the Schwarzschild solution of general relativity: fall times, redshift, the rescue deadline, tides, hovering clocks, and every pixel of the view outside, which is a light ray traced through curved spacetime.'),
      h('p', 'Erebus is fictional. At 120,000 suns, one unit of black-hole time is 0.59 seconds, so what you see happens at its true speed.'),
      h('p.fine', 'References: Misner, Thorne & Wheeler, Gravitation (1973); Hamilton & Lisle, The river model of black holes (2008); Page, Particle emission rates from a black hole (1976).'),
      h('p.fine', 'Made by Preponderous Software. Open source under the MIT license: ', h('a', { href: 'https://github.com/Preponderous-Software/frozen-star', target: '_blank', rel: 'noopener' }, 'github.com/Preponderous-Software/frozen-star'), '.'),
      h('p.fine', 'Built with three.js (MIT). The desktop app runs on Electron.'),
      h('button', { type: 'button', onclick: () => { panel.hidden = true; } }, 'Back'));
    else {
      // Acts unlock as the story reaches them; the rest are listed, locked, so players know what lies ahead.
      const reached = finished ? ACTS.length - 1 : Math.max(0, ACTS.findIndex((a) => a[0] === save?.cp));
      panel.replaceChildren(h('p.eyebrow', 'Chapters'), ...ACTS.map(([cp, name, sub], i) => {
        const b = item(name, i <= reached ? sub : 'Reach it in the story to unlock', () => startAt(cp));
        if (i > reached) b.disabled = true;
        return b;
      }), h('button', { type: 'button', onclick: () => { panel.hidden = true; } }, 'Back'));
    }
    panel.querySelector('button, input, select')?.focus();
  }
  const el = h('div.title-screen.menu-screen',
    canvas,
    h('div.menu-left',
      h('p.eyebrow', 'A game about general relativity'),
      h('h1', 'Frozen Star'),
      h('p.lede', 'You wake aboard a research ship holding station above a black hole. Today you find out whether things really fall in.'),
      h('nav.menu-items', { 'aria-label': 'Main menu' }, items),
      h('p.fine.menu-foot', 'About 20 minutes · keyboard and mouse, touch, or a gamepad · real general relativity · ', h('a', { href: 'https://danielstephenson.dev/play' }, 'More games'))),
    panel);
  app.replaceChildren(el);
  // arrow keys move through the menu
  const keys = (e) => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key) || e.target.closest?.('input, select')) return;
    const list = [...el.querySelectorAll(panel.hidden ? '.menu-items .menu-item' : '.menu-panel button')];
    const i = list.indexOf(document.activeElement);
    list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus(); e.preventDefault();
  };
  addEventListener('keydown', keys);
  el.querySelector('.menu-item')?.focus({ preventScroll: true });
  const stop = heroBackdrop(canvas);
  const stopPad = padNav({ container: () => (panel.hidden ? el.querySelector('.menu-items') : panel), onBack: () => { panel.hidden = true; el.querySelector('.menu-item')?.focus(); } });
  document.body.dataset.ready = '1';
  return () => { stop(); stopPad(); removeEventListener('keydown', keys); document.body.classList.remove('fs-menu'); };
}

function trainingScreen() {
  const el = h('div.title-screen',
    h('section.chapters',
      h('a.back', { href: '#title' }, '← Main menu'),
      h('div.section-head', h('h2', 'Training simulations'), h('span.fine', 'Stars ', h('b#total'))),
      h('p.fine', 'Short, focused lessons from the expedition library. They are also on the lab terminal aboard the Tern.'),
      h('ol.chapter-grid', CHAPTERS.map((c) => h('li', h('a.chapter-card', { href: `#${c.id}` },
        h('span.num', String(c.num)), h('b', c.title), h('span.kick', c.kicker), starRow(getStars(c.id))))))),
    h('section.about',
      h('div', h('h3', 'Real physics'), h('p', 'Exact Schwarzschild geometry. Fall times, redshifts, tides and rescue deadlines come from closed-form solutions, checked by unit tests.')),
      h('div', h('h3', 'Real light'), h('p', 'The 3D views trace a light ray for every pixel through curved spacetime, including inside the horizon, with true Doppler and gravitational colour shifts.')),
      h('div', h('h3', 'Real black holes'), h('p', 'Cygnus X-1, Sagittarius A*, M87* and TON 618, at their measured masses. Pick the wrong one and the tides will tell you.'))));
  app.replaceChildren(el); updateTotal(); window.scrollTo(0, 0);
  document.body.dataset.ready = '1';
  return () => {};
}

function chapterScreen(ch) {
  const isSandbox = !ch.goals.length;
  const idx = CHAPTERS.indexOf(ch), next = CHAPTERS[idx + 1];
  const met = ch.goals.map(() => false);
  const goalEls = ch.goals.map((g, i) => h('li', { id: `goal-${i}` }, h('i'), g));
  const body = h('div.ch-body');
  const debrief = h('section.debrief', { hidden: true });
  const el = h('div.chapter',
    h('div.ch-head',
      h('a.back', { href: '#training' }, '← Training simulations'),
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
        h('p.eyebrow', 'Debrief'), h('h3', title), ...paras.map((p) => h('p', p)),
        h('div.debrief-actions',
          next ? h('a.button.primary', { href: `#${next.id}` }, `Next: ${next.title}`) : h('a.button.primary', { href: '#ship' }, 'Board the Tern'),
          h('a.button', { href: '#training' }, 'All lessons')));
      debrief.hidden = false;
    },
  };
  const stop = ch.mount(body, ctx);
  document.body.dataset.ready = '1';
  return stop;
}

function hasSave() { try { return !!localStorage.getItem('frozen-star.fp.v1'); } catch { return false; } }

function route() {
  dispose?.(); dispose = null;
  const id = location.hash.slice(1);
  if (id === 'ship') { document.title = 'Frozen Star'; dispose = mountGame(app); return; }
  if (id === 'training') { document.title = 'Training · Frozen Star'; dispose = trainingScreen(); return; }
  const ch = [...CHAPTERS, observatory].find((c) => c.id === id);
  document.title = ch ? `${ch.title} · Frozen Star` : 'Frozen Star';
  dispose = ch ? chapterScreen(ch) : titleScreen();
}

window.addEventListener('hashchange', route);
route();
if (/[?&]probe\b/.test(location.search)) import('./game/probe.js').then((m) => m.startProbe());
