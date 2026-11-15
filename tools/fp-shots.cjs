// Drive the first-person game headlessly: each shot = [name, checkpoint, setup(js in page), waitMs].
// Usage: NODE_PATH=... node tools/fp-shots.cjs <outdir> [w h]
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8611/';
(async () => {
  const [out, w = 1280, h = 720] = process.argv.slice(2);
  const plan = JSON.parse(process.env.PLAN || '[]');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errs = [];
  for (const [name, cp, js, wait] of plan) {
    const page = await browser.newPage({ viewport: { width: +w, height: +h } });
    page.on('console', (m) => { if (m.type() === 'error') errs.push(`[${name}] ${m.text()}`); });
    page.on('pageerror', (e) => errs.push(`[${name}] pageerror ${e}`));
    await page.goto(`${BASE}index.html?lowgpu&debug&timescale=${process.env.TS || 1}${cp ? '&cp=' + cp : ''}#ship`, { waitUntil: 'commit' });
    await page.waitForFunction(() => window.__fs, null, { timeout: 30000 }).catch(() => errs.push(`[${name}] no __fs`));
    await page.waitForTimeout(800);
    if (js) { try { await page.evaluate(js); } catch (e) { errs.push(`[${name}] eval ${e.message.split('\n')[0]}`); } }
    await page.waitForTimeout(+wait);
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(name, 'done');
    await page.close();
  }
  if (errs.length) console.log(errs.join('\n'));
  await browser.close();
})();
