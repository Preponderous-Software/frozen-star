// Spacetime diagram in ingoing Eddington–Finkelstein coordinates, drawn with time running to the right
// and distance from the centre running up. Time t̃ = v − r. Light falling inward runs down-right at 45°
// (when the scales are equal). Light aimed outward bends to run along the horizon, and inside it also
// falls toward r = 0. Small light cones show where light can go from each point.
//
// The window scrolls like a strip chart, keeping "now" in view, with at most a 2:1 squash of time.

const MONO = '"IBM Plex Mono", ui-monospace, monospace';

export class SpacetimeDiagram {
  constructor(canvas, infall) {
    this.canvas = canvas; this.f = infall;
    this.tau = 0; this.S = 0; this.signals = []; this.rescues = []; this.showDeadline = false; this.rMax = infall.R0 + 1.5;
  }

  reset() { this.tau = 0; this.S = 0; this.signals = []; this.rescues = []; }

  _setup() {
    const c = this.canvas;
    let d = window.devicePixelRatio || 1, w, hh;
    if (c.isConnected && c.clientWidth) { w = Math.round(c.clientWidth * d); hh = Math.round(c.clientHeight * d); if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; } }
    else { w = c.width; hh = c.height; d = w / 640; }
    const f = this.f, nowProbe = f.tTilde(f.etaOfTau(Math.min(this.tau, f.tauEnd))), nowStation = f.stationTTilde(this.S);
    const pad = { l: 46 * d, r: 12 * d, t: 16 * d, b: 30 * d };
    const kr = (hh - pad.t - pad.b) / this.rMax;
    const spanEqual = (w - pad.l - pad.r) / kr;
    const span = Math.max(50, Math.min(130, 2 * spanEqual));
    const kt = (w - pad.l - pad.r) / span;
    const start = f.tTilde(0) - 4;
    const now = Math.max(nowProbe, nowStation);
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
    const tauNow = Math.min(this.tau, f.tauEnd);
    ctx.strokeStyle = 'rgba(255,200,130,.95)'; ctx.lineWidth = 2 * d; ctx.beginPath();
    const N = 200;
    for (let i = 0; i <= N; i++) { const e = f.etaOfTau((tauNow * i) / N); const p = this.P(f.rOf(e), f.tTilde(e)); i ? ctx.lineTo(...p) : ctx.moveTo(...p); }
    ctx.stroke();
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
    ctx.restore();
    // axes and labels
    ctx.font = `${10 * d}px ${MONO}`;
    for (const [r, lab] of [[0, 'r = 0'], [2, '1 rₛ'], [10, '5 rₛ'], [f.R0, `${f.R0 / 2} rₛ`]]) { ctx.fillStyle = 'rgba(155,152,180,.9)'; ctx.fillText(lab, 4 * d, this.P(r, 0)[1] + 3 * d); }
    ctx.fillStyle = 'rgba(155,152,180,.9)'; ctx.fillText('time →', w - pad.r - 44 * d, h - 10 * d);
    ctx.fillText(`t̃ ${t0.toFixed(0)}–${t1.toFixed(0)} M`, pad.l, h - 10 * d);
    this._label(ctx, 'singularity', pad.l + 6 * d, y0 - 8 * d, 'rgba(255,107,92,.95)');
    this._label(ctx, 'horizon', pad.l + 6 * d, yH - 6 * d, 'rgba(255,180,92,.95)');
    this._label(ctx, 'station', pad.l + 6 * d, this.P(f.R0, 0)[1] - 6 * d, 'rgba(143,184,255,.95)');
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
  _label(ctx, text, x, y, color) { ctx.fillStyle = color; ctx.font = `${10 * this.g.d}px ${MONO}`; ctx.fillText(text, x, y); }
}
