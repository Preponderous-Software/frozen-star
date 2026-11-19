// When something throws, keep going and say so quietly. An uncaught error or rejected promise used to
// end in a frozen screen with no word why; now the game carries on and a small notice in the corner
// names the error (so a player's report can quote it). The same message is shown once, not every frame.

const IGNORE = [/ResizeObserver loop/i, /^aborted$/i, /AbortError/, /play\(\) request was interrupted/i, /user didn't interact|NotAllowedError/i];
const seen = new Map(); // message -> count
let box = null, hideTimer = 0;

export function describe(err) {
  if (err == null) return 'Unknown error';
  if (typeof err === 'string') return err;
  return String(err.message || err.reason?.message || err.reason || err).slice(0, 200);
}

/** Report an error: logged once per message, and a notice shown (unless it is one of the harmless kinds). */
export function reportError(err, where = '') {
  const msg = describe(err);
  if (IGNORE.some((r) => r.test(msg))) return false;
  const n = (seen.get(msg) || 0) + 1;
  seen.set(msg, n);
  if (n > 1) return false; // the same error again (often every frame): already said
  console.error(where ? `[frozen-star] ${where}:` : '[frozen-star]', err);
  show(msg);
  return true;
}

function show(msg) {
  if (typeof document === 'undefined' || !document.body) return;
  if (!box) {
    box = document.createElement('div');
    box.className = 'fs-oops'; box.setAttribute('role', 'status');
    box.innerHTML = '<div><b>Something went wrong, but the game kept running.</b><small></small></div><button type="button" aria-label="Dismiss">×</button>';
    box.querySelector('button').addEventListener('click', () => { box.remove(); });
  }
  box.querySelector('small').textContent = msg;
  if (!box.isConnected) document.body.append(box);
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => box?.remove(), 15000);
}

export function installOops() {
  addEventListener('error', (e) => {
    if (e.target && e.target !== window && !e.error) return; // a failed <img>/<script> load, not a thrown error
    reportError(e.error || e.message, 'error');
  }, true);
  addEventListener('unhandledrejection', (e) => { if (reportError(e.reason, 'unhandled rejection')) e.preventDefault(); });
}
