// Frozen Star as a desktop app: Electron shows the same game in its own window.
// The game files live next to this script in ./game and are served from app://frozen-star/,
// a secure standard scheme, so ES modules, the import map and saved progress work as on the web.
const { app, BrowserWindow, protocol, net, Menu, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

app.setName('Frozen Star');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

const ROOT = path.join(__dirname, 'game');
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}`));

const SMOKE = arg('smoke=') ? arg('smoke=').slice('--smoke='.length) : null; // write a test report here and quit

if (!SMOKE && !app.requestSingleInstanceLock()) app.quit();
let mainWin = null;
app.on('second-instance', () => {
  // the launcher copied fresh files before starting us again: show them
  if (!mainWin) return;
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.webContents.reloadIgnoringCache(); mainWin.focus();
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 800, minHeight: 500,
    backgroundColor: '#070812', title: 'Frozen Star', icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  mainWin = win;
  if (arg('fullscreen')) win.setFullScreen(true);
  if (!SMOKE) win.once('ready-to-show', () => win.show());
  else { win.setSkipTaskbar(true); win.setBounds({ x: -6000, y: -6000, width: 1600, height: 900 }); win.once('ready-to-show', () => win.showInactive()); smoke(win); }
  // F11 toggles fullscreen; F5 reloads (handy after an update)
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'F5') { win.webContents.reloadIgnoringCache(); e.preventDefault(); }
  });
  // links to other sites open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  const query = arg('lowgpu') ? '?lowgpu' : '';
  const open = arg('open=') ? arg('open=').split('=')[1] : 'title';
  win.loadURL(`app://frozen-star/index.html${query}${SMOKE ? (query ? '&' : '?') + 'debug' : ''}#${open}`);
}

// Hidden self-test: load, wait for the page to say it is ready, record errors and a screenshot, quit.
function smoke(win) {
  const fs = require('node:fs');
  const errors = [];
  win.webContents.on('console-message', (e) => { const lvl = e.level ?? e.params?.level; if (lvl === 'error' || lvl === 3) errors.push(e.message ?? e.params?.message); });
  win.webContents.on('render-process-gone', (_e, d) => errors.push('renderer gone: ' + d.reason));
  win.webContents.once('did-finish-load', async () => {
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) { await new Promise((r) => setTimeout(r, 500)); ready = await win.webContents.executeJavaScript("document.body.dataset.ready === '1'").catch(() => false); }
    await new Promise((r) => setTimeout(r, 9000)); // let the resolution settle
    const scale = await win.webContents.executeJavaScript("window.__fs ? JSON.stringify({ sky: window.__fs.sky?.state.scale }) : null").catch(() => null);
    const fps = await win.webContents.executeJavaScript("new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(Math.round(n / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); })").catch(() => null);
    const info = await win.webContents.executeJavaScript("({ title: document.title, gl: !!document.createElement('canvas').getContext('webgl2'), hash: location.hash, buttons: [...document.querySelectorAll('.hero-actions a, .hero-actions button')].map(b => b.textContent), objective: document.querySelector('.fp-objective b')?.textContent || null })").catch((e) => ({ error: String(e) }));
    const img = await win.webContents.capturePage();
    fs.writeFileSync(SMOKE + '.png', img.toPNG());
    fs.writeFileSync(SMOKE, JSON.stringify({ ready, errors, info, fps, scale, electron: process.versions.electron }, null, 2));
    app.quit();
  });
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/' || p === '') p = '/index.html';
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  Menu.setApplicationMenu(null);
  createWindow();
});
app.on('window-all-closed', () => app.quit());
