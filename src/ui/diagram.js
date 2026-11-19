// Spacetime diagram in ingoing Eddington–Finkelstein coordinates, drawn with time running to the right
// and distance from the centre running up. Time t̃ = v − r. Light falling inward runs down-right at 45°
// (when the scales are equal). Light aimed outward bends to run along the horizon, and inside it also
// falls toward r = 0. Small light cones show where light can go from each point.
//
// The window scrolls like a strip chart, keeping "now" in view, with at most a 2:1 squash of time.

const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const SING = 'singularity: the end of every path inside', HOR = 'horizon: no way back below this';

export class SpacetimeDiagram {
  constructor(canvas, infall) {
    this.canvas = canvas; this.f = infall;
    this.tau = 0; this.S = 0; this.signals = []; this.rescues = []; this.showDeadline = false; this.rMax = infall.R0 + 1.5;
    // what to call the two worldlines; a faller name also labels its dot
    this.names = { station: 'station', faller: '' };
  }

  reset() { this.tau = 0; this.S = 0; this.signals = []; this.rescues = []; }

  _setup() {
    const c = this.canvas;
    let d = window.devicePixelRatio || 1, w, hh;
    if (c.isConnected && c.clientWidth) { w = Math.round(c.clientWidth * d); hh = Math.round(c.clientHeight * d); if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; } }
    else { w = c.width; hh = c.height; d = w / 640; }
    const f = this.f, nowProbe = f.tTilde(f.etaOfTau(Math.min(this.tau, f.tauEnd))), nowStation = f.stationTTilde(this.S);
    const pad = { l: 46 * d, r: 12 * d, t: (16 + (this.top || 0)) * d, b: 30 * d }; // top: room for a title
    const kr = (hh - pad.t - pad.b) / this.rMax;
    const spanEqual = (w - pad.l - pad.r) / kr;
    const start = f.tTilde(0) - 4;
    const now = Math.max(nowProbe, nowStation);
    // fitAll: a finished fall is squeezed to fit whole, from the release to now, instead of scrolling
    const span = Math.max(50, Math.min(130, 2 * spanEqual), this.fitAll ? (now - start) * 1.08 : 0);
    const kt = (w - pad.l - pad.r) / span;
    const t1 = Math.max(start + span, now + 0.12 * span), t0 = t1 - span;
    this.g = { w, h: hh, d, pad, kr, kt, t0, t1, nowStation, nowProbe };
    return c.getContext('2d');
  }

  /** Pixel position of the event at radius r and time T. */
  P(r, T) { const { pad, kr, kt, t0, h } = this.g; return [pad.l + (T - t0) * kt, h - pad.b - r * kr]; }

  draw() {
    const ctx = this._setup(), f = this.f, { w, h, d, pad, t0, t1, nowStation } = this.g;
    ctx.fillStyle = '#080a14'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t - 4 * d, w - pad.l - pad.r, h - pad.t - pad.b + 8 * d); ctx.clip();
    // inside the horizon
    const [, yH] = this.P(2, 0), [, y0] = this.P(0, 0);
    ctx.fillStyle = 'rgba(255,90,80,.08)'; ctx.fillRect(pad.l, yH, w, y0 - yH);
    // labels claim their space as they go; the moving ones (names, 'now', the burn) step aside from each other
    // and from the fixed captions, reserved here first, instead of printing on top of them
    this._placed = [];
    ctx.font = `${10 * d}px ${MONO}`;
    const reserve = (text, x, y) => { this._placed.push([x - 3 * d, y - 10 * d, x + ctx.measureText(text).width + 3 * d, y + 4 * d]); };
    reserve(SING, pad.l + 6 * d, y0 - 8 * d); reserve(HOR, pad.l + 6 * d, yH - 6 * d);
    // light-cone lattice
    const stepT = 10 * Math.ceil((t1 - t0) / 90);
    for (const r of [1, 4, 8, 12, 16, 20]) for (let T = Math.ceil(t0 / stepT) * stepT; T < t1; T += stepT) this._cone(ctx, r, T, 0.22);
    // singularity
    ctx.strokeStyle = 'rgba(255,107,92,.85)'; ctx.lineWidth = 1.5 * d; ctx.beginPath();
    for (let x = pad.l, i = 0; x < w; x += 5 * d, i++) ctx.lineTo(x, y0 - (i % 2 ? 4 : 0) * d);
    ctx.stroke();
    // horizon
    ctx.setLineDash([5 * d, 4 * d]); ctx.strokeStyle = 'rgba(255,180,92,.8)'; ctx.lineWidth = 1.2 * d;
    ctx.beginPath(); ctx.moveTo(pad.l, yH); ctx.lineTo(w, yH); ctx.stroke(); ctx.setLineDash([]);
    // last-chance line: the inward light ray that reaches the probe exactly at the horizon
    if (this.showDeadline) {
      const T = f.tTilde(f.etaH), a = this.P(2, T), b = this.P(f.R0, f.ingoingT(2, T, f.R0));
      ctx.strokeStyle = 'rgba(255,107,92,.9)'; ctx.setLineDash([3 * d, 3 * d]); ctx.lineWidth = 1.5 * d;
      ctx.beginPath(); ctx.moveTo(...b); ctx.lineTo(...a); ctx.stroke(); ctx.setLineDash([]);
      this._label(ctx, 'last chance', b[0] + 6 * d, b[1] + 14 * d, 'rgba(255,107,92,.95)');
    }
    // station worldline
    ctx.strokeStyle = 'rgba(143,184,255,.9)'; ctx.lineWidth = 2 * d; ctx.beginPath();
    ctx.moveTo(...this.P(f.R0, f.tTilde(0))); ctx.lineTo(...this.P(f.R0, nowStation)); ctx.stroke();
    // probe worldline
    // a rescued faller's line stops where the beam met her; a dashed green line climbs back out
    const tauNow = Math.min(this.tau, f.tauEnd, this.cutTau ?? Infinity);
    ctx.strokeStyle = 'rgba(255,200,130,.95)'; ctx.lineWidth = 2 * d; ctx.beginPath();
    const N = 200;
    for (let i = 0; i <= N; i++) { const e = f.etaOfTau((tauNow * i) / N); const p = this.P(f.rOf(e), f.tTilde(e)); i ? ctx.lineTo(...p) : ctx.moveTo(...p); }
    ctx.stroke();
    if (this.cutTau != null && this.tau > this.cutTau) {
      const ec = f.etaOfTau(this.cutTau), rc = f.rOf(ec), tc = f.tTilde(ec);
      const tEnd = Math.min(nowStation, tc + 2.2 * (f.R0 - rc)), rEnd = rc + (f.R0 - rc) * Math.min(1, (tEnd - tc) / (2.2 * (f.R0 - rc)));
      ctx.strokeStyle = 'rgba(127,214,168,.95)'; ctx.setLineDash([5 * d, 4 * d]); ctx.beginPath();
      ctx.moveTo(...this.P(rc, tc)); ctx.lineTo(...this.P(rEnd, tEnd)); ctx.stroke(); ctx.setLineDash([]);
      this._label(ctx, 'engine burn: climbing out', this.P(rc, tc)[0] + 6 * d, this.P(rc, tc)[1] - 8 * d, 'rgba(127,214,168,.95)');
    }
    for (const s of this.signals) this._outgoing(ctx, s, nowStation);
    for (const S of this.rescues) {
      const T0 = f.stationTTilde(S), hit = f.rescueAt(S), rEnd = hit.meets ? hit.r : 0;
      const rNow = Math.max(rEnd, f.R0 - (nowStation - T0));
      ctx.strokeStyle = hit.inside ? 'rgba(255,107,92,.95)' : 'rgba(127,214,168,.95)'; ctx.lineWidth = 1.8 * d; ctx.beginPath();
      ctx.moveTo(...this.P(f.R0, T0)); ctx.lineTo(...this.P(rNow, f.ingoingT(f.R0, T0, rNow))); ctx.stroke();
    }
    const eNow = f.etaOfTau(tauNow);
    if (tauNow < f.tauEnd) this._cone(ctx, f.rOf(eNow), f.tTilde(eNow), 1, 'rgba(255,200,130,', 18);
    this._dot(ctx, f.rOf(eNow), f.tTilde(eNow), '#ffc882');
    this._dot(ctx, f.R0, nowStation, '#8fb8ff');
    const pf = this.P(f.rOf(eNow), f.tTilde(eNow)), ps = this.P(f.R0, nowStation);
    if (this.names.faller && pf[0] > pad.l + 4 * d) this._tag(ctx, this.names.faller, pf[0] + 8 * d, Math.min(pf[1] - 6 * d, y0 - 14 * d), 'rgba(255,200,130,.98)'); // above the singularity line, never clipped under it
    // at the start "now" sits where the station's own label is: say both in one tag instead of two on top of each other
    ctx.font = `${10 * d}px ${MONO}`;
    const stationEnd = pad.l + 6 * d + ctx.measureText(this.names.station).width + 6 * d;
    const nowMerged = !!this.names.station && ps[0] - 30 * d < stationEnd;
    const nowText = this.nowLabel || 'now'; // the game's map stops scrolling once a fall is over: 'later →'
    if (nowMerged) this._tag(ctx, `${this.names.station} · ${nowText}`, pad.l + 6 * d, ps[1] - 8 * d, 'rgba(143,184,255,.98)');
    else this._tag(ctx, nowText, ps[0] - (this.nowLabel ? 52 : 30) * d, ps[1] - 8 * d, 'rgba(143,184,255,.98)');
    ctx.restore();
    // the falling line has scrolled out of the window: say where it went
    if (pf[0] < pad.l) this._label(ctx, `◂ ${this.names.faller || 'the gold line'}: earlier, off the left edge`, pad.l + 6 * d, pad.t + 10 * d, 'rgba(255,200,130,.95)');
    // axes and labels
    ctx.font = `${10 * d}px ${MONO}`;
    for (const [r, lab] of [[0, 'centre'], [2, '1 rₛ'], [10, '5 rₛ'], [f.R0, `${f.R0 / 2} rₛ`]]) { ctx.fillStyle = 'rgba(155,152,180,.9)'; ctx.fillText(lab, 4 * d, this.P(r, 0)[1] + 3 * d); }
    ctx.fillStyle = 'rgba(155,152,180,.9)';
    ctx.textAlign = 'right'; ctx.fillText('later →', w - pad.r, h - 10 * d); ctx.textAlign = 'start';
    ctx.fillText(`time → (${(t1 - t0).toFixed(0)} M across) · up: distance from centre`, pad.l, h - 10 * d);
    this._label(ctx, SING, pad.l + 6 * d, y0 - 8 * d, 'rgba(255,107,92,.95)', true);
    this._label(ctx, HOR, pad.l + 6 * d, yH - 6 * d, 'rgba(255,180,92,.95)', true);
    if (!nowMerged) this._label(ctx, this.names.station, pad.l + 6 * d, this.P(f.R0, 0)[1] - 6 * d, 'rgba(143,184,255,.95)');
  }

  _outgoing(ctx, s, nowStation) {
    const f = this.f, d = this.g.d, e = f.etaOfTau(s.tau), re = f.rOf(e), Te = f.tTilde(e);
    const pts = [];
    if (re > 2) {
      const a = Math.log(re - 2), b = Math.log(f.R0 - 2);
      for (let i = 0; i <= 160; i++) {
        const r = 2 + Math.exp(a + ((b - a) * i) / 160), T = f.outgoingT(re, Te, r);
        if (T > nowStation) { pts.push(null); break; } pts.push([r, T]);
      }
    } else {
      for (let i = 0; i <= 50; i++) { const r = re * (1 - i / 50), T = f.outgoingT(re, Te, Math.max(r, 1e-6)); if (T > nowStation) break; pts.push([r, T]); }
    }
    ctx.strokeStyle = s.color || (re > 2 ? 'rgba(127,214,168,.9)' : 'rgba(255,107,92,.9)'); ctx.lineWidth = 1.3 * d; ctx.beginPath();
    pts.filter(Boolean).forEach(([r, T], i) => (i ? ctx.lineTo(...this.P(r, T)) : ctx.moveTo(...this.P(r, T))));
    ctx.stroke();
  }

  _cone(ctx, r, T, alpha, base = 'rgba(200,200,230,', len = 12) {
    if (r <= 0.05) return;
    const d = this.g.d, L = len * d, o = this.P(r, T);
    const dir = (dr, dT) => { const p = this.P(r + dr, T + dT), x = p[0] - o[0], y = p[1] - o[1], l = Math.hypot(x, y) || 1; return [o[0] + x / l * L, o[1] + y / l * L]; };
    const slope = (r + 2) / (r - 2); // dt̃/dr along outgoing light
    const inward = dir(-0.05, 0.05);
    const outward = r > 2 ? dir(0.05 / slope, 0.05) : dir(0.05 / slope, 0.05); // inside, slope < 0 so dr < 0 as t̃ grows
    ctx.fillStyle = base + alpha * 0.3 + ')'; ctx.strokeStyle = base + alpha + ')'; ctx.lineWidth = d;
    ctx.beginPath(); ctx.moveTo(...inward); ctx.lineTo(...o); ctx.lineTo(...outward); ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  _dot(ctx, r, T, color) { const d = this.g.d; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(...this.P(r, T), 4.5 * d, 0, 7); ctx.fill(); }
  /** A label on a dark plate, for names that sit on top of busy lines. */
  _tag(ctx, text, x, y, color) {
    const d = this.g.d; ctx.font = `500 ${10.5 * d}px ${MONO}`; const tw = ctx.measureText(text).width;
    x = Math.min(x, this.g.w - this.g.pad.r - tw - 4 * d);
    y = this._fit(x, y, tw);
    ctx.fillStyle = 'rgba(8,10,20,.82)'; ctx.fillRect(x - 3 * d, y - 10 * d, tw + 6 * d, 14 * d);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  _label(ctx, text, x, y, color, fixed = false) {
    ctx.fillStyle = color; ctx.font = `${10 * this.g.d}px ${MONO}`;
    if (!fixed) y = this._fit(x, y, ctx.measureText(text).width);
    ctx.fillText(text, x, y);
  }
  /** The nearest height at or around y where a label of width tw at x overlaps nothing placed so far. */
  _fit(x, y, tw) {
    const d = this.g.d, placed = this._placed || (this._placed = []);
    const box = (yy) => [x - 3 * d, yy - 10 * d, x + tw + 3 * d, yy + 4 * d];
    for (const k of [0, -14, 14, -28, 28, -42, 42]) {
      const r = box(y + k * d);
      if (!placed.some((p) => r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1])) { placed.push(r); return y + k * d; }
    }
    placed.push(box(y)); return y;
  }
}
