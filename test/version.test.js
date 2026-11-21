import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION } from '../src/version.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('src/version.js matches package.json', () => {
  const pkg = JSON.parse(read('../package.json'));
  assert.equal(VERSION, pkg.version);
});

test('desktop/package.json matches package.json', () => {
  assert.equal(JSON.parse(read('../desktop/package.json')).version, JSON.parse(read('../package.json')).version);
});

test('src/version.js holds exactly one VERSION line, in the form release tooling rewrites', () => {
  const lines = read('../src/version.js').split('\n').filter((l) => /\bVERSION\s*=/.test(l));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^export const VERSION = "\d+\.\d+\.\d+";$/);
});
