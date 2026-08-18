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

test('renders a five-step C1–C3 process rail with concrete handoffs', () => {
  for (const label of [
    'C1 · Context',
    'C2 · Workspace',
    'C3 · Input',
    'C2 · Evaluation',
    'C3 · Result',
  ]) {
    assert.match(source, new RegExp(label));
  }

  assert.match(source, /id="process-rail"/);
  assert.match(source, /aria-current="step"/);
  assert.match(source, /inputLabel/);
  assert.match(source, /outputLabel/);
});

test('renders a team-member check point and connected-element details', () => {
  assert.match(source, /팀원이 확인할 포인트/);
  assert.match(source, /연결 관계/);
  assert.match(source, /관련 요소 더 보기/);
});

test('uses non-text process-rail connectors in desktop and mobile timelines', () => {
  assert.doesNotMatch(source, /content: "[→↓]"/);
  assert.match(source, /border-left: 10px solid #7991ae/);
  assert.match(source, /border-top: 10px solid #7991ae/);
});
