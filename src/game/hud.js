// Heads-up display: subtitles, objective, the use prompt, crosshair, fades and title cards.
import { h } from '../ui/dom.js';

const SPEAKERS = {
  WREN: { name: 'WREN', color: '#8fb8ff' },
  INES: { name: 'Ines', color: '#ffc882' },
  YOU: { name: 'You', color: '#ece8f4' },
};

export function createHud(root) {
  const subs = h('div.fp-subs', { 'aria-live': 'polite' });
  const objective = h('div.fp-objective', { hidden: true }, h('span', 'Objective'), h('b'));
  const prompt = h('div.fp-prompt', { hidden: true });
  const cross = h('div.fp-cross');
  const fade = h('div.fp-fade');
  const card = h('div.fp-card', { hidden: true });
  const hint = h('div.fp-hint', { hidden: true });
  root.append(cross, objective, prompt, subs, hint, card, fade);

  let lineId = 0, pending = null;
  const timers = new Set(); // lines on screen, counted down in game time so pausing freezes them
  const look = h('div.fp-look', { hidden: true }, 'Click to look around');
  root.append(look);
  subs.addEventListener('click', () => pending?.done());
  return {
    /** Show a line of dialogue. Resolves when it has been on screen long enough to read. */
    say(who, text, { dur, style } = {}) {
      const sp = SPEAKERS[who] || { name: who, color: '#ece8f4' };
      const el = h('p.fp-line', h('b', { style: { color: sp.color } }, sp.name), ' ', h('span', text));
      if (style) Object.assign(el.querySelector('span').style, style);
      subs.append(el);
      while (subs.children.length > 3) subs.firstChild.remove();
      const id = ++lineId, t = dur ?? Math.min(9, 1.6 + text.length * 0.055);
      setTimeout(() => el.remove(), t * 1000 + 9000);
      return new Promise((res) => {
        const p = { id, remain: t, done: () => { if (p.finished) return; p.finished = true; el.classList.add('old'); timers.delete(p); if (pending === p) pending = null; res(id); } };
        timers.add(p); pending = p;
      });
    },
    clearSubs() { subs.innerHTML = ''; },
    /** Finish the current line now (Space, or a tap on the subtitles). */
    skip() { pending?.done(); },
    /** Advance subtitle timers by dt seconds of game time (0 while paused). */
    tick(dt) { for (const p of [...timers]) { p.remain -= dt; if (p.remain <= 0) p.done(); } },
    lookHint(on) { look.hidden = !on; },
    toast(text) {
      const t = h('div.fp-toast', text); root.append(t);
      setTimeout(() => t.classList.add('out'), 1800); setTimeout(() => t.remove(), 2600);
    },
    choosing: false,
    objective(text) { objective.hidden = !text; if (text) objective.querySelector('b').textContent = text; objective.classList.remove('flash'); void objective.offsetWidth; objective.classList.add('flash'); },
    prompt(text) { prompt.hidden = !text; if (text) prompt.innerHTML = text; },
    crosshair(on) { cross.hidden = !on; },
    hint(text) { hint.hidden = !text; if (text) hint.innerHTML = text; },
    /** Fade to `alpha` (0 = clear, 1 = black) over `sec` seconds. */
    fade(alpha, sec = 1, color = '#000') {
      fade.style.transition = `opacity ${sec}s ease`; fade.style.background = color; fade.style.opacity = alpha;
      return new Promise((r) => setTimeout(r, sec * 1000));
    },
    /** A title card in the middle of the screen. */
    card(title, sub, sec = 3.5) {
      card.replaceChildren(h('h2', title), sub ? h('p', sub) : null); card.hidden = false;
      card.classList.remove('show'); void card.offsetWidth; card.classList.add('show');
      return new Promise((r) => setTimeout(() => { card.hidden = true; r(); }, sec * 1000));
    },
    /** Ask the player to pick one option. Resolves with its index, or null after `timeout` seconds. */
    choice(question, options, { timeout } = {}) {
      return new Promise((res) => {
        let done = false;
        const api = this;
        api.choosing = true;
        const finish = (i) => { if (done) return; done = true; api.choosing = false; box.remove(); res(i); };
        const box = h('div.fp-choice', h('p', question), h('div.fp-choice-opts', options.map((o, i) => h('button', { type: 'button', onclick: () => finish(i) }, `${i + 1}. ${o}`))));
        root.append(box);
        const key = (e) => { const n = Number(e.key); if (n >= 1 && n <= options.length) { removeEventListener('keydown', key); finish(n - 1); } };
        addEventListener('keydown', key);
        if (document.pointerLockElement) document.exitPointerLock?.();
        if (timeout) setTimeout(() => { removeEventListener('keydown', key); finish(null); }, timeout * 1000);
      });
    },
    dispose() { for (const e of [subs, objective, prompt, cross, fade, card, hint, look]) e.remove(); },
  };
}
