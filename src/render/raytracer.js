// Real-time general-relativistic ray tracer (WebGL2).
//
// Each pixel traces one light ray backwards through Painlevé–Gullstrand coordinates using exactly
// the equations in src/physics/geodesic.js (tested in test/physics.test.js). The camera can be
// anywhere, including inside the horizon, moving at any speed relative to the local "rain" frame.
// Colours shift with the true frequency ratio: gravitational redshift, Doppler shift and aberration.

export const LOW_GPU = typeof location !== 'undefined' && /[?&]lowgpu\b/.test(location.search);

const VERT = `#version 300 es
in vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec3 uCam;      // camera position (units of M)
uniform mat3 uBasis;    // columns: right, up, forward
uniform vec3 uV;        // camera velocity relative to the rain frame
uniform float uFov;     // vertical field of view (radians)
uniform float uTime;
uniform int uDisk, uGrid, uShift, uSteps;
uniform float uExposure, uDiskOuter;
out vec4 outColor;

void derivs(vec3 x, vec3 p, float E, out vec3 dx, out vec3 dp) {
  float r = length(x); vec3 rh = x / r; float b = sqrt(2.0 / r); float bp = -b / (2.0 * r); float s = dot(p, rh);
  dx = p - b * E * rh - b * b * s * rh;
  vec3 ps = p - s * rh;
  dp = -(rh * (-E * bp * s - b * bp * s * s) + ps * ((-E * b - b * b * s) / r));
}

float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 hash33(vec3 p) { p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return fract(sin(p) * 43758.5453); }
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }

// Blackbody chromaticity (normalised so the brightest channel is ~1) for temperature T in kelvin.
vec3 blackbody(float T) {
  T = clamp(T, 400.0, 40000.0) / 100.0;
  float r = T <= 66.0 ? 1.0 : clamp(1.2929 * pow(T - 60.0, -0.1332), 0.0, 1.0);
  float g = T <= 66.0 ? clamp(0.3901 * log(T) - 0.6318, 0.0, 1.0) : clamp(1.1299 * pow(T - 60.0, -0.0755), 0.0, 1.0);
  float b = T >= 66.0 ? 1.0 : (T <= 19.0 ? 0.0 : clamp(0.5432 * log(T - 10.0) - 1.1963, 0.0, 1.0));
  return vec3(r, g, b);
}
// Light from a source of temperature T and brightness I, received with frequency ratio g.
vec3 shifted(float T, float I, float g) {
  if (uShift == 0) g = 1.0;
  float To = T * g;
  float vis = To < 2200.0 ? pow(max(To, 0.0) / 2200.0, 3.0) : 1.0; // most of the light has left the visible band
  return blackbody(To) * I * min(pow(g, 4.0), 400.0) * vis;
}

vec3 sky(vec3 d, float g) {
  vec3 col = vec3(0.0);
  for (int layer = 0; layer < 2; layer++) {
    float k = layer == 0 ? 90.0 : 220.0;
    vec3 q = d * k, id = floor(q), f = fract(q) - 0.5;
    vec3 h = hash33(id);
    if (h.x > (layer == 0 ? 0.86 : 0.93)) {
      vec3 off = (h - 0.5) * 0.6;
      float dist = length(f - off);
      float I = smoothstep(0.16, 0.0, dist) * (layer == 0 ? 0.9 : 0.4) * (0.3 + h.y);
      col += shifted(mix(3200.0, 14000.0, h.z * h.z), I, g);
    }
  }
  // Galactic band
  vec3 nG = normalize(vec3(0.25, 0.92, 0.3));
  float band = exp(-pow(dot(d, nG), 2.0) / 0.012);
  float dust = fbm(d * 5.0);
  col += shifted(4800.0, band * (0.015 + 0.06 * fbm(d * 2.5 + 7.0)) * smoothstep(0.35, 0.75, dust + 0.15), g);
  if (uGrid == 1) {
    float lat = asin(clamp(d.y, -1.0, 1.0)), lon = atan(d.z, d.x);
    float step = 3.14159265 / 12.0;
    float la = abs(fract(lat / step + 0.5) - 0.5) * step, lo = abs(fract(lon / step + 0.5) - 0.5) * step * cos(lat);
    float line = smoothstep(0.012, 0.0, min(la, lo));
    col += shifted(9000.0, line * 0.25, g);
  }
  return col;
}

vec4 diskSample(vec3 xh, vec3 p, float E, float gCam) {
  float r = length(xh);
  float Omega = pow(r, -1.5);
  float ut = 1.0 / sqrt(1.0 - 3.0 / r);
  vec3 tang = cross(vec3(0.0, 1.0, 0.0), xh);
  float Eem = ut * (E - Omega * dot(p, tang));
  float g = gCam / Eem;
  float prof = pow(r / 6.0, -0.75) * pow(max(1.0 - sqrt(6.0 / r), 0.0), 0.25) / 0.488;
  float phi = atan(xh.z, xh.x) + Omega * uTime * 3.0;
  float streak = 0.55 + 0.75 * fbm(vec3(r * 1.7, cos(phi) * 2.2, sin(phi) * 2.2));
  float edge = smoothstep(uDiskOuter, uDiskOuter - 5.0, r) * smoothstep(6.0, 6.6, r);
  float T = 4600.0 * prof;
  vec3 c = shifted(T, 0.09 * prof * prof * streak, g);
  return vec4(c, clamp(edge * (0.55 + 0.45 * streak), 0.0, 1.0));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 look = normalize(uBasis * vec3(uv * 2.0 * tan(uFov * 0.5), 1.0));
  // Photon travels opposite to where we look; boost it from the camera frame into the rain frame.
  vec3 nc = -look; vec3 n = nc; float Erain = 1.0;
  float v2 = dot(uV, uV);
  if (v2 > 1e-10) {
    float ga = inversesqrt(1.0 - v2); vec3 vh = uV * inversesqrt(v2); float c = dot(nc, vh);
    vec3 pp = nc + (ga - 1.0) * c * vh + ga * uV;
    Erain = ga * (1.0 + dot(uV, nc));
    n = pp / Erain;
  }
  float gCam = 1.0 / Erain;
  vec3 x = uCam; vec3 p = n;
  float r0 = length(x);
  float E = 1.0 - sqrt(2.0 / r0) * dot(n, x / r0);

  vec3 acc = vec3(0.0); float accA = 0.0; bool done = false;
  for (int i = 0; i < 900; i++) {
    if (i >= uSteps) break;
    float r = length(x);
    vec3 k1x, k1p, k2x, k2p, k3x, k3p, k4x, k4p;
    derivs(x, p, E, k1x, k1p);
    float h = -(0.035 * min(r, 8.0) + 0.09 * max(0.0, r - 8.0)) / length(k1x);
    derivs(x + 0.5 * h * k1x, p + 0.5 * h * k1p, E, k2x, k2p);
    derivs(x + 0.5 * h * k2x, p + 0.5 * h * k2p, E, k3x, k3p);
    derivs(x + h * k3x, p + h * k3p, E, k4x, k4p);
    vec3 nx = x + h / 6.0 * (k1x + 2.0 * k2x + 2.0 * k3x + k4x);
    vec3 np = p + h / 6.0 * (k1p + 2.0 * k2p + 2.0 * k3p + k4p);
    if (uDisk == 1 && sign(x.y) != sign(nx.y)) {
      float t = x.y / (x.y - nx.y); vec3 hit = mix(x, nx, t); float rd = length(hit);
      if (rd > 6.0 && rd < uDiskOuter) {
        vec4 ds = diskSample(hit, np, E, gCam);
        acc += (1.0 - accA) * ds.a * ds.rgb; accA += (1.0 - accA) * ds.a;
        if (accA > 0.97) { done = true; break; }
      }
    }
    x = nx; p = np;
    float rn = length(x);
    vec3 bdx, bdp; derivs(x, p, E, bdx, bdp); bdx = -bdx;
    float radial = dot(bdx, x) / rn;
    if (rn > 300.0 && radial > 0.0) { acc += (1.0 - accA) * sky(normalize(bdx), gCam / E); done = true; break; }
    if ((rn < 2.01 && radial < 0.0) || length(p) > 1e5 || rn < 0.05) { done = true; break; }
  }
  // Out of steps (a ray looping close to the photon sphere): outside it, show the sky in the
  // direction the ray was heading instead of a hard black cut.
  if (!done && length(x) > 3.2) {
    vec3 bdx, bdp; derivs(x, p, E, bdx, bdp);
    acc += (1.0 - accA) * sky(normalize(-bdx), gCam / E);
  }
  vec3 col = 1.0 - exp(-acc * uExposure);
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(lum), col, 1.45), 0.0); // film-like saturation so shifts read clearly
  col = pow(col, vec3(1.0 / 2.2));
  outColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export class BlackHoleView {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: !!opts.preserve });
    if (!gl) throw new Error('This device does not support WebGL 2, which the black hole renderer needs.');
    this.gl = gl;
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    this.prog = prog;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ['uRes', 'uCam', 'uBasis', 'uV', 'uFov', 'uTime', 'uDisk', 'uGrid', 'uShift', 'uSteps', 'uExposure', 'uDiskOuter']) this.u[n] = gl.getUniformLocation(prog, n);
    this.state = {
      cam: [0, 0, -30], basis: lookBasis([0, 0, -30], [0, 0, 0]), V: [0, 0, 0], fov: 1.0, time: 0,
      disk: true, grid: false, shift: true, steps: 600, exposure: 1.5, diskOuter: 22,
      scale: opts.scale ?? Math.min(1, 1.25 / (window.devicePixelRatio || 1)),
    };
    // ?lowgpu: a small, cheap render for weak machines (and the headless screenshot tour).
    if (LOW_GPU) Object.assign(this.state, { scale: 0.2, steps: 360 });
  }

  set(patch) {
    Object.assign(this.state, patch);
    if (LOW_GPU) { this.state.scale = Math.min(this.state.scale, 0.2); this.state.steps = Math.min(this.state.steps, 360); }
    return this;
  }

  resize() {
    const c = this.canvas, s = this.state.scale * (window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(c.clientWidth * s)), h = Math.max(2, Math.round(c.clientHeight * s));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }

  /** Draw. `scissor` = [x0, y0, x1, y1] in 0..1 of the canvas (bottom-left origin) limits the work to that rectangle. */
  render(scissor) {
    this.resize();
    const { gl, u, state: st } = this;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.SCISSOR_TEST);
    gl.useProgram(this.prog);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform3fv(u.uCam, st.cam);
    gl.uniformMatrix3fv(u.uBasis, false, st.basis.flat());
    gl.uniform3fv(u.uV, st.V);
    gl.uniform1f(u.uFov, st.fov);
    gl.uniform1f(u.uTime, st.time);
    gl.uniform1i(u.uDisk, st.disk ? 1 : 0);
    gl.uniform1i(u.uGrid, st.grid ? 1 : 0);
    gl.uniform1i(u.uShift, st.shift ? 1 : 0);
    gl.uniform1i(u.uSteps, st.steps);
    gl.uniform1f(u.uExposure, st.exposure);
    gl.uniform1f(u.uDiskOuter, st.diskOuter);
    // one rectangle, a list of rectangles, or the whole canvas
    const rects = !scissor ? null : Array.isArray(scissor[0]) ? scissor : [scissor];
    if (!rects) { gl.drawArrays(gl.TRIANGLES, 0, 3); return; }
    const W = this.canvas.width, H = this.canvas.height;
    gl.enable(gl.SCISSOR_TEST);
    for (const r of rects) {
      const x0 = Math.floor(Math.max(0, r[0]) * W), y0 = Math.floor(Math.max(0, r[1]) * H);
      const x1 = Math.ceil(Math.min(1, r[2]) * W), y1 = Math.ceil(Math.min(1, r[3]) * H);
      if (x1 <= x0 || y1 <= y0) continue;
      gl.scissor(x0, y0, x1 - x0, y1 - y0); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.SCISSOR_TEST);
  }

  dispose() { this.gl.getExtension('WEBGL_lose_context')?.loseContext(); }
}

// ---- Camera helpers ----
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

/** Camera basis (columns right, up, forward) looking from `pos` toward `target`. */
export function lookBasis(pos, target, up = [0, 1, 0]) {
  const f = nrm(sub(target, pos));
  let r = cross(up, f);
  if (Math.hypot(...r) < 1e-6) r = cross([0, 0, 1], f);
  r = nrm(r);
  const u = cross(f, r);
  return [r, u, f];
}

/** Basis from yaw/pitch (radians) around a base forward direction. */
export function yawPitchBasis(forward, yaw, pitch, up = [0, 1, 0]) {
  const [r0, u0, f0] = lookBasis([0, 0, 0], forward, up);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const f = nrm(f0.map((v, i) => (v * cy + r0[i] * sy) * cp + u0[i] * sp));
  return lookBasis([0, 0, 0], f, u0);
}

/** Velocity relative to the rain frame for a radial free-faller with energy E (E = √(1−2/R0) from rest at R0). Outward. */
export function fallerVelocity(x, E) {
  const r = Math.hypot(...x), f = 1 - 2 / r;
  const gam = (E * E + 2 / r) / (E + Math.sqrt(2 / r) * Math.sqrt(Math.max(0, E * E - f)));
  const w = Math.sqrt(Math.max(0, 1 - 1 / (gam * gam)));
  return x.map((v) => (v / r) * w);
}

/** Velocity relative to the rain frame for a hovering observer (outside the horizon only). */
export const hoverVelocity = (x) => { const r = Math.hypot(...x); return x.map((v) => (v / r) * Math.sqrt(2 / r)); };

/** Attach drag-to-look controls. Returns {yaw, pitch} state object and a disposer. */
export function attachLook(el, onChange) {
  const st = { yaw: 0, pitch: 0 };
  let drag = null;
  const down = (e) => { drag = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; el.setPointerCapture?.(e.pointerId); };
  const move = (e) => {
    if (!drag) return;
    const k = 3 / el.clientHeight;
    st.yaw = drag.yaw - (e.clientX - drag.x) * k;
    st.pitch = Math.max(-1.5, Math.min(1.5, drag.pitch + (e.clientY - drag.y) * k));
    onChange?.(st);
  };
  const up = () => { drag = null; };
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.style.touchAction = 'none';
  return { st, dispose() { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); } };
}
