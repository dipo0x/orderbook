import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CachedValue } from '../src/cache.ts';

test('serves from cache within the ttl and reloads after', async () => {
  let time = 0;
  let loads = 0;
  const cache = new CachedValue(async () => ++loads, 1000, 5000, () => time);
  assert.equal((await cache.get()).value, 1);
  time = 500;
  assert.equal((await cache.get()).value, 1);
  time = 1500;
  assert.equal((await cache.get()).value, 2);
});

test('callers at the same moment share one load', async () => {
  let loads = 0;
  const cache = new CachedValue(async () => {
    loads++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return 'x';
  }, 1000, 5000);
  await Promise.all([cache.get(), cache.get(), cache.get()]);
  assert.equal(loads, 1);
});

test('serves the last good value when a refresh fails, but not forever', async () => {
  let time = 0;
  let fail = false;
  const cache = new CachedValue(async () => {
    if (fail) throw new Error('down');
    return 'good';
  }, 1000, 5000, () => time);
  await cache.get();
  fail = true;
  time = 2000;
  assert.equal((await cache.get()).value, 'good');
  time = 9000;
  await assert.rejects(() => cache.get(), /down/);
});
