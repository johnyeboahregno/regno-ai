import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldServe, DEFAULT_MIN_SCORE, DEFAULT_MAX_AGE_DAYS } from '../src/recall.js';
import type { ServedCandidate } from '../src/recall.js';

const candidate = (over: Partial<ServedCandidate> = {}): ServedCandidate => ({
  id: 'm1',
  category: 'insight',
  content: 'answer',
  score: 0.95,
  ageDays: 1,
  ...over,
});

test('DEFAULT_MIN_SCORE and DEFAULT_MAX_AGE_DAYS are conservative', () => {
  assert.equal(DEFAULT_MIN_SCORE, 0.86);
  assert.equal(DEFAULT_MAX_AGE_DAYS, 180);
});

test('no candidate → no-match', () => {
  const dec = shouldServe(undefined);
  assert.equal(dec.served, false);
  assert.equal(dec.reason, 'no-match');
});

test('fresh high-confidence insight is served', () => {
  const dec = shouldServe(candidate());
  assert.equal(dec.served, true);
  assert.equal(dec.reason, 'served');
});

test('exact prompt repeat is served regardless of score/age', () => {
  const dec = shouldServe(candidate({ score: 0.1, ageDays: 999, promptHash: 'abc' }), {
    exactPromptHash: 'abc',
  });
  assert.equal(dec.served, true);
  assert.equal(dec.reason, 'exact-repeat');
});

test('low score → low-score reason', () => {
  const dec = shouldServe(candidate({ score: 0.5 }));
  assert.equal(dec.served, false);
  assert.match(dec.reason, /^low-score:/);
});

test('stale memory → stale reason', () => {
  const dec = shouldServe(candidate({ ageDays: 400 }));
  assert.equal(dec.served, false);
  assert.match(dec.reason, /^stale:/);
});

test('non-servable category → category reason', () => {
  const dec = shouldServe(candidate({ category: 'note' }));
  assert.equal(dec.served, false);
  assert.match(dec.reason, /^category:/);
});

test('developer mismatch → developer-mismatch reason', () => {
  const dec = shouldServe(candidate({ developer: 'other' }), { developer: 'me' });
  assert.equal(dec.served, false);
  assert.equal(dec.reason, 'developer-mismatch');
});

test('own developer (or none) passes the isolation gate', () => {
  assert.equal(shouldServe(candidate({ developer: 'me' }), { developer: 'me' }).served, true);
  assert.equal(shouldServe(candidate({ developer: undefined }), { developer: 'me' }).served, true);
});

test('custom minScore / maxAgeDays override defaults', () => {
  assert.equal(shouldServe(candidate({ score: 0.9 }), { minScore: 0.95 }).served, false);
  assert.equal(shouldServe(candidate({ ageDays: 100 }), { maxAgeDays: 50 }).served, false);
});
