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

/** A labelled readout whose value can be set later. An optional hint explains it in plain words. */
export function stat(label, init = '–', hint) {
  const v = h('b', init);
  const el = h('div.stat', h('span', label), v, hint ? h('small', hint) : null);
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

/** The one number that matters: a big readout with a label, a unit line and a plain-words note under it. */
export function hero(label, { tone = '', note = '' } = {}) {
  const v = h('b'), u = h('i'), n = h('small', note);
  const el = h('div.fp-hero' + (tone ? '.' + tone : ''), h('span', label), h('div', v, u), n);
  return {
    el,
    set(value, unit = '', text) { if (v.textContent !== value) v.textContent = value; if (u.textContent !== unit) u.textContent = unit; if (text != null && n.textContent !== text) n.textContent = text; },
    tone(t) { el.className = 'fp-hero' + (t ? ' ' + t : ''); },
  };
}

/**
 * A horizontal gauge. ticks: [[value, label], ...]. With log, values are spaced by their logarithm.
 * set(value) moves the fill; zones colour it ([[from, tone], ...], tone 'warn' or 'bad').
 */
export function meter({ min, max, log = false, ticks = [], zones = [], label = '' }) {
  const pos = (x) => { const a = log ? Math.log(min) : min, b = log ? Math.log(max) : max, t = log ? Math.log(Math.max(x, 1e-300)) : x; return Math.max(0, Math.min(1, (t - a) / (b - a))); };
  const fill = h('i'), needle = h('em');
  const track = h('div.fp-meter-track', { role: 'meter', 'aria-label': label, 'aria-valuemin': min, 'aria-valuemax': max }, fill, needle,
    ticks.map(([x, l]) => h('u', { style: { left: `${pos(x) * 100}%` } }, h('span', l))));
  const el = h('div.fp-meter', track);
  return {
    el,
    set(x, force) {
      const p = `${(pos(x) * 100).toFixed(2)}%`;
      fill.style.width = p; needle.style.left = p; track.setAttribute('aria-valuenow', String(x));
      let tone = ''; for (const [from, t] of zones) if (x >= from) tone = t;
      if (force != null) tone = force;
      el.className = 'fp-meter' + (tone ? ' ' + tone : '');
    },
  };
}

/**
 * A small chart on a canvas: a line ('line') or bars ('bars') of values, with optional
 * dashed reference lines ([{ y, label }]). Drawn at the canvas's CSS size and pixel ratio.
 */
export function sparkline(canvas, values, { kind = 'line', color = '#8fb8ff', min = 0, max, refs = [], log = false, xLabel = '' } = {}) {
  const d = window.devicePixelRatio || 1, W = Math.round((canvas.clientWidth || 300) * d), H = Math.round((canvas.clientHeight || 64) * d);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, W, H);
  const pad = { l: 4 * d, r: 4 * d, t: 6 * d, b: (xLabel ? 14 : 4) * d };
  const top = Math.max(max ?? -Infinity, ...values, ...refs.map((r) => r.y), min + 1e-9);
  const f = (v) => (log ? Math.log(Math.max(v, 1e-9)) : v), lo = f(log ? Math.max(min, 1e-9) : min), hi = f(top);
  const Y = (v) => H - pad.b - ((f(v) - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = d; ctx.beginPath(); ctx.moveTo(pad.l, H - pad.b + 0.5); ctx.lineTo(W - pad.r, H - pad.b + 0.5); ctx.stroke();
  ctx.font = `${10 * d}px "IBM Plex Mono", ui-monospace, monospace`;
  for (const r of refs) {
    const y = Y(r.y); ctx.strokeStyle = r.color || 'rgba(155,152,180,.6)'; ctx.setLineDash([3 * d, 3 * d]);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke(); ctx.setLineDash([]);
    if (r.label) { ctx.fillStyle = r.color || 'rgba(155,152,180,.9)'; ctx.textAlign = 'right'; ctx.fillText(r.label, W - pad.r - 2 * d, y - 3 * d); ctx.textAlign = 'start'; }
  }
  if (xLabel) { ctx.fillStyle = 'rgba(155,152,180,.8)'; ctx.fillText(xLabel, pad.l, H - 3 * d); }
  if (!values.length) return;
  const w = W - pad.l - pad.r;
  if (kind === 'bars') {
    const n = values.length, slot = Math.min(w / n, 40 * d), bw = Math.max(2 * d, slot * 0.7);
    values.forEach((v, i) => { const y = Y(v); ctx.fillStyle = i === n - 1 ? color : color + 'aa'; ctx.fillRect(pad.l + i * slot + (slot - bw) / 2, y, bw, H - pad.b - y); });
  } else {
    const n = values.length, X = (i) => pad.l + (n < 2 ? w : (i / (n - 1)) * w);
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b); grad.addColorStop(0, color + '55'); grad.addColorStop(1, color + '00');
    ctx.beginPath(); values.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
    ctx.lineTo(X(n - 1), H - pad.b); ctx.lineTo(X(0), H - pad.b); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.6 * d; ctx.beginPath(); values.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)))); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X(n - 1), Y(values[n - 1]), 3 * d, 0, 7); ctx.fill();
  }
}
