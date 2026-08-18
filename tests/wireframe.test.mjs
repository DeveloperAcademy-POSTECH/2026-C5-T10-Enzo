import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const source = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

test('renders all six MVP wireframe screens', () => {
  for (const screen of [
    'projects',
    'register',
    'analysis',
    'editor',
    'tour',
    'rating',
  ]) {
    assert.match(source, new RegExp(`data-screen="${screen}"`));
  }
});

test('includes keyboard-accessible screen navigation and tour progression', () => {
  assert.match(source, /aria-label="화면 이동"/);
  assert.match(source, /id="next-step"/);
  assert.match(source, /id="rating-submit"/);
});

test('uses an inline favicon so the preview has no missing asset request', () => {
  assert.match(source, /<link\s+rel="icon"\s+href="data:image\/svg\+xml,/);
});
