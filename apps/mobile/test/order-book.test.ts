/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OrderBook } from '../src/core/market/order-book';

const level = (price: string, size: string) => [price, size, '0', '1'];

test('updates must arrive in sequence', () => {
  const book = new OrderBook();
  assert.equal(book.applyUpdate({ asks: [], bids: [], seqId: 2, prevSeqId: 1 }), 'gap', 'no snapshot yet');
  book.applySnapshot({ asks: [level('101', '1'), level('102', '2')], bids: [level('100', '1'), level('99', '3')], seqId: 10, prevSeqId: -1 });
  assert.equal(book.applyUpdate({ asks: [level('101', '0')], bids: [level('100', '5')], seqId: 11, prevSeqId: 10 }), 'ok');
  assert.equal(book.applyUpdate({ asks: [], bids: [], seqId: 11, prevSeqId: 11 }), 'ok', 'heartbeat');
  assert.equal(book.applyUpdate({ asks: [], bids: [], seqId: 15, prevSeqId: 13 }), 'gap', 'a missed update');
});

test('a size of zero removes a level', () => {
  const book = new OrderBook();
  book.applySnapshot({ asks: [level('101', '1'), level('102', '2')], bids: [level('100', '1')], seqId: 1, prevSeqId: -1 });
  book.applyUpdate({ asks: [level('101', '0')], bids: [], seqId: 2, prevSeqId: 1 });
  assert.equal(book.view(1, 5, 0).bestAsk, 102);
});

test('a crossed book is thrown away so it can be re-fetched', () => {
  const book = new OrderBook();
  book.applySnapshot({ asks: [level('101', '1')], bids: [level('100', '1')], seqId: 20, prevSeqId: -1 });
  assert.equal(book.applyUpdate({ asks: [], bids: [level('102', '1')], seqId: 21, prevSeqId: 20 }), 'gap');
  assert.equal(book.hasSnapshot, false);
});

test('grouping rounds bids down and asks up, so the two sides never cross', () => {
  const book = new OrderBook();
  book.applySnapshot({ asks: [level('100.5', '1'), level('100.9', '1')], bids: [level('100.4', '1'), level('100.1', '1')], seqId: 1, prevSeqId: -1 });
  const view = book.view(1, 5, 1);
  assert.equal(view.bestBid, 100);
  assert.equal(view.bestAsk, 101);
});

test('depth bars are relative to the larger side', () => {
  const book = new OrderBook();
  book.applySnapshot({ asks: [level('101', '1')], bids: [level('100', '4')], seqId: 1, prevSeqId: -1 });
  const view = book.view(1, 5, 0);
  assert.equal(view.bids[0].depth, 1);
  assert.equal(view.asks[0].depth, 0.25);
});
