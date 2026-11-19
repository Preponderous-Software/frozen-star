// Count frames where the ship canvas (.fp-three) reaches the screen cleared: its size was set (which clears a
// WebGL canvas) and nothing was drawn into it before the task ended (a rAF callback or a ResizeObserver callback).
// Forces resolution changes two ways: slow/fast frame swings (the adaptive DPR) and window resizes.
// Usage: serve the repo (python3 -m http.server 8611), then NODE_PATH=/root/arcade-watch/node_modules node tools/ship-flash-check.cjs [base-url] [outdir] [tag]
// Env SWING_MS: how long each slow/fast stretch lasts (default 25000; use 40000 on a busy machine). Exit code 1 if any blank frame.
const { chromium } = require('playwright');
const [BASE = 'http://127.0.0.1:8611/', out = '.', tag = 'ship'] = process.argv.slice(2);
const INIT = () => {
  window.__blank = []; window.__step = 0;
  const W = WebGL2RenderingContext.prototype;
  for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
    const o = W[fn]; W[fn] = function (...a) { this.canvas.__dirty = false; return o.apply(this, a); };
  }
  for (const prop of ['width', 'height']) {
    const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, prop);
    Object.defineProperty(HTMLCanvasElement.prototype, prop, { get: d.get, set(v) { if (v !== d.get.call(this)) this.__dirty = true; d.set.call(this, v); }, configurable: true });
  }
  const check = (where) => {
    const c = document.querySelector('.fp-three');
    if (c && c.__dirty && c.style.visibility !== 'hidden') { window.__blank.push({ where, t: Math.round(performance.now()), w: c.width }); c.__dirty = false; }
  };
  const raf = window.requestAnimationFrame.bind(window);
  // a virtual frame clock: with __step set, each displayed frame advances the rAF timestamp by exactly that
  // many ms, so the game's adaptive resolution sees steady slow (or fast) frames whatever this machine does
  let lastReal = -1, virt = 0;
  window.requestAnimationFrame = (cb) => raf((t) => {
    if (t !== lastReal) { virt = window.__step ? virt + window.__step : t; lastReal = t; }
    cb(window.__step ? virt : t); check('raf');
  });
  const RO = window.ResizeObserver;
  window.ResizeObserver = class extends RO { constructor(cb) { super((...a) => { cb(...a); check('resize-observer'); }); } };
};
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  await page.addInitScript(INIT);
  await page.goto(`${BASE}index.html?debug&cp=bridge#ship`, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__fs, null, { timeout: 180000 });
  await page.waitForTimeout(6000);
  await page.evaluate(() => { window.__blank = []; });
  // 1) frame-time swings: slow frames push the DPR down, fast ones let it climb back
  for (let i = 0; i < 4; i++) {
    await page.evaluate((s) => { window.__step = s; }, i % 2 ? 10 : 60);
    await page.waitForTimeout(Number(process.env.SWING_MS || 25000));
  }
  await page.evaluate(() => { window.__step = 0; });
  const afterDpr = await page.evaluate(() => window.__blank.length);
  // 2) window resizes
  for (const [w, h] of [[900, 500], [700, 420], [820, 460]]) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(1500); }
  const afterResize = await page.evaluate(() => window.__blank.length);
  await page.screenshot({ path: `${out}/${tag}-end.png`, timeout: 120000 }).catch((e) => console.log('no screenshot:', e.message.split('\n')[0])); // slow on a busy machine
  const r = await page.evaluate(() => ({ blank: window.__blank, stats: window.__fs.renderStats || null }));
  console.log(tag, JSON.stringify({ blankAfterDprSwings: afterDpr, blankAfterResizes: afterResize - afterDpr, total: r.blank.length, sample: r.blank.slice(0, 6), stats: r.stats }));
  await browser.close();
  process.exitCode = r.blank.length ? 1 : 0;
})();
