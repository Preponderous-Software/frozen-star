// Stars earned per chapter, kept in this browser only. Everything works without storage.
const KEY = 'frozen-star.progress.v1';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export function getStars(id) { return read()[id] || 0; }

export function award(id, stars) {
  const p = read();
  if ((p[id] || 0) >= stars) return false;
  p[id] = stars;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: progress lasts for this visit only */ }
  return true;
}

export function totalStars() { return Object.values(read()).reduce((a, b) => a + b, 0); }
