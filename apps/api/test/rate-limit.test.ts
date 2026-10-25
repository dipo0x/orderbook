import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RateLimiter } from '../src/rate-limit.ts';

test('allows a burst up to capacity, then refuses', () => {
  let time = 0;
  const limiter = new RateLimiter(3, 1, () => time);
  assert.ok(limiter.take('ip').ok);
  assert.ok(limiter.take('ip').ok);
  assert.ok(limiter.take('ip').ok);
  const refused = limiter.take('ip');
  assert.equal(refused.ok, false);
  assert.equal(refused.ok === false && refused.retryAfterSeconds, 1);
});

test('refills over time', () => {
  let time = 0;
  const limiter = new RateLimiter(2, 1, () => time);
  limiter.take('ip');
  limiter.take('ip');
  assert.equal(limiter.take('ip').ok, false);
  time += 1000;
  assert.ok(limiter.take('ip').ok);
  assert.equal(limiter.take('ip').ok, false);
});

test('never refills past capacity', () => {
  let time = 0;
  const limiter = new RateLimiter(2, 1, () => time);
  time += 60_000;
  assert.ok(limiter.take('ip').ok);
  assert.ok(limiter.take('ip').ok);
  assert.equal(limiter.take('ip').ok, false);
});

test('keys are independent', () => {
  const limiter = new RateLimiter(1, 0.001, () => 0);
  assert.ok(limiter.take('a').ok);
  assert.equal(limiter.take('a').ok, false);
  assert.ok(limiter.take('b').ok);
});
