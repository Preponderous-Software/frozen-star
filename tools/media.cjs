// Render the README / docs visuals: a fixed, scripted set of stills and GIFs into docs/media/.
// Rerun it after changes to the game so the pictures stay current.
//
// Usage (serve the repo first, e.g. python3 -m http.server 8638 --bind 127.0.0.1):
//   BASE=http://127.0.0.1:8638/ NODE_PATH=/path/to/node_modules node tools/media.cjs [job ...]
//   node tools/media.cjs --list          # names of every job
// With no job names, every job runs. Jobs ending in .gif need ImageMagick's `convert`.
// Env: OUT (default docs/media), KEEP=1 keeps the raw GIF frames in OUT/.frames/.
//
// How it stays smooth on a slow (software-rendered) machine:
// - An init script wraps requestAnimationFrame with a virtual clock that can be frozen. Every GIF frame is
//   taken with the clock frozen, so a slow screenshot never skips game time.
// - Game GIFs step by game time (window.__fs.time, needs ?debug); the page's own ?timescale= speeds it up.
// - Title / lesson GIFs step by a count of animation frames, or by moving a slider between shots.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8638/';
const OUT = path.resolve(process.env.OUT || path.join(__dirname, '..', 'docs', 'media'));
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

// ---------- page helpers ----------
const INIT = `
(() => {
  try { localStorage.setItem('frozen-star.settings.v1', JSON.stringify({ quality: 'high', subs: 'normal' })); } catch (e) {}
  const raf = window.requestAnimationFrame.bind(window);
  const M = window.__media = { frozen: false, frames: 0, vt: null, real: null };
  window.requestAnimationFrame = (cb) => raf((real) => {
    if (M.vt == null) { M.vt = real; M.real = real; }
    if (real !== M.real) { if (!M.frozen) M.vt += real - M.real; M.real = real; M.frames++; }
    cb(M.vt);
  });
})();`;

const game = (cp, ts = 1, extra = '') => `index.html?debug&timescale=${ts}${cp ? `&cp=${cp}` : ''}${extra}#ship`;

async function openPage(browser, url, { w = 1280, h = 720, reduce = false, save = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduce ? 'reduce' : 'no-preference', hasTouch: w < 600, isMobile: w < 600 });
  await ctx.addInitScript({ content: INIT + (save ? `;try{localStorage.setItem('frozen-star.fp.v1', ${JSON.stringify(JSON.stringify(save))})}catch(e){}` : '') });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  page.on('pageerror', (e) => page.errors.push(String(e)));
  await page.goto(BASE + url, { waitUntil: 'load', timeout: 120000 });
  if (url.includes('#ship')) {
    await page.waitForFunction(() => window.__fs && window.__media.frames > 3, null, { timeout: 180000, polling: 250 });
    // headless Chromium never gets pointer lock, so the "click to look around" hint would sit on every shot
    await page.addStyleTag({ content: '.fp-look { display: none !important; }' });
  } else {
    await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 120000, polling: 250 });
  }
  return page;
}

const frames = (page, n) => page.evaluate((k) => new Promise((res) => { const f0 = window.__media.frames; (function w() { if (window.__media.frames >= f0 + k) res(); else setTimeout(w, 50); })(); }), n);
/** Wait until game time has advanced to `t` (seconds of window.__fs.time). */
const gameTime = (page, t) => page.waitForFunction((x) => window.__fs.time >= x, t, { timeout: 600000, polling: 100 });
const freeze = (page, on) => page.evaluate((v) => { window.__media.frozen = v; }, on);
// let a few frames draw (sky resolution adapts, screens repaint) before a still
const settle = (page, n = 6) => frames(page, n);

async function shoot(page, file, clip) {
  await freeze(page, true);
  await page.screenshot({ path: file, clip, timeout: 300000 });
  await freeze(page, false);
}

// Put the player somewhere: x, z on the deck, yaw 0 faces the bridge window (−Z), +yaw turns left.
const place = (x, z, yaw = 0, pitch = 0) => `(() => { const g = window.__fs; Object.assign(g.me, { x: ${x}, z: ${z}, yaw: ${yaw}, pitch: ${pitch}, vx: 0, vz: 0 }); })()`;
const skipLines = (n = 6) => `(() => { for (let i = 0; i < ${n}; i++) window.__fs.hud.skip(); })()`;
// a quiet frame for a room still: no subtitles, no waypoint marker
const CLEAN = '(() => { const g = window.__fs; g.waypoint = null; g.hud.clearSubs(); })()';
// (after the story, so the ship is in free roam: the end card and the free-roam hint are gone by g.time 18)
const FINISHED = { cp: 'epilogue', flags: { finished: true } };
const room = (x, z, yaw, pitch = 0) => ({
  url: game('epilogue', 4), save: FINISHED, clean: true,
  async run(page) { await gameTime(page, 18); await at(page, place(x, z, yaw, pitch)); await settle(page, 12); },
});
// for views out of the bridge window: no use prompt or target brackets on the consoles in front
const WINDOW_ONLY = '.fp-prompt, .fp-focus, .fp-cross { display: none !important; }';
/** Hide the ship and show the sky as someone falling from rest at 10 rₛ sees it from radius r (in M): the
 *  prologue dream's camera. look 'down' is the dream's view toward the hole; 'out' looks back the way it came. */
const fallCam = (page, r, line = null, look = 'down', fov = null) => page.evaluate(async ([r, line, look, fov]) => {
  const g = window.__fs;
  const { lookBasis, fallerVelocity } = await import('./src/render/raytracer.js');
  const { Infall } = await import('./src/physics/infall.js');
  const { shipPosition, R_STATION } = await import('./src/game/world.js');
  const E = new Infall(R_STATION).E, dir = shipPosition().map((v) => v / R_STATION), pos = dir.map((v) => v * r);
  if (!g.__fall) { g.__fall = true; g.hud.clearSubs(); g.objective(null); g.waypoint = null; g.mode = 'cutscene'; g.controls.setEnabled(false); g.hud.crosshair(false); g.hideShip = true; g.hud.skip = () => {}; g.say = () => Promise.resolve(); }
  if (line !== g.__line) { g.__line = line; g.hud.clearSubs(); if (line) g.hud.say('YOU', line, { style: { fontStyle: 'italic' }, dur: 999 }); }
  const target = look === 'out' ? dir.map((v) => v * 30) : [0, -0.4, 0];
  g.skyOverride = () => ({ cam: pos, basis: lookBasis(pos, target), V: fallerVelocity(pos, E), fov: fov || (look === 'out' ? 1.6 : 1.35), time: g.time, disk: true });
}, [r, line, look, fov]);
const openConsole = (id) => `(() => { const g = window.__fs; g.handlers.${id}(g.ship.interactables.find((i) => i.id === '${id}')); })()`;

// ---------- output ----------
function quantise(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  execFileSync('convert', [src, '-strip', '-colors', '256', '-define', 'png:compression-level=9', dst]);
}

function makeGif(dir, n, dst, { fps = 10, hold = 1.5, width = 640, colors = 128 }) {
  const files = Array.from({ length: n }, (_, i) => path.join(dir, `f${String(i).padStart(3, '0')}.png`));
  const delay = String(Math.round(100 / fps));
  const args = ['-delay', delay, ...files.slice(0, -1), '-delay', String(Math.round(hold * 100)), files[n - 1],
    '-resize', `${width}x`, '-dither', 'None', '-colors', String(colors), '-fuzz', '1.5%', '-layers', 'Optimize', '-loop', '0', dst];
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  execFileSync('convert', args);
}

// ---------- the jobs ----------
// still: { url, w, h, run(page), clip? }      gif: { url, w, h, setup(page), n, step(page, i), clip?, fps, hold }
const at = (page, js) => page.evaluate(js);
const byGameTime = (dt) => { let t0 = null; return async (page, i) => { if (t0 == null) t0 = await page.evaluate(() => window.__fs.time); await gameTime(page, t0 + (i + 1) * dt); }; };

const JOBS = {
  // ----- GIFs -----
  'gifs/title.gif': {
    url: 'index.html#title', w: 960, h: 540, n: 36, fps: 10, hold: 0.1, width: 640,
    setup: (page) => page.waitForTimeout(9000), // the ray trace fades in over the painted stand-in
    step: (page) => frames(page, 5),
  },
  'gifs/dream.gif': {
    // the prologue's camera (a fall from rest at 10 rₛ, as the faller sees it), stepped evenly in log r from
    // 10 rₛ to 0.45 rₛ: the story's own dream spends most of its time far out, where little changes
    url: game('bridge', 1), w: 640, h: 360, n: 30, fps: 8, hold: 2,
    async setup(page) { await fallCam(page, 20); await settle(page, 4); },
    async step(page, i) {
      const r = 20 * (0.9 / 20) ** ((i + 1) / 29);
      await fallCam(page, r, r < 2 ? '(Nothing happened.)' : r < 7 ? '(The black is spreading. The light is all overhead now.)' : '(Falling. No wind, no sound.)');
      await frames(page, 2);
    },
  },
  'gifs/beacon.gif': {
    url: game('bridge', 20), w: 800, h: 450, n: 40, fps: 8, hold: 2, css: WINDOW_ONLY, width: 560, clip: { x: 120, y: 52, width: 560, height: 315 },
    async setup(page) {
      await at(page, place(0, -10.6, 0, 0.12)); await at(page, skipLines(3));
      await page.waitForFunction(() => typeof window.__fs.launchBeacon === 'function', null, { timeout: 60000 });
      await at(page, '__fs.launchBeacon()'); await settle(page, 12); await at(page, CLEAN);
    },
    // answer the ping-9 question at once (the right answer), so the dialog doesn't cover the window
    step: ((next) => async (page, i) => { await page.evaluate(() => document.querySelectorAll('.fp-choice button')[1]?.click()); await next(page, i); })(byGameTime(2)),
  },
  'gifs/descent.gif': {
    url: game('rescue-done', 2), w: 800, h: 450, n: 44, fps: 10, hold: 2.5, css: WINDOW_ONLY + ' .fp-objective { display: none !important; }',
    async setup(page) { await at(page, place(0, -10.6, 0, 0.12)); await at(page, skipLines(4)); await settle(page, 12); },
    // lower the helm's target a step per frame, evenly in log r from 10 rₛ to 1.3 rₛ, so the shadow's growth
    // fills the GIF (the helm on its own gets most of the way down in two seconds), then hold
    async step(page, i) {
      const k = Math.min(1, (i + 1) / 30), r = 20 * (2.6 / 20) ** k;
      await page.evaluate((x) => { window.__fs.helmTarget = x; }, r);
      await gameTime(page, (await page.evaluate(() => window.__fs.time)) + 0.2);
    },
  },
  'gifs/orpheus-feed.gif': {
    url: game('helm-done', 4), w: 1280, h: 720, n: 70, fps: 6, hold: 3, width: 560, clip: { x: 720, y: 0, width: 560, height: 720 },
    async setup(page) {
      await at(page, skipLines(4));
      await page.waitForFunction(() => typeof window.__fs.launchOrpheus === 'function', null, { timeout: 60000 });
      await at(page, '__fs.launchOrpheus()');
      await page.waitForFunction(() => !!window.__fs.orpheus, null, { timeout: 60000 });
      await at(page, openConsole('feed'));
      // skip the even early stretch: start at about 5 rₛ
      await page.waitForFunction(() => window.__fs.feedState().frames >= 50, null, { timeout: 900000, polling: 250 });
    },
    // one GIF frame per feed frame received, or per 1.5 s of game time while none arrives, so the
    // growing gaps show up as the picture holding still for longer and longer
    async step(page) {
      await page.waitForFunction(([f, t]) => { const g = window.__fs; return g.feedState().frames > f || g.time >= t; },
        await page.evaluate(() => [window.__fs.feedState().frames, window.__fs.time + 1.5]), { timeout: 600000, polling: 100 });
    },
    // stop a few frames after "never" appears (the story closes the console soon after)
    done: (() => { let after = 0; return async (page) => ((await page.evaluate(() => isFinite(window.__fs.feedState().nextIn))) ? false : ++after > 4); })(),
  },
  'gifs/bend-light.gif': {
    url: 'index.html#bend-light', w: 900, h: 760, n: 34, fps: 6, hold: 2.5, width: 600, reduce: true, nogpu: true,
    async setup(page) { await page.$eval('section.view', (el) => el.scrollIntoView({ block: 'end' })); },
    async step(page, i) {
      // sweep the aim in toward the edge of the shadow, then fine-tune for loops, then one beam that falls in
      const aims = [6, 5.2, 4.5, 4, 3.6, 3.3, 3.1, 2.95, 2.85, 2.78, 2.72, 2.68, 2.65, 2.63, 2.615, 2.61, 2.605, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.55, 2.4, 2.2, 1.8, 1.4, 1, 0.6];
      const fine = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -0.0005, -0.001, -0.0012, -0.0013, -0.00135, -0.0014, -0.00142, -0.00143, -0.001435, 0, 0, 0, 0, 0, 0, 0];
      const k = Math.min(aims.length - 1, i + 1);
      await page.evaluate(([a, f]) => {
        for (const [id, v] of [['bl-aim', a], ['bl-fine', f]]) { const el = document.getElementById(id); el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }
      }, [aims[k], fine[k]]);
      await frames(page, 2);
    },
  },

  // ----- stills: the ship -----
  'rooms/bridge.png': room(0, -6.4, 0, 0.02),
  'rooms/corridor.png': room(0, 6.8, 0),
  'rooms/lab.png': room(-1.6, 0.9, 1.15),
  'rooms/quarters.png': room(1.6, 3.3, -1.95, -0.08),
  'panels/feed.png': {
    url: game('helm-done', 8),
    async run(page) {
      await at(page, skipLines(4));
      await page.waitForFunction(() => typeof window.__fs.launchOrpheus === 'function', null, { timeout: 60000 });
      await at(page, '__fs.launchOrpheus()');
      await page.waitForFunction(() => window.__fs.feedState?.().frames >= 30, null, { timeout: 600000, polling: 500 });
      await at(page, openConsole('feed')); await settle(page, 10);
    },
  },
  'panels/helm-deep.png': {
    url: game('rescue-done', 4),
    async run(page) {
      await at(page, skipLines(4)); await at(page, '__fs.helmTarget = 2.6');
      await page.waitForFunction(() => window.__fs.shipR < 2.7, null, { timeout: 600000, polling: 500 });
      await at(page, openConsole('helm')); await settle(page, 10);
    },
  },
  'physics/redshift.png': {
    url: game('bridge', 8),
    async run(page) {
      await at(page, skipLines(3));
      await page.waitForFunction(() => typeof window.__fs.launchBeacon === 'function', null, { timeout: 60000 });
      await at(page, '__fs.launchBeacon()');
      await page.waitForFunction(() => window.__fs.beacon && window.__fs.beacon.seen().lnz > 1.2, null, { timeout: 600000, polling: 500 });
      await at(page, openConsole('probe')); await settle(page, 10);
    },
  },
  'inside-horizon.png': {
    url: game('bridge', 1), w: 1280, h: 720,
    async run(page) {
      // the dream's faller, held at r = 1.4 M (0.7 rₛ, inside the horizon), with a wide lens: the shadow
      // ahead, and the whole outside universe squeezed into a bright ring around it
      await fallCam(page, 1.4, null, 'down', 2.3);
      await settle(page, 12);
    },
  },

  // ----- stills: menus and lessons -----
  'menus/title.png': { url: 'index.html#title', run: (page) => page.waitForTimeout(9000) },
  'menus/title-phone.png': { url: 'index.html#title', w: 390, h: 844, run: (page) => page.waitForTimeout(9000) },
  'menus/settings-phone.png': {
    url: 'index.html#title', w: 390, h: 844,
    async run(page) { await page.getByRole('button', { name: /^Settings/ }).first().click(); await page.waitForTimeout(3000); },
  },
  'menus/training.png': { url: 'index.html#training', h: 900, run: (page) => page.waitForTimeout(1500) },
  'training/two-clocks.png': lesson('two-clocks', [['click', '#tc-q1'], ['fill', '#tc-speed', '30'], ['click', '#tc-drop'], ['wait', 9000]], { nogpu: true }),
  'training/last-words.png': lesson('last-words', [['click', '#lw-drop'], ['wait', 3000], ['click', '#lw-send'], ['wait', 2000], ['click', '#lw-send'], ['wait', 4000]], { nogpu: true }),
  'training/rescue.png': lesson('rescue', [['fill', '#rs-speed', '12'], ['click', '#rs-start'], ['wait', 4000], ['click', '#rs-fire'], ['wait', 8000]], { nogpu: true }),
  'training/tides.png': lesson('tides', [['click', '#td-m87'], ['click', '#td-drop'], ['wait', 5000]], { nogpu: true }),
  'training/hover.png': lesson('hover', [['click', '#hv-ton618'], ['wait', 2500]]),
  'training/bend-light.png': lesson('bend-light', [['fill', '#bl-aim', '2.6'], ['fill', '#bl-fine', '-0.00142'], ['wait', 2500]], { reduce: true, nogpu: true }),
  'training/into-the-dark.png': lesson('into-the-dark', [['fill', '#id-speed', '8'], ['click', '#id-go'], ['wait', 12000]]),
  'training/evaporation.png': lesson('evaporation', [['click', '#ev-q1'], ['wait', 1500]], { nogpu: true }),
  'training/observatory.png': lesson('observatory', [['wait', 6000]]),
};

/** A training lesson: drive its controls, then frame the 3D/2D view (and its readouts) in a 1280×800 shot. */
function lesson(id, actions, { reduce = false, nogpu = false } = {}) {
  return {
    url: `index.html#${id}`, w: 1280, h: 800, reduce, nogpu,
    async run(page) {
      for (const [kind, sel, val] of actions) {
        if (kind === 'click') await page.click(sel, { timeout: 20000 });
        else if (kind === 'fill') await page.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, val);
        else if (kind === 'wait') await page.waitForTimeout(sel);
      }
      // scroll so the controls and the view are on screen together
      await page.evaluate(() => { const c = document.querySelector('.ch-body .controls') || document.querySelector('.ch-body section.view'); if (c) window.scrollTo(0, Math.max(0, c.getBoundingClientRect().top + window.scrollY - 70)); });
      await page.waitForTimeout(1500);
    },
  };
}

// ---------- runner ----------
async function runJob(browser, name, job) {
  const dst = path.join(OUT, name);
  const t0 = Date.now();
  const page = await openPage(browser, job.url, { w: job.w || 1280, h: job.h || 720, reduce: job.reduce, save: job.save });
  try {
    if (name.endsWith('.gif')) {
      const dir = path.join(OUT, '.frames', name.replace(/[/.]/g, '_'));
      fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      if (job.css) await page.addStyleTag({ content: job.css });
      await job.setup?.(page);
      let n = 0;
      for (let i = 0; i < job.n; i++) {
        await shoot(page, path.join(dir, `f${String(i).padStart(3, '0')}.png`), job.clip); n = i + 1;
        process.stdout.write(`\r${name} frame ${n}/${job.n}   `);
        if (i === job.n - 1 || (job.done && await job.done(page))) break;
        await job.step(page, i);
      }
      makeGif(dir, n, dst, job);
      if (!process.env.KEEP) fs.rmSync(dir, { recursive: true, force: true });
    } else {
      await job.run?.(page);
      if (job.clean) await at(page, CLEAN);
      const raw = dst + '.raw.png';
      await shoot(page, raw, job.clip);
      quantise(raw, dst); fs.rmSync(raw);
    }
    const kb = Math.round(fs.statSync(dst).size / 1024);
    console.log(`\n${name}: ${kb} KB in ${Math.round((Date.now() - t0) / 1000)} s${page.errors.length ? `  (${page.errors.length} console errors: ${page.errors[0]})` : ''}`);
  } finally {
    await page.context().close();
  }
}

(async () => {
  const args = process.argv.slice(2);
  if (args.includes('--list')) { console.log(Object.keys(JOBS).join('\n')); return; }
  const names = args.length ? Object.keys(JOBS).filter((n) => args.some((a) => n === a || n.startsWith(a) || n.includes(a))) : Object.keys(JOBS);
  if (!names.length) { console.error('no matching jobs; try --list'); process.exit(1); }
  // 2D-only pages (nogpu) use the software compositor: screenshots there are ~50× faster than through SwiftShader
  const browsers = {};
  const browserFor = async (job) => { const k = job.nogpu ? 'cpu' : 'gl'; browsers[k] ||= await chromium.launch({ args: job.nogpu ? ['--disable-gpu'] : GL_ARGS }); return browsers[k]; };
  let failed = 0;
  for (const n of names) {
    try { await runJob(await browserFor(JOBS[n]), n, JOBS[n]); } catch (e) { failed++; console.error(`\n${n} FAILED: ${e.message.split('\n')[0]}`); }
  }
  for (const b of Object.values(browsers)) await b.close();
  process.exit(failed ? 1 : 0);
})();
