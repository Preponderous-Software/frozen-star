// Usage: node tools/shot.cjs <url-path-with-query> <out.png> [w h]
const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const [path, out, w = 640, h = 360] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:8611/' + path, { waitUntil: 'load' });
  await page.waitForFunction(() => document.title === 'done' || document.body.dataset.ready === '1', null, { timeout: 120000 }).catch(() => errs.push('timeout'));
  await page.waitForTimeout(+(process.env.WAIT || 300));
  await page.screenshot({ path: out });
  if (errs.length) console.log('ERRORS:', errs.join('\n'));
  await browser.close();
})();
