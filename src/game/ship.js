// Research vessel Tern, built from boxes. Ship coordinates: metres, Y up, the nose at −Z.
//
//   Bridge     x −3.4…3.4, z −13…−5   big window forward, side windows, three consoles, two wall screens
//   Corridor   x −1…1,     z −5…8     windows to port, doors to the lab and your quarters
//   Quarters   x 1…5,      z 2…6.5    bunk, desk, a porthole facing the hole
//   Lab        x −5…−1,    z −3.5…1.5 the archive terminal
import * as THREE from 'three';

const T = 0.12; // wall thickness

function panelTexture(base, seam, w = 256, h = 256, rows = 2, cols = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.strokeStyle = seam; g.lineWidth = 3;
  for (let i = 0; i <= rows; i++) { g.beginPath(); g.moveTo(0, (i * h) / rows); g.lineTo(w, (i * h) / rows); g.stroke(); }
  for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo((i * w) / cols, 0); g.lineTo((i * w) / cols, h); g.stroke(); }
  // a few fasteners
  g.fillStyle = seam;
  for (const [x, y] of [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function labelTexture(text, { w = 512, h = 128, fg = '#ece8f4', bg = 'rgba(0,0,0,0)', font = '600 64px "Bricolage Grotesque", system-ui, sans-serif', sub } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = font; g.textBaseline = 'middle';
  g.fillText(text, 24, sub ? h * 0.38 : h / 2);
  if (sub) { g.font = '400 30px "IBM Plex Mono", monospace'; g.globalAlpha = 0.7; g.fillText(sub, 26, h * 0.76); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- palette ----
// Structure is cool off-white with deep-navy trim; amber marks doors and safety; each room has its own
// accent so a sign or a floor marking says where it leads at a glance.
const PAL = { bridge: '#8fb8ff', corridor: '#ffb45c', lab: '#5ed6c0', quarters: '#ff9a6b', eng: '#ff5b4f', plate: '#1d2132', ink: '#2a3350', paper: '#f4f2ec' };
const MONO = '"IBM Plex Mono", ui-monospace, monospace', SANS = '"Bricolage Grotesque", system-ui, sans-serif', HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';

/** A canvas texture drawn once at load. */
function canvasTex(w, h, draw, { repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function grime(g, w, h, seed, n, dark = '40,44,60') {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${r() < 0.55 ? dark : '255,255,255'},${0.006 + r() * 0.012})`; g.fillRect(r() * w, r() * h, 4 + r() * 24, 4 + r() * 24); }
}
/** Bevelled seams: a shadow line and a highlight just under it, so panels read as pressed metal. */
function seams(g, w, h, rows, cols, dark, light) {
  for (let i = 0; i < rows; i++) { const y = (i * h) / rows; g.fillStyle = dark; g.fillRect(0, y, w, 3); g.fillStyle = light; g.fillRect(0, y + 3, w, 2); }
  for (let i = 0; i < cols; i++) { const x = (i * w) / cols; g.fillStyle = dark; g.fillRect(x, 0, 3, h); g.fillStyle = light; g.fillRect(x + 3, 0, 2, h); }
}
function wallTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e6e8ee'; g.fillRect(0, 0, w, h);
    grime(g, w, h, 7, 260);
    seams(g, w, h, 2, 1, '#b3b8c6', 'rgba(255,255,255,0.75)');
    g.fillStyle = '#a4a9b8';
    for (const y of [12, h / 2 - 9, h / 2 + 12, h - 9]) for (const x of [13, w - 11]) { g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); }
  }, { repeat: true });
}
function floorTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a3f50'; g.fillRect(0, 0, w, h);
    grime(g, w, h, 11, 160, '10,12,20');
    g.fillStyle = 'rgba(255,255,255,0.05)'; // anti-slip studs
    for (let y = 16; y < h; y += 16) for (let x = 16 + ((y / 16) % 2) * 8; x < w; x += 16) g.fillRect(x - 2, y - 1, 4, 2);
    seams(g, w, h, 1, 1, '#262a37', 'rgba(255,255,255,0.08)');
    g.fillStyle = '#2a2e3c'; for (const [x, y] of [[10, 10], [w - 8, 10], [10, h - 8], [w - 8, h - 8]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
  }, { repeat: true });
}
function ceilTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d4d7df'; g.fillRect(0, 0, w, h);
    grime(g, w, h, 3, 120);
    g.fillStyle = 'rgba(70,76,96,0.28)'; // a perforated acoustic panel in one of the two bays
    for (let y = 40; y < h - 36; y += 9) for (let x = w / 2 + 30; x < w - 26; x += 9) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
    seams(g, w, h, 1, 2, '#aeb3c0', 'rgba(255,255,255,0.6)');
  }, { repeat: true });
}
/** A door or room plate: dark ground, an accent bar in the room's colour, a name and a small line. */
function plateTexture(text, sub, accent = PAL.corridor) {
  return canvasTex(512, 128, (g, w, h) => {
    roundRect(g, 2, 2, w - 4, h - 4, 14); g.fillStyle = PAL.plate; g.fill();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.12)'; g.stroke();
    g.fillStyle = accent; g.fillRect(16, 18, 12, h - 36);
    g.fillStyle = '#eef0f6'; g.font = `600 ${sub ? 54 : 62}px ${SANS}`; g.textBaseline = 'middle';
    g.fillText(text, 46, sub ? h * 0.38 : h / 2, w - 60);
    if (sub) { g.font = `500 26px ${MONO}`; g.fillStyle = accent; g.fillText(sub.toUpperCase(), 48, h * 0.76, w - 64); }
  });
}
/** A painted floor marking: chevrons pointing up the texture, and a stencilled word. */
function floorArrowTexture(word, color) {
  return canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = color; g.globalAlpha = 0.85;
    for (let k = 0; k < 2; k++) {
      const y = 30 + k * 52;
      g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 + 70, y + 46); g.lineTo(w / 2 + 48, y + 46); g.lineTo(w / 2, y + 16); g.lineTo(w / 2 - 48, y + 46); g.lineTo(w / 2 - 70, y + 46); g.closePath(); g.fill();
    }
    g.font = `700 50px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, w / 2, 200, w - 20);
  });
}
function hazardTexture(a = '#ffb45c', b = '#1a1d28', word) {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = b; g.fillRect(0, 0, w, h);
    g.fillStyle = a; for (let x = -h; x < w + h; x += 64) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 32, h); g.lineTo(x + 32 + h, 0); g.lineTo(x + h, 0); g.closePath(); g.fill(); }
    if (word) { g.fillStyle = b; g.fillRect(w / 2 - 150, h / 2 - 30, 300, 60); g.fillStyle = a; g.font = `700 40px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, w / 2, h / 2 + 2); }
    g.fillStyle = 'rgba(0,0,0,0.25)'; grime(g, w, h, 5, 60, '0,0,0');
  });
}
function stencilTexture(text, sub, color = 'rgba(230,234,244,0.7)') {
  return canvasTex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 60px ${MONO}`; g.fillText(text, w / 2, sub ? 46 : h / 2, w - 20);
    if (sub) { g.font = `500 28px ${MONO}`; g.fillText(sub, w / 2, 100, w - 20); }
  });
}
/** A soft dark blob: contact shadows under furniture and along the foot of every wall, baked instead of lit. */
function blobTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = Math.max(0, Math.abs(x - w / 2 + 0.5) / (w / 2) - 0.45) / 0.55, dy = Math.max(0, Math.abs(y - h / 2 + 0.5) / (h / 2) - 0.45) / 0.55;
      const d = Math.min(1, Math.hypot(dx, dy)), a = (1 - d) ** 2 * 0.55;
      img.data[(y * w + x) * 4 + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
  });
}
/** Write a line where `_x` makes x a subscript and `^x` a superscript (one token each). */
function mathText(g, s, x, y, size) {
  for (const tok of s.split(/(\s+|[_^][^\s_^]+)/).filter(Boolean)) {
    if (tok[0] === '_' || tok[0] === '^') {
      const f = g.font; g.font = f.replace(/\d+px/, `${Math.round(size * 0.62)}px`);
      g.fillText(tok.slice(1), x, y + (tok[0] === '_' ? size * 0.28 : -size * 0.38)); x += g.measureText(tok.slice(1)).width; g.font = f;
    } else { g.fillText(tok, x, y); x += g.measureText(tok).width; }
  }
  return x;
}
function whiteboardTexture() {
  return canvasTex(1024, 480, (g, w, h) => {
    g.fillStyle = '#f6f7f4'; g.fillRect(0, 0, w, h);
    const r = rng(19); g.strokeStyle = 'rgba(120,130,160,0.08)'; g.lineWidth = 22; // old, half-erased writing
    for (let i = 0; i < 7; i++) { g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.bezierCurveTo(x + 90, y - 30, x + 150, y + 40, x + 260 * r(), y + 10); g.stroke(); }
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#1f3c88'; g.font = `600 64px ${HAND}`;
    mathText(g, 'G_μν = (8πG / c^4) T_μν', 40, 92, 64);
    g.fillStyle = '#3c4458'; g.font = `400 26px ${HAND}`;
    g.fillText('matter tells spacetime how to curve;', 46, 136); g.fillText('spacetime tells matter how to move', 46, 166);
    g.fillStyle = '#1b1b1b'; g.font = `600 44px ${HAND}`;
    mathText(g, 'r_s = 2GM / c^2', 46, 246, 44);
    g.font = `400 28px ${HAND}`; g.fillStyle = '#3c4458'; g.fillText('Erebus: 1.2 × 10⁵ suns → rₛ = 354,000 km', 46, 286);
    g.fillStyle = '#1f3c88'; g.font = `600 44px ${HAND}`;
    mathText(g, 'dτ/dt = √(1 − r_s/r)', 46, 360, 44);
    g.fillStyle = '#b3261e'; g.font = `600 32px ${HAND}`;
    g.fillText('at 10 rₛ: 0.949  → 1 h here ≈ 1 h 03 min at the relay', 46, 410);
    g.beginPath(); g.strokeStyle = '#b3261e'; g.lineWidth = 3; g.moveTo(46, 422); g.lineTo(760, 426); g.stroke();
    // the hole, to scale: horizon, photon sphere, and the shadow it casts
    const cx = 830, cy = 190, s = 34;
    g.fillStyle = '#111'; g.beginPath(); g.arc(cx, cy, s, 0, 7); g.fill();
    g.setLineDash([10, 9]); g.strokeStyle = '#1f3c88'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, s * 1.5, 0, 7); g.stroke();
    g.setLineDash([3, 7]); g.strokeStyle = '#b3261e'; g.beginPath(); g.arc(cx, cy, s * 2.6, 0, 7); g.stroke(); g.setLineDash([]);
    g.font = `400 22px ${HAND}`; g.fillStyle = '#1b1b1b';
    g.fillText('horizon', cx - 40, cy + s + 26); g.fillStyle = '#1f3c88'; g.fillText('photon sphere 1.5 rₛ', cx - 100, cy - s * 1.5 - 10);
    g.fillStyle = '#b3261e'; g.fillText('shadow ≈ 2.6 rₛ', cx - 70, cy + s * 2.6 + 26);
    g.strokeStyle = '#1b1b1b'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + s * 2.7, cy - 70); g.lineTo(w - 24, cy - 70); g.lineTo(w - 38, cy - 80); g.moveTo(w - 24, cy - 70); g.lineTo(w - 38, cy - 60); g.stroke();
    g.fillStyle = '#1b1b1b'; g.fillText('us, 10 rₛ', w - 120, cy - 82);
    g.fillStyle = '#2f7d4f'; g.font = `600 26px ${HAND}`; g.fillText('K-1: ~58 s to the horizon (its own clock)', 600, 456);
  });
}
/** Light cones near the hole, in coordinates that stay finite at the horizon (ingoing Eddington–Finkelstein).
 *  Ingoing light always runs at 45°; outgoing light tips over: slope dt̃/dr = (1 + rₛ/r)/(1 − rₛ/r). */
function lightConeTexture() {
  return canvasTex(512, 560, (g, w, h) => {
    g.fillStyle = PAL.paper; g.fillRect(0, 0, w, h);
    g.fillStyle = PAL.plate; g.fillRect(0, 0, w, 86);
    g.fillStyle = '#eef0f6'; g.font = `600 36px ${SANS}`; g.fillText('Light cones near a black hole', 22, 52, w - 40);
    g.fillStyle = PAL.lab; g.font = `500 18px ${MONO}`; g.fillText('WHY NOTHING CLIMBS OUT', 24, 76);
    const x0 = 40, x1 = w - 30, base = 360, px = (r) => x0 + ((r - 0) / 6) * (x1 - x0); // r from 0 to 6 rₛ
    g.strokeStyle = '#1b1f2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, base + 30); g.lineTo(x1, base + 30); g.stroke();
    g.fillStyle = '#111'; g.fillRect(x0, 160, px(1) - x0, base + 30 - 160); // inside the horizon
    g.fillStyle = '#eef0f6'; g.font = `500 16px ${MONO}`; g.fillText('inside', x0 + 4, 182);
    g.setLineDash([6, 6]); g.strokeStyle = '#b3261e'; g.beginPath(); g.moveTo(px(1), 160); g.lineTo(px(1), base + 30); g.stroke(); g.setLineDash([]);
    const L = 96;
    [0.5, 1, 2, 3.5, 5.5].forEach((r, i) => {
      const cx = px(r), cy = base - (i % 2) * 90; // staggered in time so the cones do not overlap
      const k = (1 + 1 / r) / (1 - 1 / r); // dt̃/dr for outgoing light, rₛ = 1
      // ingoing ray: up and to the left at 45°; outgoing: dt̃ = k dr (vertical at the horizon, leaning in inside)
      const inX = -L / Math.SQRT2, inY = -L / Math.SQRT2;
      let outX, outY;
      if (!isFinite(k) || Math.abs(1 - 1 / r) < 1e-6) { outX = 0; outY = -L; }
      else { const n = Math.hypot(1, k); outX = (k > 0 ? 1 : -1) * L / n; outY = -L * Math.abs(k) / n; }
      g.fillStyle = r < 1 ? 'rgba(255,154,107,0.55)' : 'rgba(94,214,192,0.45)';
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + inX, cy + inY); g.lineTo(cx + outX, cy + outY); g.closePath(); g.fill();
      g.strokeStyle = r < 1 ? '#ff9a6b' : '#1b1f2e'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx + inX, cy + inY); g.lineTo(cx, cy); g.lineTo(cx + outX, cy + outY); g.stroke();
      g.fillStyle = r < 1 ? '#ffd0b8' : '#1b1f2e'; g.font = `500 16px ${MONO}`; g.textAlign = 'center'; g.fillText(r === 1 ? 'horizon' : `${r} rₛ`, cx, base + (i % 2 ? 52 : 74)); g.textAlign = 'left';
    });
    g.fillStyle = '#2a3350'; g.font = `400 19px ${SANS}`;
    const lines = ['Far out, a flash spreads both ways.', 'Closer in, the outward edge leans up:', 'light climbs out ever more slowly.', 'At the horizon it stands still. Inside,', 'even "outward" light falls inward.'];
    lines.forEach((t, i) => g.fillText(t, 24, 456 + i * 22, w - 40));
  });
}
/** An expedition patch: the hole, its ring, and the ship's name. */
function patchTexture() {
  return canvasTex(384, 512, (g, w, h) => {
    g.fillStyle = '#141826'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = 200;
    g.fillStyle = '#2a3350'; g.beginPath(); g.arc(cx, cy, 150, 0, 7); g.fill();
    g.lineWidth = 10; g.strokeStyle = PAL.corridor; g.stroke();
    const r = rng(23); g.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { const a = r() * 7, d = r() * 140; g.globalAlpha = 0.3 + r() * 0.7; g.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2, 2); } g.globalAlpha = 1;
    const ring = g.createRadialGradient(cx, cy, 40, cx, cy, 78); ring.addColorStop(0, 'rgba(255,200,120,0)'); ring.addColorStop(0.62, 'rgba(255,190,110,0.95)'); ring.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = ring; g.beginPath(); g.ellipse(cx, cy, 120, 34, -0.18, 0, 7); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, 44, 0, 7); g.fill();
    g.fillStyle = ring; g.beginPath(); g.ellipse(cx, cy, 120, 34, -0.18, Math.PI, 7); g.fill(); // the near side of the disk in front of the shadow
    g.fillStyle = '#eef0f6'; g.textAlign = 'center'; g.font = `700 52px ${SANS}`; g.fillText('TERN', cx, 410);
    g.fillStyle = PAL.corridor; g.font = `500 22px ${MONO}`; g.fillText('EREBUS SURVEY · 10 Rs', cx, 446);
    g.fillStyle = 'rgba(238,240,246,0.5)'; g.font = `400 18px ${MONO}`; g.fillText('relativist · pilot · WREN', cx, 478);
  });
}
/** A travel poster for a place twenty-six thousand light-years away. */
function posterTexture() {
  return canvasTex(384, 512, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0d1430'); sky.addColorStop(1, '#2b2350'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const r = rng(41); g.fillStyle = '#fff'; for (let i = 0; i < 90; i++) { g.globalAlpha = 0.2 + r() * 0.6; g.fillRect(r() * w, r() * 300, 2, 2); } g.globalAlpha = 1;
    const cx = w / 2, cy = 210, R = 110;
    const sea = g.createRadialGradient(cx - 40, cy - 40, 10, cx, cy, R); sea.addColorStop(0, '#6fb6ff'); sea.addColorStop(1, '#1a4fa0'); g.fillStyle = sea; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    g.fillStyle = '#4f9a5a'; for (const [x, y, rx, ry] of [[-30, -30, 44, 30], [40, 20, 30, 46], [-50, 50, 26, 18]]) { g.beginPath(); g.ellipse(cx + x, cy + y, rx, ry, 0.4, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(cx + 10, cy - 70, 60, 12, 0.2, 0, 7); g.fill();
    g.fillStyle = '#f6d38a'; g.textAlign = 'center'; g.font = `700 64px ${SANS}`; g.fillText('EARTH', cx, 400);
    g.fillStyle = '#eef0f6'; g.font = `400 22px ${SANS}`; g.fillText('wish you were here', cx, 436);
    g.fillStyle = 'rgba(238,240,246,0.55)'; g.font = `500 16px ${MONO}`; g.fillText('26,000 LIGHT-YEARS · NO RETURN FARES', cx, 476);
    g.lineWidth = 12; g.strokeStyle = '#f4f2ec'; g.strokeRect(0, 0, w, h);
  });
}
/** The deck plan opposite the lab door. It hangs on the starboard wall facing port, so it is drawn as the
 *  viewer stands: the bow (−z) to the right, port (−x) at the top. */
function deckPlanTexture() {
  return canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = PAL.plate; g.fillRect(0, 0, w, h);
    g.fillStyle = '#eef0f6'; g.font = `600 30px ${SANS}`; g.fillText('TERN · DECK 1', 20, 40);
    g.fillStyle = 'rgba(238,240,246,0.55)'; g.font = `500 15px ${MONO}`; g.textAlign = 'right'; g.fillText('BOW ▶ toward Erebus', w - 20, 40); g.textAlign = 'left';
    const S = 20, X = (z) => 492 - (z + 13) * S, Y = (x) => 190 + x * S;
    const rect = (x0, z0, x1, z1, col, name, sub) => {
      const L = X(z1), T = Y(x0), W = X(z0) - X(z1), H = Y(x1) - Y(x0);
      g.fillStyle = col + '30'; g.fillRect(L, T, W, H); g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(L, T, W, H);
      if (name) { g.fillStyle = col; g.font = `600 16px ${MONO}`; g.fillText(name, L + 7, T + 21); }
      if (sub) { g.fillStyle = 'rgba(238,240,246,0.6)'; g.font = `500 12px ${MONO}`; g.fillText(sub, L + 7, T + 38); }
    };
    rect(-3.4, -13, 3.4, -5, PAL.bridge, 'BRIDGE', 'helm · probe · comms');
    rect(-1, -5, 1, 8, PAL.corridor, '');
    rect(-5, -3.5, -1, 1.5, PAL.lab, 'LAB', 'archive');
    rect(1, 2, 5, 6.5, PAL.quarters, 'QUARTERS');
    rect(-1.6, 8, 1.6, 10.3, PAL.eng, 'ENG', 'sealed');
    g.fillStyle = 'rgba(238,240,246,0.6)'; g.font = `500 13px ${MONO}`; g.fillText('CORRIDOR', X(6.8), Y(0) + 5);
    // you are here: on the starboard wall at z = 0
    const yx = X(0), yy = Y(0.75);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(yx, yy, 7, 0, 7); g.fill(); g.strokeStyle = PAL.corridor; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#fff'; g.font = `700 15px ${MONO}`; g.textAlign = 'center'; g.fillText('YOU ARE HERE', yx, Y(5) + 6);
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(yx, yy + 8); g.lineTo(yx, Y(5) - 10); g.stroke(); g.textAlign = 'left';
    g.fillStyle = 'rgba(238,240,246,0.45)'; g.font = `500 13px ${MONO}`; g.fillText('PORT ▲', 20, 70); g.fillText('STARBOARD ▼', 20, h - 16);
  });
}
function clipboardTexture() {
  return canvasTex(256, 352, (g, w, h) => {
    g.fillStyle = '#8a6a48'; g.fillRect(0, 0, w, h);
    g.fillStyle = PAL.paper; g.fillRect(14, 30, w - 28, h - 44);
    g.fillStyle = '#9aa1b3'; roundRect(g, w / 2 - 50, 8, 100, 34, 6); g.fill();
    g.fillStyle = '#1b1f2e'; g.font = `700 20px ${MONO}`; g.fillText('MAINTENANCE LOG', 26, 70);
    g.font = `400 14px ${HAND}`; g.fillStyle = '#2a3350';
    const rows = ['field gen: hot, steady', 'hull flex: in limits', 'bay 1: K-1 loaded', 'bay 2: Orpheus loaded', 'scrubbers: swapped', 'ENGINEERING SEALED', '  for the survey. WREN'];
    rows.forEach((t, i) => { g.fillStyle = i >= 5 ? '#b3261e' : '#2a3350'; g.fillText(t, 26, 104 + i * 30); g.fillStyle = 'rgba(42,51,80,0.15)'; g.fillRect(24, 110 + i * 30, w - 48, 1); });
  });
}
/** Equipment fronts: switches, labels and status lamps. Returns [colour map, glow map] so the lamps glow without a light. */
function equipmentTextures(kind) {
  const r = rng(kind === 'rack' ? 31 : 37), lamps = [];
  const map = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2b3044'; g.fillRect(0, 0, w, h);
    grime(g, w, h, 9, 40, '0,0,0');
    if (kind === 'rack') {
      for (let i = 0; i < 7; i++) {
        const y = 12 + i * 34; g.fillStyle = i % 3 === 0 ? '#3a4058' : '#33384c'; g.fillRect(10, y, w - 20, 28); g.fillStyle = '#1b1f2e'; g.fillRect(10, y + 26, w - 20, 2);
        for (let k = 0; k < 6; k++) { g.fillStyle = '#20243a'; g.fillRect(150 + k * 14, y + 8, 8, 12); }
        for (let k = 0; k < 4; k++) lamps.push([24 + k * 12, y + 14, r() < 0.8 ? PAL.lab : PAL.corridor]);
      }
    } else { // breaker / life-support panel
      g.fillStyle = 'rgba(238,240,246,0.8)'; g.font = `600 16px ${MONO}`; g.fillText('LIFE SUPPORT · BUS A', 14, 24);
      for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) {
        const x = 16 + k * 38, y = 46 + row * 66;
        g.fillStyle = '#1b1f2e'; g.fillRect(x, y, 28, 40); g.fillStyle = '#9aa1b3'; g.fillRect(x + 8, y + (r() < 0.85 ? 6 : 22), 12, 12);
        g.fillStyle = 'rgba(238,240,246,0.55)'; g.font = `500 9px ${MONO}`; g.fillText(['O2', 'CO2', 'H2O', 'HEAT', 'LUX', 'FAN'][k] + (row + 1), x, y + 52);
        lamps.push([x + 14, y - 5, row === 2 && k === 4 ? PAL.corridor : '#7fd6a8']);
      }
    }
    for (const [x, y, c] of lamps) { g.fillStyle = c; g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); }
  });
  const glow = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (const [x, y, c] of lamps) { g.fillStyle = c; g.beginPath(); g.arc(x, y, 3.6, 0, 7); g.fill(); } });
  return [map, glow];
}
function cabinetTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c2c7d3'; g.fillRect(0, 0, w, h); grime(g, w, h, 13, 70);
    g.fillStyle = '#8d93a3'; g.fillRect(w / 2 - 2, 8, 4, h - 16); g.strokeStyle = '#8d93a3'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
    for (const x of [w / 2 - 24, w / 2 + 14]) { g.fillStyle = '#5b6274'; g.fillRect(x, h / 2 - 20, 10, 40); }
    g.font = `600 17px ${MONO}`; g.fillStyle = PAL.plate;
    g.fillText('SURVEY', 22, 40); g.fillText('STORES', 22, 60); g.fillText('O2 · MASKS', w / 2 + 14, 40); g.fillStyle = PAL.eng; g.fillRect(w / 2 + 14, 50, 70, 6);
  });
}
function lockerTexture() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#d9dde6'; g.fillRect(0, 0, w, h); g.fillStyle = PAL.eng; g.fillRect(0, 0, w, 34);
    g.fillStyle = '#fff'; g.font = `700 17px ${MONO}`; g.textAlign = 'center'; g.fillText('EMERGENCY', w / 2, 23);
    g.fillStyle = PAL.plate; g.font = `600 15px ${MONO}`; g.fillText('O2 MASKS', w / 2, 70); g.fillText('FIRST AID', w / 2, 96); g.fillText('SUIT PATCH', w / 2, 122);
    g.strokeStyle = '#8d93a3'; g.lineWidth = 3; g.strokeRect(6, 40, w - 12, h - 48); g.fillStyle = '#5b6274'; g.fillRect(w - 26, 150, 8, 40);
    g.fillStyle = PAL.eng; g.font = `700 13px ${MONO}`; g.fillText('PULL', w / 2 - 10, 230);
  });
}
function consoleKeysTexture(accent) {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#20243a'; g.fillRect(0, 0, w, h);
    const r = rng(accent.length * 7 + 3);
    for (let i = 0; i < 2; i++) for (let k = 0; k < 14; k++) { g.fillStyle = r() < 0.15 ? accent : '#3a4058'; roundRect(g, 18 + k * 34, 18 + i * 46, 26, 34, 4); g.fill(); }
    g.fillStyle = '#11131d'; g.fillRect(w - 90, 20, 70, 80); g.fillStyle = '#3a4058'; g.beginPath(); g.arc(w - 55, 60, 24, 0, 7); g.fill();
  });
}

export function buildShip() {
  const group = new THREE.Group();
  const colliders = [], walls = [], windows = [], interactables = [], doors = [], rooms = [], screens = {}, lights = {}, blinkers = [];

  const M = {
    wall: new THREE.MeshStandardMaterial({ color: 0xdfe2ea, roughness: 0.75, metalness: 0.05, map: wallTexture() }),
    wallDark: new THREE.MeshStandardMaterial({ color: 0x3a3f52, roughness: 0.6, metalness: 0.2 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x23273a, roughness: 0.5, metalness: 0.4 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x9aa0b4, roughness: 0.85, map: floorTexture() }),
    ceil: new THREE.MeshStandardMaterial({ color: 0xc9cdd8, roughness: 0.9, map: ceilTexture() }),
    glass: new THREE.MeshStandardMaterial({ color: 0xbcd4ff, transparent: true, opacity: 0.06, roughness: 0.05, metalness: 0, depthWrite: false }),
    lightStrip: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf3efe6, emissiveIntensity: 0.8 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x9aa1b3, roughness: 0.35, metalness: 0.8 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x5b6274, roughness: 0.5, metalness: 0.6 }),
    rug: new THREE.MeshStandardMaterial({ color: 0x6b3f3a, roughness: 1 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xffb45c, emissive: 0xffa040, emissiveIntensity: 1.2 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x45506e, roughness: 0.95 }),
    sheet: new THREE.MeshStandardMaterial({ color: 0xd8dbe4, roughness: 0.95 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b5340, roughness: 0.7 }),
    door: new THREE.MeshStandardMaterial({ color: 0xb8bdca, roughness: 0.5, metalness: 0.3, map: panelTexture('#c2c7d3', '#8d93a3', 128, 256, 3, 1) }),
    console: new THREE.MeshStandardMaterial({ color: 0x2b3044, roughness: 0.55, metalness: 0.35 }),
    // accents: they glow, but they light nothing, so they cost no more than any other surface
    glowBlue: new THREE.MeshStandardMaterial({ color: 0x8fb8ff, emissive: 0x8fb8ff, emissiveIntensity: 1.1 }),
    glowTeal: new THREE.MeshStandardMaterial({ color: 0x5ed6c0, emissive: 0x5ed6c0, emissiveIntensity: 0.6 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 1.3 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc8352c, roughness: 0.45, metalness: 0.2 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x3f7a4a, roughness: 0.8 }),
    pot: new THREE.MeshStandardMaterial({ color: 0xa8603e, roughness: 0.9 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xece8f4, roughness: 0.4 }),
    navy: new THREE.MeshStandardMaterial({ color: 0x2a3350, roughness: 0.9 }),
    board: new THREE.MeshStandardMaterial({ color: 0xf6f7f4, roughness: 0.35 }),
    shadow: new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0x000000, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    hull: (() => { const t = panelTexture('#3c404c', '#2a2d36', 256, 256, 2, 2); return new THREE.MeshStandardMaterial({ color: 0x3a3e4a, roughness: 0.7, metalness: 0.5, map: t, emissive: 0x5a5f70, emissiveMap: t, emissiveIntensity: 1.5 }); })(), // lit faintly by the disk, so its panels read as hull, not a hole in the view
  };
  for (const m of Object.values(M)) m.dithering = true;
  M.cabinet = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.25, map: cabinetTexture() }); // soften the banding of point-light falloff

  const box = (w, h, d, mat, x, y, z, parent = group) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m;
  };

  /** A wall along `axis` ('x' or 'z') at `at`, spanning from..to, with door/window openings in wall coordinates. */
  function wall(axis, at, from, to, height, openings = [], { exterior = false } = {}) {
    const ops = [...openings].sort((a, b) => a.a - b.a);
    const piece = (a, b, y0, y1, solid) => {
      if (b - a < 1e-3 || y1 - y0 < 1e-3) return;
      const len = b - a, mid = (a + b) / 2, h = y1 - y0, y = (y0 + y1) / 2;
      const mat = exterior ? M.wall : M.wall;
      const m = axis === 'x' ? box(len, h, T, mat, mid, y, at) : box(T, h, len, mat, at, y, mid);
      const rep = Math.max(1, Math.round(len / 1.6));
      m.material = mat.clone(); m.material.map = mat.map.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(rep, Math.max(1, Math.round(h / 1.3)));
      if (solid) { const rect = axis === 'x' ? [a, at - T / 2, b, at + T / 2] : [at - T / 2, a, at + T / 2, b]; colliders.push(rect); walls.push(rect); }
      if (solid && y0 === 0 && h > 0.4) axis === 'x' ? box(len, 0.1, T + 0.02, M.trim, mid, 0.05, at) : box(T + 0.02, 0.1, len, M.trim, at, 0.05, mid); // kick plate
    };
    let cur = from;
    for (const o of ops) {
      piece(cur, o.a, 0, height, true);
      if (o.type === 'window') {
        piece(o.a, o.b, 0, o.y0, true);
        piece(o.a, o.b, o.y1, height, false);
        const w = o.b - o.a, hh = o.y1 - o.y0, cx = (o.a + o.b) / 2, cy = (o.y0 + o.y1) / 2;
        const glass = axis === 'x' ? box(w, hh, 0.02, M.glass, cx, cy, at) : box(0.02, hh, w, M.glass, at, cy, cx);
        glass.renderOrder = 10; windows.push(glass);
        // frame
        const f = 0.07;
        for (const [fw, fh, fx, fy] of [[w + f, f, cx, o.y0], [w + f, f, cx, o.y1], [f, hh, o.a, cy], [f, hh, o.b, cy]]) {
          axis === 'x' ? box(fw, fh, T + 0.04, M.trim, fx, fy, at) : box(T + 0.04, fh, fw, M.trim, at, fy, fx);
        }
        if (o.mullions) for (let k = 1; k < o.mullions; k++) {
          const mx = o.a + (w * k) / o.mullions;
          axis === 'x' ? box(0.05, hh, T, M.trim, mx, cy, at) : box(T, hh, 0.05, M.trim, at, cy, mx);
        }
      } else if (o.type === 'door') {
        piece(o.a, o.b, 2.15, height, false);
        const w = o.b - o.a, cx = (o.a + o.b) / 2;
        const panel = axis === 'x' ? box(w, 2.15, 0.06, M.door, cx, 1.075, at) : box(0.06, 2.15, w, M.door, at, 1.075, cx);
        const trimTop = axis === 'x' ? box(w + 0.1, 0.06, T + 0.05, M.amber, cx, 2.18, at) : box(T + 0.05, 0.06, w + 0.1, M.amber, at, 2.18, cx);
        trimTop.material = M.amber;
        for (const jx of [o.a - 0.035, o.b + 0.035]) axis === 'x' ? box(0.07, 2.15, T + 0.05, M.trim, jx, 1.075, at) : box(T + 0.05, 2.15, 0.07, M.trim, at, 1.075, jx); // jambs
        const coll = { box: axis === 'x' ? [o.a, at - T / 2, o.b, at + T / 2] : [at - T / 2, o.a, at + T / 2, o.b], off: false };
        colliders.push(coll); walls.push(coll);
        doors.push({ id: o.id, panel, axis, closed: cx, width: w, open: 0, coll, center: axis === 'x' ? [cx, at] : [at, cx], locked: !!o.locked, label: o.label });
      }
      cur = o.b;
    }
    piece(cur, to, 0, height, true);
  }

  function room(id, x0, z0, x1, z1, height, light = 0xf2f4ff) {
    rooms.push({ id, box: [x0, z0, x1, z1] });
    const w = x1 - x0, d = z1 - z0;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.floor.clone());
    fl.material.map = M.floor.map.clone(); fl.material.map.needsUpdate = true; fl.material.map.repeat.set(w / 1.2, d / 1.2);
    fl.rotation.x = -Math.PI / 2; fl.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); group.add(fl);
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.ceil.clone());
    ce.material.map = M.ceil.map.clone(); ce.material.map.needsUpdate = true; ce.material.map.repeat.set(w / 2, d / 2);
    ce.rotation.x = Math.PI / 2; ce.position.set((x0 + x1) / 2, height, (z0 + z1) / 2); group.add(ce);
    // ceiling light strips run along the longer side
    const along = d > w;
    const n = Math.max(1, Math.round((along ? d : w) / 3.2));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const cx = along ? (x0 + x1) / 2 : x0 + w * t, cz = along ? z0 + d * t : (z0 + z1) / 2;
      along ? box(0.22, 0.02, 1.4, M.lightStrip, cx, height - 0.035, cz) : box(1.4, 0.02, 0.22, M.lightStrip, cx, height - 0.035, cz);
      along ? box(0.34, 0.03, 1.52, M.trim, cx, height - 0.012, cz) : box(1.52, 0.03, 0.34, M.trim, cx, height - 0.012, cz);
    }
    const pl = new THREE.PointLight(light, 7, Math.max(w, d) * 1.7, 1.3); pl.position.set((x0 + x1) / 2, height - 0.4, (z0 + z1) / 2); group.add(pl); lights[id] = pl;
    // floor trim
    box(w, 0.06, 0.04, M.amber, (x0 + x1) / 2, 0.03, z0 + 0.08).material = M.trim;
  }

  // ---- Rooms ----
  room('bridge', -3.4, -13, 3.4, -5, 3.2, 0xdfe6ff);
  room('corridor', -1, -5, 1, 8, 2.5, 0xffe9cf);
  room('quarters', 1, 2, 5, 6.5, 2.5, 0xffe2c0);
  room('lab', -5, -3.5, -1, 1.5, 2.5, 0xe6f0ff);

  // ---- Walls ----
  // Bridge
  wall('x', -13, -3.4, 3.4, 3.2, [{ type: 'window', a: -3.0, b: 3.0, y0: 0.75, y1: 2.95, mullions: 3 }], { exterior: true });
  wall('z', -3.4, -13, -5, 3.2, [{ type: 'window', a: -12.5, b: -9.2, y0: 0.9, y1: 2.6, mullions: 2 }]);
  wall('z', 3.4, -13, -5, 3.2, [{ type: 'window', a: -12.5, b: -9.2, y0: 0.9, y1: 2.6, mullions: 2 }]);
  wall('x', -5, -3.4, 3.4, 3.2, [{ type: 'door', id: 'bridge', a: -0.7, b: 0.7, label: 'Bridge' }]);
  // Corridor
  wall('z', -1, -5, 8, 2.5, [{ type: 'door', id: 'lab', a: -1.6, b: -0.4, label: 'Lab' }, { type: 'window', a: 3.2, b: 4.4, y0: 0.9, y1: 1.9 }, { type: 'window', a: 5.4, b: 6.6, y0: 0.9, y1: 1.9 }]);
  wall('z', 1, -5, 8, 2.5, [{ type: 'door', id: 'quarters', a: 3.5, b: 4.7, label: 'Quarters' }]);
  wall('x', 8, -1, 1, 2.5, [{ type: 'door', id: 'engineering', a: -0.6, b: 0.6, locked: true, label: 'Engineering' }]);
  // Quarters
  wall('x', 2, 1, 5, 2.5, [{ type: 'window', a: 3.5, b: 4.85, y0: 0.8, y1: 2.1 }], { exterior: true });
  wall('x', 6.5, 1, 5, 2.5);
  wall('z', 5, 2, 6.5, 2.5);
  // Lab
  wall('x', -3.5, -5, -1, 2.5);
  wall('x', 1.5, -5, -1, 2.5);
  wall('z', -5, -3.5, 1.5, 2.5, [{ type: 'window', a: -2.6, b: 0.6, y0: 0.9, y1: 2.0, mullions: 2 }], { exterior: true });

  // ---- Signs ----
  // each plate is lettered in its room's colour, so the same colour marks the floor arrows toward it
  const sign = (text, sub, x, y, z, ry, w = 0.9, accent = PAL.corridor) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: plateTexture(text, sub, accent) }));
    m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m;
  };
  sign('BRIDGE', 'deck 1 · forward', 0, 2.36, -4.925, 0, 0.8, PAL.bridge);
  sign('BRIDGE ↑', null, 0.925, 1.7, 2.2, -Math.PI / 2, 0.6, PAL.bridge);
  sign('QUARTERS', 'Dr. — science', 0.925, 2.36, 4.1, -Math.PI / 2, 0.8, PAL.quarters);
  sign('LAB', 'archive', -0.925, 2.36, -1.0, Math.PI / 2, 0.6, PAL.lab);
  sign('ENGINEERING', 'sealed · crew only', 0, 2.36, 7.925, Math.PI, 0.9, PAL.eng);
  sign('CORRIDOR', 'lab · quarters · aft', 0, 2.42, -5.075, Math.PI, 0.8);
  sign('CORRIDOR', 'bridge · forward', -1.075, 2.36, -1.0, -Math.PI / 2, 0.7);
  sign('CORRIDOR', 'bridge · forward', 1.075, 2.36, 4.1, Math.PI / 2, 0.7);
  { const t = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: labelTexture('TERN', { sub: 'research vessel' }), transparent: true })); t.position.set(-2.3, 2.75, -5.075); t.rotation.y = Math.PI; group.add(t); }

  // ---- Quarters props ----
  const bunk = new THREE.Group(); group.add(bunk);
  box(3.0, 0.35, 1.05, M.trim, 3.1, 0.25, 5.9, bunk);
  colliders.push([1.6, 5.37, 4.6, 6.45]);
  box(2.9, 0.18, 0.95, M.sheet, 3.1, 0.52, 5.9, bunk);
  box(0.5, 0.12, 0.7, M.sheet, 4.25, 0.66, 5.9, bunk);
  box(1.9, 0.08, 0.98, M.fabric, 2.6, 0.64, 5.9, bunk);
  box(3.1, 1.2, 0.08, M.wallDark, 3.1, 1.4, 6.42, bunk);
  // desk
  box(0.7, 0.05, 1.4, M.wood, 4.6, 0.76, 3.3);
  colliders.push([4.25, 2.6, 5, 4.0], [1.15, 2.08, 2.05, 2.62]);
  box(0.06, 0.74, 1.3, M.trim, 4.85, 0.38, 3.3);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.22), new THREE.MeshBasicMaterial({ color: 0x8fb8ff }));
  pad.rotation.x = -Math.PI / 2; pad.rotation.z = Math.PI / 2; pad.position.set(4.55, 0.79, 3.0); group.add(pad);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.24), new THREE.MeshStandardMaterial({ map: photoTexture(), roughness: 0.6 }));
  photo.position.set(4.82, 0.95, 3.7); photo.rotation.y = -Math.PI / 2 + 0.25; group.add(photo);
  box(0.45, 0.5, 0.45, M.fabric, 4.05, 0.25, 3.3);
  box(0.9, 2.1, 0.55, M.door, 1.6, 1.05, 2.35); // locker
  interactables.push({ id: 'datapad', pos: new THREE.Vector3(4.55, 0.85, 3.0), radius: 1.3, label: 'Read your datapad' });
  interactables.push({ id: 'photo', pos: new THREE.Vector3(4.8, 0.95, 3.7), radius: 1.2, label: 'Look at the photo' });
  interactables.push({ id: 'porthole', pos: new THREE.Vector3(4.1, 1.45, 2.05), radius: 3.2, label: 'Look out of the porthole' });

  // ---- Bridge consoles ----
  const keysMat = new THREE.MeshStandardMaterial({ map: consoleKeysTexture(PAL.bridge), roughness: 0.5, metalness: 0.2 });
  function makeConsole(id, x, z, ry, label, { low = false } = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
    const bodyH = low ? 0.62 : 0.85;
    box(1.3, bodyH, 0.7, M.console, 0, bodyH / 2, 0, g);
    const top = box(1.3, 0.06, 0.55, M.trim, 0, bodyH + 0.05, 0.05, g); top.rotation.x = -0.35;
    box(1.32, 0.03, 0.03, M.amber, 0, bodyH + 0.01, 0.36, g);
    const c = document.createElement('canvas'); c.width = 640; c.height = 384;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.69), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    const sy = low ? 0.86 : 1.32, tilt = low ? -0.95 : -0.28;
    scr.position.set(0, sy, low ? 0.02 : -0.18); scr.rotation.x = tilt; g.add(scr);
    const bez = box(1.2, 0.74, 0.04, M.trim, 0, sy, low ? -0.01 : -0.21, g); bez.rotation.x = tilt;
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: labelTexture(label, { font: '500 54px "IBM Plex Mono", monospace', fg: '#ffc882' }), transparent: true }));
    lab.position.set(0, low ? 0.45 : 0.7, 0.36); g.add(lab);
    if (!low) { const keys = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.24), keysMat); keys.rotation.x = -Math.PI / 2; keys.position.set(0, 0.031, 0.1); top.add(keys); }
    g.updateMatrixWorld(true);
    const screenWorld = new THREE.Vector3(); scr.getWorldPosition(screenWorld);
    const front = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion);
    const focusPos = screenWorld.clone().addScaledVector(front, low ? 0.85 : 1.05); focusPos.y = low ? 1.45 : 1.58;
    screens[id] = { canvas: c, ctx: c.getContext('2d'), tex, mesh: scr, w: c.width, h: c.height };
    colliders.push(aabbOf(g));
    interactables.push({ id, pos: screenWorld, radius: 1.9, label: `Use the ${label.toLowerCase()} console`, console: true, focus: { pos: focusPos, look: screenWorld.clone().add(new THREE.Vector3(0, 0.05, 0)) } });
    return g;
  }
  const probeCon = makeConsole('probe', -1.95, -11.2, 0.3, 'PROBE');
  { // a sticky note on the probe console, in someone's hurried hand
    const note = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#f7e27a'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a3350'; c.font = `600 22px ${HAND}`; c.fillText('bay 1: K-1', 10, 48); c.fillText('bay 2: Orph.', 10, 84); }) }));
    note.position.set(0.52, 0.5, 0.352); note.rotation.z = 0.08; probeCon.add(note);
  }
  makeConsole('helm', 0, -11.3, 0, 'HELM', { low: true });
  { const it = interactables.find((i) => i.id === 'helm'); it.radius = 2.8; /* usable from behind the chair */ it.focus = { pos: new THREE.Vector3(0, 1.75, -9.4), look: new THREE.Vector3(0, 1.45, -13) }; } // at the helm, watch the window
  makeConsole('comms', 1.95, -11.2, -0.3, 'COMMS');
  // chair
  // the pilot's seat: a pedestal, a cushion, a reclined back and armrests, all inside the same footprint as before
  box(0.5, 0.04, 0.5, M.trim, 0, 0.02, -9.3); box(0.12, 0.34, 0.12, M.rail, 0, 0.2, -9.3);
  box(0.56, 0.12, 0.52, M.fabric, 0, 0.42, -9.32); box(0.5, 0.03, 0.46, M.trim, 0, 0.35, -9.32);
  { const back = box(0.52, 0.62, 0.1, M.fabric, 0, 0.82, -9.04); back.rotation.x = 0.12; const head = box(0.32, 0.16, 0.09, M.fabric, 0, 1.22, -9.0); head.rotation.x = 0.12; }
  for (const sx of [-0.29, 0.29]) { box(0.06, 0.05, 0.4, M.trim, sx, 0.66, -9.3); box(0.04, 0.2, 0.04, M.rail, sx, 0.55, -9.15); }
  colliders.push([-0.3, -9.6, 0.3, -8.98]);

  // Wall screens: the spacetime map (port wall) and the clocks above the window.
  function wallScreen(id, w, h, pw, ph, x, y, z, ry) {
    const c = document.createElement('canvas'); c.width = pw; c.height = ph;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    m.position.set(x, y, z); m.rotation.y = ry; group.add(m);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.04), M.trim); back.position.copy(m.position); back.rotation.y = ry; back.translateZ(-0.03); group.add(back);
    screens[id] = { canvas: c, ctx: c.getContext('2d'), tex, mesh: m, w: pw, h: ph };
    return m;
  }
  wallScreen('map', 2.4, 1.35, 1024, 576, -3.32, 1.75, -6.9, Math.PI / 2);
  const mapWorld = new THREE.Vector3(-3.32, 1.75, -6.9);
  interactables.push({ id: 'map', pos: mapWorld, radius: 2.6, label: 'Study the spacetime map', console: true, focus: { pos: new THREE.Vector3(-1.2, 1.6, -6.9), look: mapWorld } });
  wallScreen('clocks', 3.2, 0.21, 1024, 66, 0, 3.07, -12.93, 0);
  wallScreen('feed', 2.4, 1.35, 960, 540, 3.32, 1.75, -6.9, -Math.PI / 2);
  const feedWorld = new THREE.Vector3(3.32, 1.75, -6.9);
  interactables.push({ id: 'feed', pos: feedWorld, radius: 2.6, label: 'Watch the probe camera', console: true, focus: { pos: new THREE.Vector3(1.2, 1.6, -6.9), look: feedWorld } });

  // ---- Lab ----
  // the archive terminal stands against the aft wall, so it no longer covers the lab window
  const term = new THREE.Group(); term.position.set(-3.7, 0, 1.12); term.rotation.y = Math.PI; group.add(term);
  box(1.4, 0.9, 0.6, M.console, 0, 0.45, 0, term);
  const archC = document.createElement('canvas'); archC.width = 640; archC.height = 384;
  const archTex = new THREE.CanvasTexture(archC); archTex.colorSpace = THREE.SRGBColorSpace;
  const archScr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.72), new THREE.MeshBasicMaterial({ map: archTex, toneMapped: false }));
  archScr.position.set(0, 1.4, -0.2); term.add(archScr);
  box(1.3, 0.82, 0.05, M.console, 0, 1.4, -0.235, term); box(0.14, 0.5, 0.08, M.console, 0, 0.95, -0.25, term); // a bezel and a stand, so the screen sits on the console, not on the window
  screens.archive = { canvas: archC, ctx: archC.getContext('2d'), tex: archTex, mesh: archScr, w: 640, h: 384 };
  term.updateMatrixWorld(true);
  colliders.push(aabbOf(term));
  const archWorld = new THREE.Vector3(); archScr.getWorldPosition(archWorld);
  interactables.push({ id: 'archive', pos: archWorld, radius: 1.9, label: 'Open the archive', console: true, focus: { pos: new THREE.Vector3(-3.7, 1.58, 0.1), look: archWorld } });
  box(1.8, 0.8, 0.7, M.wallDark, -2.0, 0.4, -3.0); colliders.push([-2.9, -3.4, -1.1, -2.6]);

  // ---- detail ----
  const cyl = (r, len, mat, x, y, z, axis) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat); m.position.set(x, y, z);
    if (axis === 'z') m.rotation.x = Math.PI / 2; else if (axis === 'x') m.rotation.z = Math.PI / 2;
    group.add(m); return m;
  };
  // corridor handrails and ceiling pipes
  // handrails stop at the doorways: lab door on the port side (z -1.6..-0.4), quarters to starboard (z 3.5..4.7)
  const railRuns = { [-0.9]: [[-4.8, -1.7], [-0.3, 7.8]], [0.9]: [[-4.8, 3.4], [4.8, 7.8]] };
  for (const sx of [-0.9, 0.9]) {
    for (const [a, b] of railRuns[sx]) {
      cyl(0.025, b - a, M.rail, sx, 1.0, (a + b) / 2, 'z');
      box(0.04, 0.04, 0.12, M.rail, sx + Math.sign(sx) * 0.05, 1.0, a + 0.08); box(0.04, 0.04, 0.12, M.rail, sx + Math.sign(sx) * 0.05, 1.0, b - 0.08);
      box(0.04, 0.015, b - a, M.amber, sx * 1.033, 0.01, (a + b) / 2);
    }
    cyl(0.05, 13, M.pipe, sx * 0.95, 2.36, 1.5, 'z');
  }
  cyl(0.035, 13, M.pipe, -0.78, 2.4, 1.5, 'z');
  // amber floor strips in the corridor, and under the bridge window
  box(6.0, 0.03, 0.05, M.amber, 0, 0.73, -12.9);
  box(6.2, 0.06, 0.3, M.trim, 0, 0.72, -12.8);
  // status lights beside doors (they blink)
  const ledMat = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 });
  for (const [x, y, z, ry, c, rate] of [[0.94, 1.35, 3.3, -Math.PI / 2, 0x7fd6a8, 0.7], [-0.94, 1.35, -0.2, Math.PI / 2, 0x7fd6a8, 0.9], [0.8, 1.4, -4.94, 0, 0x8fb8ff, 0.5], [0, 1.5, 7.94, Math.PI, 0xff6b5c, 1.6], [-3.32, 2.0, -7.9, Math.PI / 2, 0xffb45c, 0.35]]) {
    const plate = box(0.16, 0.24, 0.02, M.trim, x, y, z); plate.rotation.y = ry;
    for (let k = 0; k < 3; k++) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.01), ledMat(k === 2 ? 0xffb45c : c));
      led.position.set(x, y + 0.07 - k * 0.07, z); led.rotation.y = ry; led.translateZ(0.015); group.add(led);
      blinkers.push({ mat: led.material, rate: rate * (1 + k * 0.37), phase: k * 1.7 });
    }
  }
  // quarters: shelf with books, a mug, a rug
  box(0.9, 0.03, 0.25, M.trim, 4.85, 1.5, 3.3).rotation.y = Math.PI / 2;
  const bookCols = [0x8a3b3b, 0x3b5a8a, 0xc9a54a, 0x3e7a5a, 0x6b4f8a, 0xa8a8a8];
  for (let i = 0; i < 9; i++) { const hgt = 0.18 + ((i * 37) % 7) * 0.012; box(0.16, hgt, 0.04, new THREE.MeshStandardMaterial({ color: bookCols[i % 6], roughness: 0.8 }), 4.86, 1.515 + hgt / 2, 2.95 + i * 0.075); }
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(3.2, 0.006, 4.4); group.add(rug);
  // bridge: overhead cable trays and floor plates
  box(6.4, 0.05, 0.4, M.trim, 0, 3.1, -9);
  box(0.4, 0.05, 7.6, M.trim, -2.9, 3.1, -9); box(0.4, 0.05, 7.6, M.trim, 2.9, 3.1, -9);


  // ---- set dressing: lived-in detail, wayfinding and baked shading ----
  // Everything here is static. Shared-material pieces are merged into a handful of meshes at the end,
  // so the extra detail adds few draw calls; nothing here is a light.
  const plane = (w, hh, mat, x, y, z, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ'); group.add(m); return m;
  };
  const decalMat = (map, opts = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.8, ...opts });
  const paint = (map) => decalMat(map, { alphaTest: 0.4, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const floorMark = (map, w, d, x, z, yaw) => plane(w, d, paint(map), x, 0.004, z, yaw, -Math.PI / 2); // readable when facing `yaw`
  const shade = (w, d, x, z, yaw = 0) => plane(w, d, M.shadow, x, 0.003, z, yaw, -Math.PI / 2);
  /** A flat equipment front on a wall: a trim box with a textured face. */
  const fitting = (w, hh, d, map, x, y, z, ry, emissiveMap) => {
    const b = box(w, hh, d, M.trim, x, y, z); b.rotation.y = ry;
    const f = plane(w * 0.97, hh * 0.97, decalMat(map, emissiveMap ? { emissive: 0xffffff, emissiveMap, emissiveIntensity: 1.4 } : {}), x, y, z, ry);
    f.translateZ(d / 2 + 0.002); return f;
  };

  // contact shadows along the foot of every wall, and under the furniture
  for (const [x0, z0, x1, z1] of [[-3.4, -13, 3.4, -5], [-1, -5, 1, 8], [1, 2, 5, 6.5], [-5, -3.5, -1, 1.5]]) {
    shade(x1 - x0, 0.7, (x0 + x1) / 2, z0); shade(x1 - x0, 0.7, (x0 + x1) / 2, z1);
    shade(0.7, z1 - z0, x0, (z0 + z1) / 2); shade(0.7, z1 - z0, x1, (z0 + z1) / 2);
  }
  for (const [x, z, w, d, yaw] of [[-1.95, -11.2, 1.7, 1.1, 0.3], [0, -11.3, 1.7, 1.1, 0], [1.95, -11.2, 1.7, 1.1, -0.3], [0, -9.3, 0.9, 0.9, 0],
    [3.1, 5.9, 3.4, 1.4, 0], [4.6, 3.3, 1.0, 1.7, 0], [1.6, 2.35, 1.2, 0.8, 0], [4.72, 4.85, 0.8, 0.8, 0], [1.35, 5.9, 0.75, 1.1, 0],
    [-2.0, -3.0, 2.2, 1.1, 0], [-3.7, 1.12, 1.8, 0.95, 0], [-4.65, -3.1, 0.9, 1.0, 0], [2.75, -5.3, 1.3, 0.75, 0]]) shade(w, d, x, z, yaw);

  // -- bridge --
  // stores cabinet in the starboard aft corner, with a plant and a first-aid kit on top
  { const c = box(1.0, 1.05, 0.45, M.cabinet, 2.75, 0.525, -5.29); c.rotation.y = Math.PI; colliders.push([2.25, -5.52, 3.25, -5.06]);
    box(1.04, 0.04, 0.49, M.trim, 2.75, 1.07, -5.29);
    cyl(0.1, 0.18, M.pot, 3.0, 1.18, -5.3);
    for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2, lf = box(0.05, 0.26, 0.02, M.leaf, 3.0 + Math.cos(a) * 0.06, 1.38, -5.3 + Math.sin(a) * 0.06); lf.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5); }
    box(0.32, 0.16, 0.22, M.red, 2.5, 1.17, -5.3); box(0.06, 0.06, 0.225, M.ceramic, 2.5, 1.2, -5.3); box(0.14, 0.02, 0.225, M.ceramic, 2.5, 1.2, -5.3); }
  // life-support breaker panel on the port side of the aft wall
  { const [map, glow] = equipmentTextures('panel'); fitting(1.0, 1.0, 0.06, map, -2.3, 1.45, -5.09, Math.PI, glow); }
  // instrument strips below the side windows, and a glowing line under the cable trays
  { const [map, glow] = equipmentTextures('rack'); map.wrapS = glow.wrapS = THREE.RepeatWrapping;
    for (const sx of [-1, 1]) { const f = fitting(3.1, 0.5, 0.05, map, sx * 3.315, 0.45, -10.85, -sx * Math.PI / 2, glow); f.material.map.repeat.set(3, 1); glow.repeat.set(3, 1); } }
  box(0.03, 0.02, 7.3, M.glowBlue, -2.9, 3.065, -9); box(0.03, 0.02, 7.3, M.glowBlue, 2.9, 3.065, -9); box(6.0, 0.02, 0.03, M.glowBlue, 0, 3.065, -9);
  // deck markings: the console line, and a stencil at the door
  floorMark(hazardTexture('#ffb45c', '#1a1d28'), 6.2, 0.14, 0, -10.3, 0);
  floorMark(stencilTexture('DECK 1 · BRIDGE', 'keep the console line clear', 'rgba(143,184,255,0.55)'), 2.2, 0.55, 0, -5.75, 0);

  // -- corridor --
  { const bridgeArrow = floorArrowTexture('BRIDGE', PAL.bridge);
    for (const z of [6.4, 2.0, -2.6]) floorMark(bridgeArrow, 0.75, 0.75, 0, z, 0);
    floorMark(floorArrowTexture('LAB', PAL.lab), 0.6, 0.6, -0.4, -1.0, Math.PI / 2);
    floorMark(floorArrowTexture('QUARTERS', PAL.quarters), 0.6, 0.6, 0.4, 4.1, -Math.PI / 2);
    floorMark(hazardTexture(PAL.eng, '#1a1d28', 'SEALED'), 1.3, 0.32, 0, 7.72, Math.PI);
    const amber = hazardTexture();
    floorMark(amber, 1.2, 0.14, -0.86, -1.0, Math.PI / 2); floorMark(amber, 1.2, 0.14, 0.86, 4.1, -Math.PI / 2); floorMark(amber, 1.4, 0.14, 0, -4.86, 0); }
  // starboard wall: the deck plan (you are here), the emergency locker and an extinguisher
  plane(1.0, 0.75, decalMat(deckPlanTexture()), 0.92, 1.62, 0.0, -Math.PI / 2);
  box(0.03, 0.81, 1.06, M.trim, 0.94, 1.62, 0.0);
  { const lk = box(0.36, 0.62, 0.08, new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2, map: lockerTexture() }), 0.9, 1.55, -3.3); lk.rotation.y = -Math.PI / 2; }
  cyl(0.06, 0.38, M.red, 0.86, 1.36, -1.95); cyl(0.025, 0.08, M.trim, 0.86, 1.59, -1.95); box(0.04, 0.05, 0.16, M.trim, 0.915, 1.3, -1.95);
  // port wall: the expedition patch, and the maintenance log by the sealed engineering door
  plane(0.5, 0.66, decalMat(patchTexture()), -0.92, 1.62, 1.4, Math.PI / 2); box(0.03, 0.72, 0.56, M.trim, -0.94, 1.62, 1.4);
  plane(0.3, 0.41, decalMat(clipboardTexture()), -0.925, 1.48, 7.25, Math.PI / 2);
  interactables.push({ id: 'log', pos: new THREE.Vector3(-0.93, 1.48, 7.25), radius: 1.7, label: 'Read the maintenance log',
    lines: [['YOU', 'The maintenance log. Last entry: "Engineering sealed for the survey. Field generator running hot but steady. Crew stay forward. WREN."'],
      ['WREN', 'It is only warm in there. But the station-keeping field is what holds us up at ten horizon radii, and I would rather nobody touched it today.']] });
  // pipe brackets and flow bands overhead
  for (let z = -4.4; z < 8; z += 1.6) { box(0.1, 0.16, 0.05, M.trim, -0.93, 2.38, z); box(0.1, 0.16, 0.05, M.trim, 0.93, 2.38, z); box(0.3, 0.03, 0.05, M.trim, -0.82, 2.46, z); }
  for (const z of [-3.6, 0.8, 5.2]) { cyl(0.056, 0.08, M.glowBlue, -0.95, 2.36, z, 'z'); cyl(0.056, 0.08, M.glowTeal, 0.95, 2.36, z, 'z'); }

  // -- quarters --
  // nightstand by the bunk, with a lamp, a clock and your mug
  box(0.5, 0.5, 0.46, M.wood, 4.72, 0.25, 4.85); box(0.46, 0.02, 0.02, M.trim, 4.72, 0.32, 4.63); colliders.push([4.47, 4.62, 4.97, 5.08]);
  cyl(0.07, 0.02, M.trim, 4.85, 0.51, 5.0); cyl(0.012, 0.22, M.rail, 4.85, 0.62, 5.0); cyl(0.08, 0.1, M.lamp, 4.85, 0.75, 5.0);
  { const clk = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.06), new THREE.MeshStandardMaterial({ color: 0x1b1f2e, emissive: 0xffffff, emissiveIntensity: 0.9, emissiveMap: canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff9a6b'; c.font = `600 40px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('06:12', w / 2, h / 2 + 2); }) }));
    clk.position.set(4.62, 0.535, 4.98); clk.rotation.y = -Math.PI / 2 - 0.5; group.add(clk); }
  cyl(0.04, 0.09, M.ceramic, 4.6, 0.545, 4.74); { const hnd = box(0.015, 0.05, 0.035, M.ceramic, 4.6, 0.55, 4.69); hnd.rotation.y = 0.2; }
  interactables.push({ id: 'mug', pos: new THREE.Vector3(4.6, 0.56, 4.74), radius: 1.3, label: 'Pick up your mug',
    lines: [['YOU', 'Cold coffee. Six hours old by my watch.'],
      ['WREN', 'Six hours and twenty minutes by the relay\'s. Hovering this close to Erebus, every clock aboard runs about five percent slow.']] });
  // footlocker at the foot of the bunk; a reading light over the pillow
  box(0.42, 0.38, 0.8, M.navy, 1.36, 0.19, 5.9); box(0.44, 0.03, 0.82, M.trim, 1.36, 0.39, 5.9); box(0.02, 0.06, 0.12, M.rail, 1.57, 0.3, 5.9);
  colliders.push([1.12, 5.48, 1.6, 6.32]);
  box(0.36, 0.05, 0.06, M.lamp, 4.15, 1.75, 6.36); box(0.42, 0.08, 0.1, M.trim, 4.15, 1.8, 6.38);
  // the travel poster, and a jacket on a hook by the door
  plane(0.5, 0.667, decalMat(posterTexture()), 1.065, 1.55, 5.75, Math.PI / 2);
  box(0.04, 0.04, 0.08, M.rail, 1.08, 1.86, 3.12);
  box(0.09, 0.62, 0.42, M.navy, 1.12, 1.52, 3.12); box(0.1, 0.05, 0.43, M.amber, 1.125, 1.38, 3.12); box(0.1, 0.18, 0.12, M.navy, 1.12, 1.78, 3.12);
  // a desk lamp, and a pen pot where the mug used to sit
  box(0.14, 0.02, 0.14, M.trim, 4.78, 0.79, 2.75); { const arm = box(0.02, 0.36, 0.02, M.rail, 4.78, 0.96, 2.75); arm.rotation.x = -0.25; }
  { const sh = cyl(0.06, 0.08, M.lamp, 4.78, 1.13, 2.8); sh.rotation.x = 0.5; }
  cyl(0.035, 0.1, M.navy, 4.45, 0.835, 3.65); for (const [dx, c] of [[-0.01, M.red], [0.012, M.glowBlue]]) cyl(0.005, 0.14, c, 4.45 + dx, 0.9, 3.65);

  // -- lab --
  // whiteboard above the bench, with the field equation and the numbers that matter here
  plane(2.1, 0.985, new THREE.MeshStandardMaterial({ map: whiteboardTexture(), roughness: 0.35 }), -2.2, 1.68, -3.428, 0);
  box(2.2, 1.06, 0.03, M.rail, -2.2, 1.68, -3.45); box(1.0, 0.04, 0.08, M.rail, -2.2, 1.13, -3.41);
  for (const [dx, c] of [[-0.2, M.navy], [-0.08, M.red], [0.05, M.leaf]]) { const mk = cyl(0.012, 0.12, c, -2.2 + dx, 1.16, -3.41, 'x'); mk.rotation.y = 0.1; }
  interactables.push({ id: 'whiteboard', pos: new THREE.Vector3(-2.2, 1.68, -3.43), radius: 3.2, label: 'Read the whiteboard',
    lines: [['YOU', 'Einstein\'s field equation. Matter tells spacetime how to curve; curved spacetime tells matter how to move.'],
      ['YOU', 'Someone has worked it out underneath: at ten horizon radii our clocks run at 0.949 of the relay\'s. Every hour here is about an hour and three minutes out there.']] });
  // on the bench: a spare probe in its cradle, a spectrometer, a stack of data cards
  cyl(0.11, 0.5, M.rail, -2.45, 1.0, -3.0, 'x');
  { const nose = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 10), M.rail); nose.rotation.z = -Math.PI / 2; nose.position.set(-2.09, 1.0, -3.0); group.add(nose); }
  cyl(0.112, 0.04, M.amber, -2.6, 1.0, -3.0, 'x'); box(0.08, 0.12, 0.26, M.trim, -2.65, 0.86, -3.0); box(0.08, 0.12, 0.26, M.trim, -2.25, 0.86, -3.0);
  box(0.36, 0.22, 0.3, M.console, -1.42, 0.91, -3.1); box(0.22, 0.12, 0.005, M.glowTeal, -1.42, 0.93, -2.948);
  for (let k = 0; k < 4; k++) { const cd = box(0.12, 0.012, 0.08, k % 2 ? M.navy : M.ceramic, -1.8, 0.807 + k * 0.012, -2.82); cd.rotation.y = k * 0.2; }
  // server rack in the forward-port corner, clear of the window
  { const [map, glow] = equipmentTextures('rack');
    box(0.55, 1.9, 0.68, M.console, -4.66, 0.95, -3.1); colliders.push([-4.94, -3.44, -4.38, -2.76]);
    plane(0.62, 1.8, decalMat(map, { emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 1.4 }), -4.382, 0.95, -3.1, Math.PI / 2); }
  // the light-cone poster on the corridor wall
  plane(0.62, 0.678, decalMat(lightConeTexture()), -1.09, 1.62, 0.55, -Math.PI / 2); box(0.03, 0.74, 0.68, M.trim, -1.07, 1.62, 0.55);
  floorMark(stencilTexture('LAB · DECK 1', null, 'rgba(94,214,192,0.5)'), 1.4, 0.35, -1.8, -1.0, -Math.PI / 2);
  // the cove under the terminal's screen glows teal, like the bridge's blue
  box(1.3, 0.012, 0.02, M.glowTeal, -3.7, 0.915, 0.815);

  // ---- hull: the outside faces of walls that a window can see, so no wall shows its inside to space ----
  const skin = (w, hh, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), M.hull); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); };
  skin(4.2, 2.6, -3.0, 1.25, 1.58, 0);            // lab's aft wall, seen from the corridor windows
  skin(2.5, 3.3, -2.25, 1.6, -4.92, 0);           // bridge back wall, port of the corridor
  skin(2.5, 3.3, 2.25, 1.6, -4.92, 0);            // bridge back wall, starboard (seen from the porthole)
  // running lights on the bridge's aft corner, so from the porthole it reads as the ship's bow
  for (const [x, y, c] of [[3.42, 3.15, 0xff4a4a], [3.42, 0.15, 0xff4a4a], [1.1, 3.15, 0xffb45c]]) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), ledMat(c)); led.position.set(x, y, -4.88); group.add(led);
    blinkers.push({ mat: led.material, rate: 0.6, phase: x });
  }
  for (const sx of [1, -1]) {                       // bridge side walls, outside (leaving the side windows clear)
    skin(4.2, 3.3, sx * 3.48, 1.6, -7.1, sx * Math.PI / 2);
    skin(0.5, 3.3, sx * 3.48, 1.6, -12.75, sx * Math.PI / 2);
    skin(3.3, 0.9, sx * 3.48, 0.45, -10.85, sx * Math.PI / 2);   // below the window
    skin(3.3, 0.6, sx * 3.48, 2.9, -10.85, sx * Math.PI / 2);    // above it
  }
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.1), M.hull); roof.rotation.x = -Math.PI / 2; roof.position.set(-3.0, 2.56, -1.0); group.add(roof);
  const roofB = new THREE.Mesh(new THREE.PlaneGeometry(6.9, 8.1), M.hull); roofB.rotation.x = -Math.PI / 2; roofB.position.set(0, 3.26, -9.0); group.add(roofB);

  const hemi = new THREE.HemisphereLight(0xdfe6ff, 0x30333f, 0.9); group.add(hemi);

  mergeStatic(group, new Set([M.glass, M.door]), rooms);
  return { group, colliders, walls, windows, interactables, doors, rooms, screens, lights, blinkers, materials: M };
}

/** Bake the group's loose static meshes into one mesh per shared material. Moving parts (doors), glass and
 *  anything with a material of its own (screens, signs, blinking lamps) are left alone. */
function mergeStatic(group, skip, rooms) {
  // one bucket per material per room, so frustum culling and front-to-back sorting still work room by room
  const roomOf = (p) => rooms.findIndex(({ box: [x0, z0, x1, z1] }) => p.x > x0 - 0.2 && p.x < x1 + 0.2 && p.z > z0 - 0.2 && p.z < z1 + 0.2);
  const buckets = new Map();
  for (const m of group.children) {
    if (!m.isMesh || skip.has(m.material) || Array.isArray(m.material)) continue;
    const key = m.material.uuid + roomOf(m.position);
    if (!buckets.has(key)) buckets.set(key, { mat: m.material, list: [] });
    buckets.get(key).list.push(m);
  }
  for (const { mat, list } of buckets.values()) {
    if (list.length < 2) continue;
    let nv = 0, ni = 0;
    const geos = list.map((m) => { m.updateMatrix(); const g = m.geometry.index ? m.geometry : m.geometry.toNonIndexed(); nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; return [m, g]; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
    let v = 0, i = 0;
    const p = new THREE.Vector3(), nm = new THREE.Matrix3();
    for (const [m, g] of geos) {
      nm.getNormalMatrix(m.matrix);
      const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      for (let k = 0; k < P.count; k++) {
        p.fromBufferAttribute(P, k).applyMatrix4(m.matrix); p.toArray(pos, (v + k) * 3);
        p.fromBufferAttribute(N, k).applyMatrix3(nm).normalize(); p.toArray(nor, (v + k) * 3);
        uv[(v + k) * 2] = U.getX(k); uv[(v + k) * 2 + 1] = U.getY(k);
      }
      if (g.index) for (let k = 0; k < g.index.count; k++) idx[i++] = g.index.getX(k) + v; else for (let k = 0; k < P.count; k++) idx[i++] = v + k;
      v += P.count;
      group.remove(m); m.geometry.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeBoundingBox(); geo.computeBoundingSphere();
    const merged = new THREE.Mesh(geo, mat); merged.name = 'static'; group.add(merged);
  }
}

function aabbOf(obj) {
  const b = new THREE.Box3().setFromObject(obj);
  return [b.min.x, b.min.z, b.max.x, b.max.z];
}

function photoTexture() {
  const c = document.createElement('canvas'); c.width = 180; c.height = 240;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 240); sky.addColorStop(0, '#7fb2e8'); sky.addColorStop(0.62, '#cfe3f2'); sky.addColorStop(0.62, '#4f7a3e'); sky.addColorStop(1, '#2e4a24');
  g.fillStyle = sky; g.fillRect(0, 0, 180, 240);
  g.fillStyle = '#f5e6a8'; g.beginPath(); g.arc(130, 50, 16, 0, 7); g.fill();
  g.fillStyle = '#3b3a48'; for (const [x, h] of [[40, 70], [90, 56]]) { g.fillRect(x, 150 - h * 0.2, 14, h * 0.6); g.beginPath(); g.arc(x + 7, 140 - h * 0.2, 9, 0, 7); g.fill(); }
  g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(0, 0, 180, 240);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
