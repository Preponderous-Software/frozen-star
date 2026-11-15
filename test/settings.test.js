import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clean, DEFAULTS } from '../src/game/settings.js';

test('settings are clamped and typed', () => {
  assert.deepEqual(clean({}), clean(DEFAULTS));
  const s = clean({ sens: 99, fov: 'x', volume: -1, subs: 'huge', quality: 'ultra', invertY: 1 });
  assert.equal(s.sens, 3); assert.equal(s.fov, 70); assert.equal(s.volume, 0);
  assert.equal(s.subs, 'normal'); assert.equal(s.quality, 'auto'); assert.equal(s.invertY, true);
});
