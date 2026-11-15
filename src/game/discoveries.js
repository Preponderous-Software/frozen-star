// Discoveries: small rewards for curiosity and understanding, each with a true physics fact.
// They live in their own localStorage key, apart from the story save and the training stars, so a
// broken or missing record can never touch either. Everything works without storage (for one visit).
import { h } from '../ui/dom.js';
import { hoverRate } from '../physics/body.js';
import { R_STATION } from './world.js';

const KEY = 'frozen-star.discoveries.v1';

/** The props aboard that have something to say. Reading all of them is a discovery. */
export const PROPS = ['datapad', 'photo', 'porthole', 'log', 'mug', 'whiteboard'];

export const DISCOVERIES = [
  // ---- aboard the Tern ----
  { id: 'metronome', act: 'bridge', title: 'Metronome', hint: 'Listen to all of K-1\'s pings.',
    fact: 'K-1\'s clock ticked steadily all the way down. Only its signals reached the ship later and later.' },
  { id: 'called-it', act: 'bridge', title: 'Called it', hint: 'Predict when the ninth ping will arrive.',
    fact: 'Each ping climbs out of a deeper well than the last, so the gaps grow without limit near the horizon.' },
  { id: 'cutting-it-fine', act: 'probe-done', title: 'Cutting it fine', hint: 'Save Ines with almost no time to spare.',
    fact: 'You fired with under 5 s to spare. The deadline is set by light speed, and her picture never showed it.' },
  { id: 'four-to-one', act: 'rescue-done', title: 'Four to one', hint: 'Take the Tern lower than you were asked to, and hold there.',
    fact: 'At 1.07 rₛ every second aboard is four seconds far away. The field cannot hold a ship below about 1.03 rₛ.' },
  { id: 'into-the-black', act: 'rescue-done', title: 'Into the black', hint: 'Look out of the bridge window while hovering deep.',
    fact: 'Hovering this low, the shadow covers more than half the sky, and every star crowds into a patch behind you.' },
  { id: 'a-minute-behind', act: 'rescue-done', title: 'A minute behind', hint: 'Let the relay clock get a whole minute ahead of yours.',
    fact: 'Gravity slows clocks for real: GPS satellites correct for it, about 45 microseconds a day.' },
  { id: 'pulling-ahead', act: 'rescue-done', title: 'Pulling ahead', hint: 'Look at the photo of home from somewhere deep.',
    fact: 'Low in the well, home lives faster than you do. The gap is never paid back when you climb out.' },
  { id: 'window-gazer', title: 'Window gazer', hint: 'Stand at the bridge window and just look for a while.',
    fact: 'Light that loops the hole once makes one bright ring; light that loops twice makes a thinner one inside it.' },
  { id: 'curious', title: 'Curious', hint: 'Read everything aboard that has something to say.',
    fact: 'Matter tells spacetime how to curve; spacetime tells matter how to move. (John Wheeler)' },
  { id: 'it-fell-in', act: 'helm-done', title: 'It fell in', hint: 'Tell Ines the truth about Orpheus.',
    fact: 'Orpheus crossed the horizon in finite time by its own clock. Only its last light is "frozen", and it fades.' },
  { id: 'frozen-star', title: 'Frozen star', hint: 'Finish the survey.',
    fact: 'Before the name "black hole" caught on in 1967, they were called frozen stars, for how they look from outside.' },
  { id: 'shutterbug', title: 'Shutterbug', hint: 'Save a picture in photo mode (P).',
    fact: 'Every pixel of sky in your picture is a ray of light followed backwards through curved spacetime.' },
  // ---- training simulations: all three stars ----
  { id: 'lesson-two-clocks', lesson: 'two-clocks', title: 'Two clocks', hint: 'Earn all three stars in Two Clocks.',
    fact: 'Nothing slows down for the faller. "Slow" is a statement about signals, compared across distance.' },
  { id: 'lesson-last-words', lesson: 'last-words', title: 'Last words', hint: 'Earn all three stars in Last Words.',
    fact: 'A message sent just outside the horizon can take as long as you like to arrive. One sent inside never does.' },
  { id: 'lesson-rescue', lesson: 'rescue', title: 'The invisible deadline', hint: 'Earn all three stars in The Rescue.',
    fact: 'By the last moment the beam can leave, the pilot still looks far from the horizon.' },
  { id: 'lesson-tides', lesson: 'tides', title: 'Bigger is gentler', hint: 'Earn all three stars in Pick Your Hole.',
    fact: 'The stretch at the horizon falls as one over the mass squared: you could cross a giant hole unharmed.' },
  { id: 'lesson-hover', lesson: 'hover', title: 'Time in the bank', hint: 'Earn all three stars in Hover.',
    fact: 'Hovering low gains time on home, but the push needed grows without limit at the horizon.' },
  { id: 'lesson-bend-light', lesson: 'bend-light', title: 'Photon sphere', hint: 'Earn all three stars in Bend the Light.',
    fact: 'At 1.5 rₛ light can circle the hole. The shadow is √27/2, about 2.6, times as wide as the horizon.' },
  { id: 'lesson-into-the-dark', lesson: 'into-the-dark', title: 'No way but in', hint: 'Earn all three stars in Into the Dark.',
    fact: 'Inside the horizon the centre is not a place ahead of you but a moment in your future.' },
  { id: 'lesson-evaporation', lesson: 'evaporation', title: 'Hawking\'s clock', hint: 'Earn all three stars in Evaporation.',
    fact: 'A hole\'s lifetime grows as its mass cubed: one of the Sun\'s mass would last about 10⁶⁷ years.' },
];
const BY_ID = Object.fromEntries(DISCOVERIES.map((d) => [d.id, d]));

// Story discoveries keep their hints vague until the story reaches their act, so the list never gives the
// plot away. `act` is the checkpoint where that act begins (the order matches story.js).
const ACT_ORDER = ['start', 'bridge', 'probe-done', 'rescue-done', 'helm-done', 'epilogue', 'halo'];
const ACT_NAME = { bridge: 'Chapter I', 'probe-done': 'Chapter II', 'rescue-done': 'Chapter III', 'helm-done': 'Chapter IV' };
function storyReached() {
  let cp = null;
  try { cp = JSON.parse(localStorage.getItem('frozen-star.fp.v1'))?.cp; } catch { /* no storage */ }
  return Math.max(0, ACT_ORDER.indexOf(cp));
}
/** The hint to show for a locked discovery: the real one, or a spoiler-free one before its act. */
export function hintFor(d, reached = storyReached()) {
  if (!d.act || reached >= ACT_ORDER.indexOf(d.act)) return d.hint;
  return `Something to notice in ${ACT_NAME[d.act]}. Its hint appears when you get there.`;
}

// ---- storage: unknown fields are kept, so an older or newer build can share the record ----
let mem = null;
function load() {
  if (mem) return mem;
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch { /* no storage or a broken record: start empty */ }
  if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
  if (!d.got || typeof d.got !== 'object' || Array.isArray(d.got)) d.got = {};
  if (!Array.isArray(d.props)) d.props = [];
  mem = d;
  return mem;
}
function store() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* storage off: kept for this visit */ } }

const listeners = new Set();
/** Call fn(discovery) whenever one unlocks. Returns an unsubscribe function. */
export function onUnlock(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export const has = (id) => !!load().got[id];
export const foundCount = () => DISCOVERIES.filter((d) => has(d.id)).length;

/** Unlock a discovery. Returns it the first time, null after that (or for an unknown id). */
export function unlock(id, { quiet = false } = {}) {
  const d = BY_ID[id];
  if (!d || has(id)) return null;
  load().got[id] = Date.now(); store();
  if (!quiet) for (const fn of listeners) { try { fn(d); } catch (e) { console.error(e); } }
  return d;
}

/** A prop aboard was used: remember it, and unlock "Curious" once every prop has been read. */
export function noteProp(id) {
  if (!PROPS.includes(id)) return;
  const s = load();
  if (!s.props.includes(id)) { s.props.push(id); store(); }
  if (PROPS.every((p) => s.props.includes(p))) unlock('curious');
}

/** Training stars earned before discoveries existed still count (quietly). */
export function syncTraining(getStars) {
  for (const d of DISCOVERIES) if (d.lesson && getStars(d.lesson) >= 3) unlock(d.id, { quiet: true });
}

/**
 * Watches the game for discoveries that come from what the player does. Returns a tick for g.ticks:
 * a handful of comparisons a frame, with the flag checks only four times a second.
 */
export function watchGame(g) {
  let check = 0, deep4 = 0, deepWindow = 0, gaze = 0;
  return (dt) => {
    if (g.photo?.on) return;
    const rate = 1 / hoverRate(g.shipR);
    deep4 = rate >= 4 ? deep4 + dt : 0;
    if (deep4 > 8) unlock('four-to-one');
    // at the bridge window, facing out (the same place the crew notices you lingering)
    const yaw = Math.atan2(Math.sin(g.me.yaw), Math.cos(g.me.yaw));
    const atWindow = g.mode === 'walk' && !g.paused && g.inRoom('bridge') && g.me.z < -9.6 && Math.abs(yaw) < 0.6 && g.me.pitch > -0.5;
    deepWindow = atWindow && rate >= 2 ? deepWindow + dt : 0;
    if (deepWindow > 3) unlock('into-the-black');
    gaze = atWindow && Math.abs(g.shipR - R_STATION) < 0.1 ? gaze + dt : 0;
    if (gaze > 20) unlock('window-gazer');
    if ((check += dt) < 0.25) return;
    check = 0;
    const st = g.flags.stats || {};
    if (st.prediction != null) unlock('metronome');
    if (st.prediction === 'right') unlock('called-it');
    if (st.margin != null && st.margin >= 0 && st.margin < 5) unlock('cutting-it-fine');
    if (st.answer === 'fell in') unlock('it-fell-in');
    if (g.flags.finished) unlock('frozen-star');
    if (Math.max(g.clocks.relay - g.clocks.ship, (st.relayT || 0) - (st.shipT || 0)) >= 60) unlock('a-minute-behind');
  };
}

/** A prop or console was used aboard. */
export function noteUse(id, g) {
  noteProp(id);
  if (id === 'photo' && 1 / hoverRate(g.shipR) >= 1.5) unlock('pulling-ahead');
}

/** The list, as shown on the title menu and the pause menu. Locked ones are silhouettes with a hint. */
export function discoveriesView() {
  const n = foundCount(), reached = storyReached();
  const item = (d) => {
    const got = has(d.id);
    return h('li.disc' + (got ? '.got' : '.locked'),
      h('span.disc-mark', { 'aria-hidden': 'true' }),
      h('div', h('b', got ? d.title : '? ? ?'), h('p', got ? d.fact : hintFor(d, reached))),
      h('span.sr-only', got ? ' (found)' : ' (not found yet)'));
  };
  const ship = DISCOVERIES.filter((d) => !d.lesson), lessons = DISCOVERIES.filter((d) => d.lesson);
  return h('div.disc-view',
    h('p.disc-count', h('span', h('b', String(n)), ` of ${DISCOVERIES.length} found`), h('i.disc-bar', h('i', { style: { width: `${(100 * n) / DISCOVERIES.length}%` } }))),
    h('h4', 'Aboard the Tern'), h('ul.disc-list', ship.map(item)),
    h('h4', 'Training simulations'), h('ul.disc-list', lessons.map(item)));
}

/** A small notice for screens outside the ship (the HUD has its own toast). */
export function floatToast(d) {
  const t = h('div.disc-float', { role: 'status' }, h('span', 'Discovery'), h('b', d.title), h('p', d.fact));
  document.body.append(t);
  setTimeout(() => t.classList.add('out'), 4200); setTimeout(() => t.remove(), 5200);
}

// the styles for the list and the notices live beside this file
if (typeof document !== 'undefined' && !document.querySelector('link[data-fs="discoveries"]')) {
  document.head.append(h('link', { rel: 'stylesheet', href: new URL('./discoveries.css', import.meta.url).href, 'data-fs': 'discoveries' }));
}
