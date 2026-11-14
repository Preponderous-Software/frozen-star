// Side-on 2D view of the hole, the station and the probe. Used by the station and probe panels.

const stars = Array.from({ length: 160 }, (_, i) => {
  const s = Math.sin(i * 12.9898) * 43758.5453; const t = Math.sin(i * 78.233) * 12543.123; const u = Math.sin(i * 39.425) * 2211.77;
  return [s - Math.floor(s), t - Math.floor(t), u - Math.floor(u)];
});

/** Visible-light colour for a wavelength in nm, faded toward the infrared. Returns [r,g,b] 0..1. */
export function wavelengthRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 380) { b = 0.6; r = 0.4; }
  else if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 780) r = 1;
  const f = nm > 700 ? Math.max(0, (780 - nm) / 80) : 1;
  return [r * f, g * f, b * f];
}

export class FieldView {
  constructor(canvas, { R0 = 20 } = {}) { this.canvas = canvas; this.R0 = R0; }

  begin({ inside = false } = {}) {
    const c = this.canvas, d = window.devicePixelRatio || 1;
    const w = Math.round(c.clientWidth * d), hh = Math.round(c.clientHeight * d);
    if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; }
    const ctx = c.getContext('2d');
    this.ctx = ctx; this.d = d; this.w = w; this.h = hh;
    this.cx = w * 0.12; this.cy = hh * 0.52; this.s = (w * 0.8) / this.R0;
    ctx.fillStyle = inside ? '#16070a' : '#04050b'; ctx.fillRect(0, 0, w, hh);
    for (const [x, y, b] of stars) { ctx.fillStyle = `rgba(220,225,255,${0.12 + b * 0.45})`; const z = d * (b > 0.85 ? 1.6 : 1); ctx.fillRect(x * w, y * hh, z, z); }
    return this;
  }

  x(r) { return this.cx + r * this.s; }

  hole({ labels = true } = {}) {
    const { ctx, cx, cy, s, d } = this, R = 2 * s;
    const glow = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 2.4);
    glow.addColorStop(0, 'rgba(255,170,90,.16)'); glow.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 2.4, 0, 7); ctx.fill();
    ctx.setLineDash([4 * d, 5 * d]); ctx.strokeStyle = 'rgba(255,180,92,.3)'; ctx.lineWidth = d;
    ctx.beginPath(); ctx.arc(cx, cy, 3 * s, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,140,80,.6)'; ctx.lineWidth = 1.2 * d; ctx.stroke();
    if (labels) {
      ctx.font = `${10.5 * d}px "IBM Plex Mono", ui-monospace, monospace`; ctx.fillStyle = 'rgba(155,152,180,.85)';
      ctx.fillText('horizon', cx - R * 0.9, cy + R + 15 * d);
    }
    return this;
  }

  station() {
    const { ctx, d, cy } = this, x = this.x(this.R0);
    ctx.strokeStyle = 'rgba(143,184,255,.85)'; ctx.lineWidth = 1.5 * d;
    ctx.beginPath(); ctx.moveTo(x, cy - 14 * d); ctx.lineTo(x, cy + 14 * d); ctx.stroke();
    ctx.fillStyle = 'rgba(143,184,255,.85)'; ctx.fillRect(x - 6 * d, cy - 16 * d, 12 * d, 4 * d); ctx.fillRect(x - 6 * d, cy + 12 * d, 12 * d, 4 * d);
    ctx.font = `${10.5 * d}px "IBM Plex Mono", ui-monospace, monospace`; ctx.fillStyle = 'rgba(155,152,180,.85)';
    ctx.fillText('station', x - 22 * d, cy + 30 * d);
    return this;
  }

  /** Probe as received light: colour by wavelength, brightness by flux. */
  glow(r, { nm = 470, flux = 1 } = {}) {
    const { ctx, d, cy } = this, x = this.x(r), [cr, cg, cb] = wavelengthRGB(nm), a = Math.min(1, flux);
    if (nm <= 780 && a > 2e-4) {
      const rad = (4 + 9 * Math.min(1, a * 3)) * d, g = ctx.createRadialGradient(x, cy, 0, x, cy, rad * 3);
      g.addColorStop(0, `rgba(${cr * 255 | 0},${cg * 255 | 0},${cb * 255 | 0},${Math.max(a, 0.08)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, rad * 3, 0, 7); ctx.fill();
    } else {
      ctx.strokeStyle = `rgba(155,152,180,${Math.max(0.12, Math.min(0.5, a * 1e3))})`; ctx.lineWidth = d; ctx.setLineDash([2 * d, 3 * d]);
      ctx.beginPath(); ctx.arc(x, cy, 7 * d, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
    return this;
  }

  /** Probe as a solid body, stretched by tides. */
  body(r, { stretch = 1, inside = false, color } = {}) {
    const { ctx, d, cy } = this, x = this.x(r);
    ctx.save(); ctx.translate(x, cy); ctx.scale(stretch, 1 / Math.sqrt(stretch));
    ctx.fillStyle = color || (inside ? '#ff8a7a' : '#ffd29a'); ctx.beginPath(); ctx.arc(0, 0, 5.5 * d, 0, 7); ctx.fill(); ctx.restore();
    if (inside) {
      ctx.strokeStyle = 'rgba(255,107,92,.6)'; ctx.lineWidth = 1.4 * d;
      for (const dy of [-14, 0, 14]) {
        const y = cy + dy * d; ctx.beginPath(); ctx.moveTo(x + 20 * d, y); ctx.lineTo(x + 8 * d, y);
        ctx.moveTo(x + 8 * d, y); ctx.lineTo(x + 12 * d, y - 4 * d); ctx.moveTo(x + 8 * d, y); ctx.lineTo(x + 12 * d, y + 4 * d); ctx.stroke();
      }
    }
    return this;
  }

  /** A pulse of light moving between two radii (for messages and rescue beams). */
  pulse(r, color = 'rgba(127,214,168,.95)') {
    const { ctx, d, cy } = this, x = this.x(r);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, cy - 22 * d, 3 * d, 0, 7); ctx.fill();
    return this;
  }
}
