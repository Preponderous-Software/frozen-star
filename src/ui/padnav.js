// Gamepad navigation for menus and panels: the d-pad or left stick moves focus, left/right adjusts a
// focused slider, choice row or tab row, A activates, B goes back. Holding a direction repeats.

const FOCUSABLE = 'button:not([disabled]):not([hidden]), a.button, a.chapter-card, input:not([disabled]), select:not([disabled])';
// rows whose items sit side by side: left/right picks within the row, up/down leaves it
const ROW = '[role=radiogroup], [role=tablist]';

export function padNav({ container, onBack, onStart }) {
  let prev = {}, holdDir = null, holdT = 0, raf = 0, alive = true;
  function visible(el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && !el.closest('[hidden]'); }
  function move(dir) {
    const root = container(); if (!root) return;
    const all = [...root.querySelectorAll(FOCUSABLE)].filter(visible);
    if (!all.length) return;
    const a = document.activeElement;
    const row = a?.closest?.(ROW);
    if ((dir === 'left' || dir === 'right') && a && all.includes(a)) {
      if (a.type === 'range') { a.value = +a.value + (dir === 'right' ? 1 : -1) * (+a.step || 1) * 2; a.dispatchEvent(new Event('input', { bubbles: true })); return; }
      if (a.tagName === 'SELECT') { a.selectedIndex = Math.max(0, Math.min(a.options.length - 1, a.selectedIndex + (dir === 'right' ? 1 : -1))); a.dispatchEvent(new Event('change', { bubbles: true })); return; }
      if (row) { a.dispatchEvent(new KeyboardEvent('keydown', { key: dir === 'right' ? 'ArrowRight' : 'ArrowLeft', bubbles: true, cancelable: true })); return; }
    }
    // one stop per row: only the selected item of a choice row or tab row takes part in up/down
    const items = all.filter((el) => { const r = el.closest(ROW); return !r || el === a || (el.tabIndex >= 0 && !(row && r === row)); });
    const i = items.indexOf(a);
    const step = dir === 'down' || dir === 'right' ? 1 : -1;
    const next = items[i < 0 ? 0 : (i + step + items.length) % items.length];
    next.focus(); next.scrollIntoView?.({ block: 'nearest' });
  }
  function tick(now) {
    if (!alive) return;
    const gp = navigator.getGamepads?.()[0];
    if (gp && gp.mapping === 'standard') {
      const b = (k) => !!gp.buttons[k]?.pressed;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      const dir = b(12) || ay < -0.6 ? 'up' : b(13) || ay > 0.6 ? 'down' : b(14) || ax < -0.6 ? 'left' : b(15) || ax > 0.6 ? 'right' : null;
      if ((dir || gp.buttons.some((x) => x.pressed)) && document.body.dataset.input !== 'pad') document.body.dataset.input = 'pad';
      const root = container();
      if (root) {
        if (dir && dir !== holdDir) { move(dir); holdT = now + 380; } else if (dir && now > holdT) { move(dir); holdT = now + 110; }
        if (b(0) && !prev.a) { const a = document.activeElement; if (a && root.contains(a) && a !== document.body) { if (a.type === 'checkbox') { a.checked = !a.checked; a.dispatchEvent(new Event('change', { bubbles: true })); } else a.click(); } else move('down'); }
        if (b(1) && !prev.b) onBack?.();
      }
      if (b(9) && !prev.start) onStart?.();
      holdDir = dir; prev = { a: b(0), b: b(1), start: b(9) };
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return () => { alive = false; cancelAnimationFrame(raf); };
}
