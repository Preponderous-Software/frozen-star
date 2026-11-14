// Visit every screen, drive it a little, screenshot it and report console errors.
// Usage: NODE_PATH=... node tools/tour.cjs <outdir> [width height]
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8611/';
const steps = [
  ['title', '#title', [], 1500],
  ['two-clocks', '#two-clocks', [['click', '#tc-q1'], ['fill', '#tc-speed', '30'], ['click', '#tc-drop']], 9000],
  ['last-words', '#last-words', [['click', '#lw-drop'], ['wait', 3000], ['click', '#lw-send'], ['wait', 2000], ['click', '#lw-send']], 4000],
  ['rescue', '#rescue', [['fill', '#rs-speed', '12'], ['click', '#rs-start'], ['wait', 4000], ['click', '#rs-fire']], 9000],
  ['tides', '#tides', [['click', '#td-m87'], ['click', '#td-drop']], 5000],
  ['hover', '#hover', [['click', '#hv-ton618']], 2500],
  ['into-the-dark', '#into-the-dark', [['fill', '#id-speed', '8'], ['click', '#id-go']], 9000],
  ['evaporation', '#evaporation', [['click', '#ev-q1']], 1500],
  ['observatory', '#observatory', [], 2500],
];
(async () => {
  const [out, w = 1280, h = 900] = process.argv.slice(2);
  const only = process.env.ONLY;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errs.push(`[pageerror] ${e}`));
  for (const [name, hash, actions, wait] of steps) {
    if (only && !only.split(',').includes(name)) continue;
    const n0 = errs.length;
    await page.goto(BASE + 'index.html?lowgpu' + hash);
    await page.waitForTimeout(800);
    for (const [kind, sel, val] of actions) {
      try {
        if (kind === 'click') await page.click(sel, { timeout: 5000 });
        else if (kind === 'fill') await page.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, val);
        else if (kind === 'wait') await page.waitForTimeout(sel);
      } catch (e) { errs.push(`[action ${name} ${kind} ${sel}] ${e.message.split('\n')[0]}`); }
    }
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    console.log(name, errs.length - n0 ? 'ERRORS' : 'ok');
  }
  if (errs.length) console.log(errs.join('\n'));
  await browser.close();
})();
