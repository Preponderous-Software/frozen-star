// Frozen Star: shell, routing and chapter frame.
import { h, $ } from './ui/dom.js';
import { getStars, award, totalStars } from './progress.js';
import { BlackHoleView, lookBasis, hoverVelocity } from './render/raytracer.js';
import twoClocks from './chapters/two-clocks.js';
import lastWords from './chapters/last-words.js';
import rescue from './chapters/rescue.js';
import tides from './chapters/tides.js';
import hover from './chapters/hover.js';
import intoTheDark from './chapters/into-the-dark.js';
import evaporation from './chapters/evaporation.js';
import observatory from './chapters/observatory.js';

export const CHAPTERS = [twoClocks, lastWords, rescue, tides, hover, intoTheDark, evaporation];
const app = $('#app');
let dispose = null;

function starRow(n, of = 3) { return h('span.stars', { 'aria-label': `${n} of ${of} stars` }, Array.from({ length: of }, (_, i) => h('i' + (i < n ? '.on' : '')))); }

function updateTotal() { const el = $('#total'); if (el) el.textContent = `${totalStars()} / ${CHAPTERS.length * 3}`; }

function titleScreen() {
  const canvas = h('canvas.hero-rt', { 'aria-hidden': 'true' });
  const next = CHAPTERS.find((c) => getStars(c.id) < 1) || CHAPTERS[0];
  const el = h('div.title-screen',
    h('div.hero', canvas,
      h('div.hero-text',
        h('p.eyebrow', 'A game about general relativity'),
        h('h1', 'Frozen Star'),
        h('p.lede', 'From far away, nothing is ever seen to fall into a black hole. It slows, reddens and fades at the edge. On its own clock it falls straight through. Seven chapters on why both are true.'),
        h('div.hero-actions',
          h('a.button.primary', { href: `#${next.id}` }, next === CHAPTERS[0] ? 'Begin: Two Clocks' : `Continue: ${next.title}`),
          h('a.button', { href: '#observatory' }, 'Open the observatory')))),
    h('section.chapters',
      h('div.section-head', h('h2', 'Chapters'), h('span.fine', 'Stars ', h('b#total'))),
      h('ol.chapter-grid', CHAPTERS.map((c) => h('li', h('a.chapter-card', { href: `#${c.id}` },
        h('span.num', String(c.num)), h('b', c.title), h('span.kick', c.kicker), starRow(getStars(c.id))))))),
    h('section.about',
      h('div', h('h3', 'Real physics'), h('p', 'Exact Schwarzschild geometry. Fall times, redshifts, tides and rescue deadlines come from closed-form solutions, checked by unit tests.')),
      h('div', h('h3', 'Real light'), h('p', 'The 3D views trace a light ray for every pixel through curved spacetime, including inside the horizon, with true Doppler and gravitational colour shifts.')),
      h('div', h('h3', 'Real black holes'), h('p', 'Cygnus X-1, Sagittarius A*, M87* and TON 618, at their measured masses. Pick the wrong one and the tides will tell you.'))));
  app.replaceChildren(el); updateTotal();
  let view = null, raf = 0, alive = true, t = 0, last = performance.now(), avg = 16, frames = 0;
  try { view = new BlackHoleView(canvas, { scale: 0.5 }); view.set({ steps: 500, fov: 0.9 }); } catch { canvas.remove(); }
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const tick = (now) => {
    if (!alive || !view) return;
    t += reduce ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
    const a = -0.35 + t * 0.05, r = 32, pos = [Math.sin(a) * r, 2.6 + Math.sin(t * 0.07) * 0.8, -Math.cos(a) * r];
    view.set({ cam: pos, basis: lookBasis(pos, [Math.cos(a) * 6.5, -1.2, Math.sin(a) * 6.5]), V: hoverVelocity(pos), time: t, disk: true });
    const t0 = performance.now(); view.render(); view.gl.finish?.();
    const ms = performance.now() - t0; avg = avg * 0.9 + ms * 0.1;
    if (++frames % 15 === 0) { const sc = view.state.scale; if (avg > 34 && sc > 0.2) view.set({ scale: sc * 0.8 }); else if (avg < 12 && sc < 0.75) view.set({ scale: sc * 1.1 }); }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  document.body.dataset.ready = '1';
  return () => { alive = false; cancelAnimationFrame(raf); view?.dispose(); };
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
      h('a.back', { href: '#title' }, '← All chapters'),
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
          next ? h('a.button.primary', { href: `#${next.id}` }, `Next: ${next.title}`) : h('a.button.primary', { href: '#observatory' }, 'Open the observatory'),
          h('a.button', { href: '#title' }, 'All chapters')));
      debrief.hidden = false;
    },
  };
  const stop = ch.mount(body, ctx);
  document.body.dataset.ready = '1';
  return stop;
}

function route() {
  dispose?.(); dispose = null;
  const id = location.hash.slice(1);
  const ch = [...CHAPTERS, observatory].find((c) => c.id === id);
  document.title = ch ? `${ch.title} · Frozen Star` : 'Frozen Star';
  dispose = ch ? chapterScreen(ch) : titleScreen();
}

window.addEventListener('hashchange', route);
route();
