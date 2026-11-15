// Shared lesson furniture: the mission card at the top of every lesson, a word list for the
// unfamiliar terms, and a quiz whose every answer explains itself.
import { h } from '../ui/dom.js';
import { secondsFromM, formatDuration } from '../physics/units.js';

let styled = false;
function ensureStyles() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  document.head.append(h('link', { rel: 'stylesheet', href: new URL('./lesson.css', import.meta.url).href }));
}

/**
 * The mission card: what to do, step by step, and what you will find out.
 * words: [[term, plain explanation], ...] shown in a collapsible "Words used here" list.
 */
export function brief({ goal, steps = [], words = [] }) {
  ensureStyles();
  return h('section.lx-brief',
    h('div.lx-goal', h('span.lx-tag', 'Your mission'), h('p', goal)),
    steps.length ? h('ol.lx-steps', steps.map((s) => h('li', s))) : null,
    words.length ? h('details.lx-words', h('summary', 'Words used here'),
      h('dl', words.flatMap(([t, d]) => [h('dt', t), h('dd', d)]))) : null);
}

/** The time unit M, in plain words and in seconds for the given hole. */
export function wordM(massSun, holeName) {
  return ['M (time)', `The black hole's own unit of time: how long light takes to travel half the horizon's radius. Bigger holes have a longer M, so the same story plays out more slowly. For ${holeName}, 1 M is ${formatDuration(secondsFromM(1, massSun))}.`];
}
export const WORD_RS = ['rₛ (distance)', 'The radius of the horizon, measured from the centre. 1 rₛ is the horizon itself, 2 rₛ is twice as far from the centre, and so on.'];
export const WORD_HORIZON = ['Horizon', 'The point of no return. Inside it, even light moving outward is carried inward. Nothing marks it: there is no wall and no flash.'];
export const WORD_REDSHIFT = ['Redshift (1+z)', 'How much the light has been stretched on its way to you. 2 means every wave arrives twice as long: blue light turns red, then invisible infrared, and the picture dims.'];
export const WORD_G = ['g', 'The pull you feel standing on Earth. 3 g is three times that. Trained pilots black out somewhere above 5 to 10 g.'];
export const WORD_SCI = ['10¹² and similar', 'Shorthand for very big or small numbers: 10¹² is a 1 with twelve zeros (a million million). 10⁻³ is one thousandth.'];

/**
 * A multiple-choice question where every answer explains itself.
 * choices: [[label, correct, why], ...]. onAnswer(correct, index) runs on each pick.
 * lock: stop after the first right answer (default true).
 */
export function quiz({ prompt, choices, onAnswer, intro, lock = true, id = 'q' }) {
  ensureStyles();
  const why = h('div.lx-why', { hidden: true, 'aria-live': 'polite' });
  const buttons = choices.map(([label, ok, reason], i) => h('button.choice', { id: `${id}${i}`, type: 'button', onclick: (e) => {
    const b = e.currentTarget;
    b.classList.add(ok ? 'right' : 'wrong');
    why.hidden = false;
    why.className = 'lx-why ' + (ok ? 'right' : 'wrong');
    why.replaceChildren(h('b', ok ? 'Right. ' : 'Not quite. '), reason || '');
    if (ok && lock) buttons.forEach((x) => { x.disabled = true; });
    onAnswer?.(ok, i);
  } }, label));
  const el = h('div.quiz', intro ? h('p.fine', intro) : null, h('p', prompt), h('div.choices', buttons), why);
  return { el, buttons, why };
}

/** A small "what just happened" callout placed under a control row. */
export function coach(init = '') {
  ensureStyles();
  const el = h('p.lx-coach', { 'aria-live': 'polite' }, init);
  return { el, set(text, kind = '') { if (el.textContent !== text) el.textContent = text; el.className = 'lx-coach' + (kind ? ' ' + kind : ''); } };
}
