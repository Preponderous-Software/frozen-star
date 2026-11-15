// Time the black-hole shader at fixed cameras and diff two versions of it pixel by pixel.
// Usage (serve the repo root first, e.g. python3 -m http.server 8611):
//   git show main:src/render/raytracer.js > base-raytracer.js   # any path under the served root
//   BASE=http://127.0.0.1:8611/ NODE_PATH=... node tools/render-bench.cjs /base-raytracer.js /src/render/raytracer.js [reps]
// Prints ms per frame (A and B interleaved, so machine load affects both alike) and, per view, how
// many pixels differ by more than 1, 8 and 32 levels out of 255. PNGs of every view go to $OUT.
// Headless swiftshader is a CPU renderer: compare the ratios, not the absolute times.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8611/';
const OUT = process.env.OUT || 'render-bench-out';
const VIEWS = {
  window_hole: { cam: [0, 1.2, -20], target: [0, 0, 0], v: 'hover' },
  window_off: { cam: [0, 1.2, -20], target: [6, 2, 0], v: 'hover' },
  away: { cam: [0, 1.2, -20], target: [0, 1.2, -40], v: 'hover' },
  band: { cam: [0, 1.2, -20], target: [-10, 25, -30], v: 'hover' },
  helm_r6: { cam: [0, 0.6, -6], target: [0, 0, 0], v: 'hover' },
  edge_on: { cam: [0, 0.3, -20], target: [0, 0, 0], v: 'hover', fov: 0.7 },
  fall_r3: { cam: [0, 0.5, -3], target: [0, 0, 8], v: 'fall' },
  grid: { cam: [0, 3, -30], target: [0, 0, 0], v: 'hover', grid: true },
};
(async () => {
  const [a, b, reps = 6] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const res = {}; const pages = {};
  for (const mod of [a, b].filter(Boolean)) {
    const page = await browser.newPage({ viewport: { width: 500, height: 300 } });
    page.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
    page.on('pageerror', (e) => console.log('PAGEERR', e.message));
    await page.goto(`${BASE}tools/render-bench.html?mod=${encodeURIComponent(mod)}`);
    await page.waitForFunction(() => document.title === 'ready', null, { timeout: 60000 });
    pages[mod] = page; res[mod] = {};
  }
  const only = process.env.VIEWS ? process.env.VIEWS.split(',') : Object.keys(VIEWS);
  for (const name of only) {
    const spec = VIEWS[name];
    for (const mod of Object.keys(pages)) res[mod][name] = { ms: 0 };
    for (let k = 0; k < +reps; k++) for (const mod of Object.keys(pages)) {
      const r = await pages[mod].evaluate(([s, n]) => window.runView(s, n), [spec, 1]);
      const ms = res[mod][name].ms + r.ms / +reps; res[mod][name] = { ...r, ms };
    }
    for (const mod of Object.keys(pages)) { const r = res[mod][name];
      fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(`${OUT}/${mod.replace(/\W+/g, '_')}-${name}.png`, Buffer.from(r.png.split(',')[1], 'base64')); }
    process.stderr.write(name + ' ');
  }
  await browser.close();
  let ta = 0, tb = 0;
  for (const name of (process.env.VIEWS ? process.env.VIEWS.split(',') : Object.keys(VIEWS))) {
    const A = res[a][name]; let line = `${name.padEnd(12)} A ${A.ms.toFixed(1)}ms`; ta += A.ms;
    if (b) {
      const B = res[b][name]; tb += B.ms;
      let maxd = 0, sum = 0, n1 = 0, n8 = 0, n32 = 0; const N = A.px.length / 4;
      for (let i = 0; i < A.px.length; i += 4) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.px[i + c] - B.px[i + c])); maxd = Math.max(maxd, d); sum += d; if (d > 1) n1++; if (d > 8) n8++; if (d > 32) n32++; }
      line += `  B ${B.ms.toFixed(1)}ms (x${(A.ms / B.ms).toFixed(2)})  diff mean ${(sum / N).toFixed(3)} max ${maxd}  >1: ${(100 * n1 / N).toFixed(2)}%  >8: ${(100 * n8 / N).toFixed(2)}%  >32: ${(100 * n32 / N).toFixed(3)}%`;
    }
    console.log(line);
  }
  console.log(`TOTAL A ${ta.toFixed(1)}ms` + (b ? `  B ${tb.toFixed(1)}ms  x${(ta / tb).toFixed(2)}` : ''));
})();
