// Tiny DOM helpers shared by every chapter.

/** h('div.class#id', {attrs}, ...children) */
export function h(sel, attrs, ...kids) {
  if (attrs == null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) { kids.unshift(attrs); attrs = {}; }
  const [, tag = 'div', rest = ''] = sel.match(/^([a-z0-9-]*)(.*)$/i);
  const el = document.createElement(tag || 'div');
  for (const m of rest.matchAll(/([.#])([\w-]+)/g)) m[1] === '.' ? el.classList.add(m[2]) : (el.id = m[2]);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);

/** A labelled readout whose value can be set later. */
export function stat(label, init = '–') {
  const v = h('b', init);
  const el = h('div.stat', h('span', label), v);
  return { el, set: (x) => { if (v.innerHTML !== x) v.innerHTML = x; } };
}

/** Status line with a severity: '', 'warn', 'bad', 'done', 'good'. */
export function status(init = '') {
  const el = h('div.status', init);
  return { el, set(text, kind = '') { if (el.textContent !== text) el.textContent = text; el.className = 'status' + (kind ? ' ' + kind : ''); } };
}

/** Scrolling log, newest first. */
export function log() {
  const el = h('div.log', { 'aria-live': 'polite' });
  return { el, add(text, kind = '') { el.prepend(h('div' + (kind ? '.' + kind : ''), text)); }, clear() { el.innerHTML = ''; } };
}

/** Animation loop that stops when disposed. */
export function loop(fn) {
  let id = 0, last = performance.now(), alive = true;
  const tick = (now) => { if (!alive) return; const dt = Math.min(0.1, (now - last) / 1000); last = now; fn(dt, now); id = requestAnimationFrame(tick); };
  id = requestAnimationFrame(tick);
  return () => { alive = false; cancelAnimationFrame(id); };
}

export function slider(label, { min, max, step = 'any', value, fmt = (x) => x, id }) {
  const out = h('output');
  const input = h('input', { type: 'range', min, max, step, value, id });
  const el = h('label.slider', { for: id }, h('span', label), input, out);
  const upd = () => { out.innerHTML = fmt(+input.value); };
  input.addEventListener('input', upd); upd();
  return { el, input, get value() { return +input.value; }, set value(v) { input.value = v; upd(); } };
}

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
