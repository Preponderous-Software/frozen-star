// Headless smoke test: the main menu and the ship both load with no page errors.
// Usage: node tools/smoke.cjs <base-url> <out-dir>
const { chromium } = require('playwright');
const fs = require('node:fs');
(async () => {
  const [base, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  for (const [name, path, ready] of [
    ['menu', '?lowgpu#title', "document.body.dataset.ready === '1' && !!document.querySelector('.menu-item')"],
    ['ship', '?lowgpu&debug&cp=bridge#ship', '!!window.__fs && window.__fs.time > 1'],
    ['training', '#two-clocks', "!!document.querySelector('#tc-drop')"],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(`${name}: ${e}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
    page.on('requestfailed', (r) => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) errors.push(`${name}: failed ${r.url()}`); });
    await page.goto(base + path, { waitUntil: 'commit' });
    await page.waitForFunction(ready, null, { timeout: 90000 }).catch(() => errors.push(`${name}: did not become ready`));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${name}.png` });
    await page.close();
    console.log(name, 'checked');
  }
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log('smoke test passed');
})();
