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
uniform int uDisk, uGrid, uShift, uSteps, uRing;
uniform float uExposure, uDiskOuter;
out vec4 outColor;

void derivs(vec3 x, vec3 p, float E, out vec3 dx, out vec3 dp) {
  float r = length(x); vec3 rh = x / r; float b = sqrt(2.0 / r); float bp = -b / (2.0 * r); float s = dot(p, rh);
  dx = p - b * E * rh - b * b * s * rh;
  vec3 ps = p - s * rh;
  dp = -(rh * (-E * bp * s - b * bp * s * s) + ps * ((-E * b - b * b * s) / r));
}

float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
// sin-free hash (Hoskins): sin() of large arguments is imprecise on many GPUs, which scrambles or drops stars
vec3 hash33(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
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
  g = max(g, 0.0); // pow() of a negative number is undefined in GLSL; some GPUs return NaN
  float To = T * g;
  float vis = To < 2200.0 ? pow(max(To, 0.0) / 2200.0, 3.0) : 1.0; // most of the light has left the visible band
  return blackbody(To) * I * min((g * g) * (g * g), 400.0) * vis;
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
      float I = (1.0 - smoothstep(0.0, 0.16, dist)) * (layer == 0 ? 0.9 : 0.4) * (0.3 + h.y);
      col += shifted(mix(3200.0, 14000.0, h.z * h.z), I, g);
    }
  }
  // Galactic band
  vec3 nG = normalize(vec3(0.25, 0.92, 0.3));
  float dn = dot(d, nG); float band = exp(-dn * dn / 0.012); // not pow(): its base can be negative
  // The band's two fbm calls are the sky's main cost. Away from the band (|dn| > 0.41, about 60% of
  // the sky) it adds under 1e-6 of light, so skip them there; where the dust mask is zero, skip the second.
  if (band > 1e-6) {
    float dust = fbm(d * 5.0);
    if (dust > 0.2) col += shifted(4800.0, band * (0.015 + 0.06 * fbm(d * 2.5 + 7.0)) * smoothstep(0.35, 0.75, dust + 0.15), g);
  }
  if (uGrid == 1) {
    float lat = asin(clamp(d.y, -1.0, 1.0)), lon = atan(d.z, d.x);
    float step = 3.14159265 / 12.0;
    float la = abs(fract(lat / step + 0.5) - 0.5) * step, lo = abs(fract(lon / step + 0.5) - 0.5) * step * cos(lat);
    float line = (1.0 - smoothstep(0.0, 0.012, min(la, lo)));
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
  float edge = (1.0 - smoothstep(uDiskOuter - 5.0, uDiskOuter, r)) * smoothstep(6.0, 6.6, r);
  float T = 4600.0 * prof;
  vec3 c = shifted(T, 0.09 * prof * prof * streak, g);
  return vec4(c, clamp(edge * (0.55 + 0.45 * streak), 0.0, 1.0));
}

// Photon direction in the rain frame (n), and the camera energy per unit rain energy, for a pixel position.
vec3 rayDir(vec2 frag, out float gCam) {
  vec2 uv = (frag - 0.5 * uRes) / uRes.y;
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
  gCam = 1.0 / Erain;
  return n;
}

// Impact parameter b = L/E of the ray through a pixel: both are conserved along it, so this is known
// before tracing. b = 3√3 is the photon sphere; every thin, higher-order image of the disk lies just
// outside it. Returns -1 where b says nothing about the photon sphere: when E <= 0 (possible only inside
// the horizon), and for a ray traced outward from a camera outside r = 3.5, which never comes near it.
float impact(vec2 frag) {
  float gc; vec3 n = rayDir(frag, gc);
  float r0 = length(uCam);
  if (r0 > 3.5 && dot(n, uCam) < 0.0) return -1.0;
  float E = 1.0 - sqrt(2.0 / r0) * dot(n, uCam / r0);
  return E > 1e-4 ? length(cross(uCam, n)) / E : -1.0;
}

// Trace the ray through one point of the screen; returns the light it brings (before tone mapping).
vec3 traceRay(vec2 frag) {
  float gCam; vec3 n = rayDir(frag, gCam);
  vec3 x = uCam; vec3 p = n;
  float r0 = length(x);
  float E = 1.0 - sqrt(2.0 / r0) * dot(n, x / r0);
  vec3 acc = vec3(0.0); float accA = 0.0; bool done = false;
  // k1 of each step is the derivative at the end of the previous one (computed there anyway for the
  // escape test), so each RK4 step costs four derivative evaluations instead of five.
  vec3 k1x, k1p; derivs(x, p, E, k1x, k1p);
  for (int i = 0; i < 900; i++) {
    if (i >= uSteps) break;
    float r = length(x);
    vec3 k2x, k2p, k3x, k3p, k4x, k4p;
    // Step length in space: fine near the hole, coarser far out. Beyond r = 24 (outside the disk and
    // the ship's orbit) space is nearly flat and the ray nearly straight, so the step grows faster
    // there; that moves the final sky direction by about 0.03 mrad (a few hundredths of a pixel).
    float h = -(0.035 * min(r, 8.0) + 0.09 * max(0.0, r - 8.0) + 0.4 * max(0.0, r - 24.0)) / length(k1x);
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
    derivs(x, p, E, k1x, k1p);
    float radial = -dot(k1x, x) / rn;
    if (rn > 300.0 && radial > 0.0) { acc += (1.0 - accA) * sky(normalize(-k1x), gCam / E); done = true; break; }
    // Captured. Inside the photon sphere (r < 3) a ray heading inward can never turn back out (the
    // effective potential only falls further in), and the disk starts at r = 6, so nothing more can
    // be seen along it: stop at r < 2.95 instead of tracing on to the horizon.
    if ((rn < 2.95 && radial < 0.0) || length(p) > 1e5 || rn < 0.05) { done = true; break; }
  }
  // Out of steps (a ray looping close to the photon sphere): outside it, show the sky in the
  // direction the ray was heading instead of a hard black cut.
  if (!done && length(x) > 3.2) acc += (1.0 - accA) * sky(normalize(-k1x), gCam / E);
  return acc;
}

// The photon ring. Rays with b just above 3√3 wind around the hole before leaving, and carry the
// higher-order (n ≥ 1) images of the disk: lines far thinner than a pixel at the sky's render scale.
// One ray per pixel catches such a line only where it happens to cross the pixel centre, which draws
// it as a dotted line. So pixels whose footprint overlaps that band of b get several rays spread across
// the pixel along the direction b changes (the ring's radial direction; along the ring the image
// varies slowly), and their light is averaged before tone mapping: the pixel shows the mean light over
// its width, as a camera pixel of that size would record. Nothing is added or widened. Rays are
// spaced at most RING_DB apart in b, closer than the n = 1 image is wide (about 0.045 M), so that
// image is never missed. The band [b_c − 0.01, b_c + 0.13] holds the thin images seen from the ship;
// further out (where the n = 1 image meets the disk plane) it is over a pixel wide and needs no help.
const float BC = 5.196152;
const float RING_DB = 0.04;
const int RING_MAX = 5;

void main() {
  vec2 frag = gl_FragCoord.xy;
  int ns = 1; vec2 dir = vec2(1.0, 0.0);
  if (uRing == 1) {
    float b0 = impact(frag);
    if (b0 > BC - 1.0 && b0 < BC + 1.0) {
      vec2 gb = vec2(impact(frag + vec2(1.0, 0.0)), impact(frag + vec2(0.0, 1.0))) - b0;
      float db = length(gb);
      if (db > RING_DB && db < 2.0 && b0 - 0.5 * db < BC + 0.13 && b0 + 0.5 * db > BC - 0.01) {
        ns = min(int(ceil(db / RING_DB)), RING_MAX);
        dir = gb / db;
      }
    }
  }
  vec3 acc = vec3(0.0);
  for (int k = 0; k < RING_MAX; k++) {
    if (k >= ns) break;
    acc += traceRay(frag + dir * ((float(k) + 0.5) / float(ns) - 0.5));
  }
  acc /= float(ns);
  vec3 col = 1.0 - exp(-acc * uExposure);
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(lum), col, 1.45), 0.0); // film-like saturation so shifts read clearly
  col = pow(col, vec3(1.0 / 2.2));
  // a NaN from anywhere above would otherwise show as a black or garbage pixel on some GPUs
  if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
  outColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

// Has a WebGL 2 context ever worked in this tab (or earlier in this browser session)? If one did and a new one
// cannot be made, the graphics driver crashed or was reset: that is not "this device has no WebGL 2".
let glWorked = false;
try { glWorked = sessionStorage.getItem('frozen-star.gl-ok') === '1'; } catch { /* storage off */ }
function markGlWorked() { glWorked = true; try { sessionStorage.setItem('frozen-star.gl-ok', '1'); } catch { /* storage off */ } }

/** Thrown when no context can be made. `reason` is 'lost' (the driver restarted) or 'unsupported' (no WebGL 2 here). */
export class GLUnavailable extends Error {
  constructor(reason) {
    super(reason === 'lost'
      ? 'The graphics driver restarted, and the browser has not given the 3D view back yet.'
      : 'This device does not support WebGL 2, which the black hole renderer needs.');
    this.reason = reason;
  }
}

export class BlackHoleView {
  /**
   * opts.onLost() / opts.onRestored() are called when the browser takes the GPU context away (driver crash,
   * GPU reset, too many contexts) and when it gives it back. The view rebuilds its GL resources by itself on
   * restore; render() does nothing while the context is lost.
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.lost = false;
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: !!opts.preserve });
    if (!gl) throw new GLUnavailable(glWorked ? 'lost' : 'unsupported');
    if (gl.isContextLost()) throw new GLUnavailable('lost');
    this.gl = gl;
    this._onLost = (e) => {
      e.preventDefault(); // without this the browser never offers the context back
      this.lost = true;
      if (!this.disposed) this.opts.onLost?.();
    };
    this._onRestored = () => {
      if (this.disposed) return;
      try { this._build(); this.lost = false; this.opts.onRestored?.(); } catch (err) { console.warn('Could not rebuild the 3D view:', err); }
    };
    canvas.addEventListener('webglcontextlost', this._onLost);
    canvas.addEventListener('webglcontextrestored', this._onRestored);
    this._build();
    markGlWorked();
    this.state = {
      cam: [0, 0, -30], basis: lookBasis([0, 0, -30], [0, 0, 0]), V: [0, 0, 0], fov: 1.0, time: 0,
      disk: true, grid: false, shift: true, steps: 600, exposure: 1.5, diskOuter: 22, ring: true,
      scale: opts.scale ?? Math.min(1, 1.25 / (window.devicePixelRatio || 1)),
    };
    // ?lowgpu: a small, cheap render for weak machines (and the headless screenshot tour).
    if (LOW_GPU) Object.assign(this.state, { scale: 0.2, steps: 360 });
  }

  /** Compile the program and upload the triangle. Runs at start and again after a lost context comes back. */
  _build() {
    const gl = this.gl;
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
    // GPU time of each draw, where the browser offers it (most desktop Chrome/Electron builds): lets the
    // resolution adapt to what the ray trace itself costs, not to the frame time, which vsync rounds
    // to 16.7 / 33.3 / 50 ms and which includes everything else on the page.
    this.timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.query = null; this.gpuMs = null; this.gpuAt = 0;
    this.u = {};
    for (const n of ['uRes', 'uCam', 'uBasis', 'uV', 'uFov', 'uTime', 'uDisk', 'uGrid', 'uShift', 'uSteps', 'uExposure', 'uDiskOuter', 'uRing']) this.u[n] = gl.getUniformLocation(prog, n);
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
    if (this.lost || this.disposed) return;
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
    gl.uniform1i(u.uRing, st.ring ? 1 : 0);
    // one rectangle, a list of rectangles, or the whole canvas
    const rects = !scissor ? null : Array.isArray(scissor[0]) ? scissor : [scissor];
    const timing = this._timeBegin();
    if (!rects) gl.drawArrays(gl.TRIANGLES, 0, 3);
    else {
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
    if (timing) gl.endQuery(this.timer.TIME_ELAPSED_EXT);
  }

  /** Read the last timer query if it is ready, and start a new one if none is in flight. */
  _timeBegin() {
    const { gl, timer } = this;
    if (!timer) return false;
    if (this.query) {
      if (!gl.getQueryParameter(this.query, gl.QUERY_RESULT_AVAILABLE)) return false;
      const ns = gl.getQueryParameter(this.query, gl.QUERY_RESULT);
      if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) {
        const ms = ns / 1e6;
        this.gpuMs = this.gpuMs == null ? ms : this.gpuMs * 0.8 + ms * 0.2;
        this.gpuAt = performance.now();
      }
    } else this.query = gl.createQuery();
    gl.beginQuery(timer.TIME_ELAPSED_EXT, this.query);
    return true;
  }

  dispose() {
    if (this.disposed) return;
    if (this.query && !this.gl.isContextLost()) this.gl.deleteQuery(this.query);
    this.disposed = true;
    this.canvas.removeEventListener('webglcontextlost', this._onLost);
    this.canvas.removeEventListener('webglcontextrestored', this._onRestored);
    if (!this.gl.isContextLost()) this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

/**
 * Adaptive render scale for a BlackHoleView: aims at 30 fps or better without guessing from noise.
 *
 * With a GPU timer (view.gpuMs) the scale is steered so the ray trace takes `budgetMs` of GPU time per
 * frame (cost grows with the square of the scale); if the whole frame still runs under ~28 fps the
 * budget shrinks, and it recovers once the frame is back above 30 fps.
 * Without a timer only the frame time is known, and vsync rounds it: any GPU load between 16.7 and
 * 33.3 ms shows as 33.3 ms, so "under 22 ms" never happens on a 30 fps machine and the old rule
 * never grew. Instead, while the frame holds 30 fps the scale steps up every 2 s; a step that drops
 * the frame rate is undone, and that scale becomes a ceiling for a minute.
 * One-off hitches (a frame over 60 ms and 2.5 times the running average: shader compiles, texture
 * uploads) are ignored, and so is the first second after a reset, so a start-up hitch no longer
 * ratchets the scale down for good.
 */
export class AdaptiveScale {
  constructor({ lo = 0.2, hi = 1, scale = 0.5, budgetMs = 12 } = {}) {
    Object.assign(this, { lo, hi, scale, budgetMs });
    this.k = 1; this.avg = 0; this.n = 0; this.hitches = 0; this.since = 0; this.lastChange = 0; this.lastGrow = -1e9;
    this.ceil = Infinity; this.ceilUntil = 0; this.t = 0;
  }

  /** Start measuring afresh (after a view or mode switch). */
  reset() { this.avg = 0; this.n = 0; this.since = 0; this.t = 0; this.lastChange = 0; }

  /** Feed one frame. dtMs: time since the last frame; gpuMs: the view's GPU time or null. Returns the scale. */
  update(dtMs, gpuMs = null) {
    if (!(dtMs > 0)) return this.scale;
    this.t += dtMs; this.since += dtMs;
    if (this.t < 1000) return this.scale; // warm-up
    // a one-off hitch; three in a row are real and count
    if (this.n > 5 && dtMs > 60 && dtMs > 2.5 * this.avg && ++this.hitches < 3) return this.scale;
    this.hitches = 0;
    this.avg = this.n ? this.avg * 0.9 + dtMs * 0.1 : dtMs; this.n++;
    if (this.since < 500 || this.n < 10) return this.scale;
    this.since = 0;
    const s = this.scale, now = this.t;
    let next = s;
    if (gpuMs != null && gpuMs > 0) {
      if (this.avg > 36) this.k = Math.max(0.3, this.k * 0.85);
      else if (this.avg < 33.5) this.k = Math.min(1, this.k * 1.05);
      const ratio = Math.sqrt((this.budgetMs * this.k) / gpuMs);
      if (Math.abs(ratio - 1) > 0.06) next = s * Math.min(1.1, Math.max(0.8, ratio));
    } else if (this.avg > 36) {
      next = s * 0.85;
      // the last step up cost the frame rate: do not try that scale again for a minute
      if (now - this.lastGrow < 3000) { this.ceil = s * 0.97; this.ceilUntil = now + 60000; }
    } else if (now - this.lastChange > (this.avg < 22 ? 500 : 2000) && this.avg < 34.5) {
      const cap = now < this.ceilUntil ? this.ceil : Infinity;
      next = Math.min(s * (this.avg < 22 ? 1.1 : 1.06), Math.max(s, cap));
      if (next > s) this.lastGrow = now;
    }
    next = Math.min(this.hi, Math.max(this.lo, next));
    if (Math.abs(next - s) > 1e-3) { this.scale = next; this.lastChange = now; this.n = Math.min(this.n, 5); }
    return this.scale;
  }
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
