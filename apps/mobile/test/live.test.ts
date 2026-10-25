/// <reference types="node" />
// Read-only checks against the real services. Run with LIVE=1 npm test. Nothing is ever sent or signed.
import { Keypair } from '@solana/web3.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fetchCandles, fetchInstrument, fetchTickers, fetchTrades } from '../src/core/market/okx';
import { OrderBook } from '../src/core/market/order-book';
import { SWAP_TOKENS, getQuote } from '../src/core/solana/jupiter';
import * as rpc from '../src/core/solana/rpc';
import { buildTransferMessage, messageBase64, unsignedWireBase64 } from '../src/core/solana/transaction';
import { describeSimulationError } from '../src/core/solana/errors';

const RECIPIENT = 'Hc6g9Q23hQe3Ej4kiqujcrRpyzghofpFj9ZojnUau2Gp';

test('devnet: balance, blockhash, fee, and a friendly failure for an unfunded sender', async () => {
  assert.equal(typeof (await rpc.getBalance(RECIPIENT)), 'bigint');
  const { blockhash } = await rpc.getLatestBlockhash();
  const stranger = Keypair.generate();
  const message = buildTransferMessage({ from: stranger.publicKey.toBytes(), to: RECIPIENT, lamports: 1000n, recentBlockhash: blockhash });
  assert.equal(await rpc.getFeeForMessage(messageBase64(message)), 5000n);
  const simulation = await rpc.simulateUnsigned(unsignedWireBase64(message));
  assert.notEqual(simulation.err, null);
  assert.match(describeSimulationError(simulation.err, simulation.logs), /SOL|faucet|network/i);
});

test('devnet: history parses and a single transaction agrees with the list', async () => {
  const history = await rpc.getRecentActivity(RECIPIENT, 5);
  if (history[0]) {
    const one = await rpc.getTransactionDetail(RECIPIENT, history[0].signature);
    assert.equal(one?.lamportDelta, history[0].lamportDelta);
  }
});

test('OKX: tickers, candles (oldest first), trades, and a live order book with no sequence gaps', async () => {
  const tickers = await fetchTickers(['BTC-USDT', 'SOL-USDT']);
  assert.equal(tickers.length, 2);
  assert.ok(Number((await fetchInstrument('BTC-USDT'))?.tickSz) > 0);
  const candles = await fetchCandles('BTC-USDT', '15m', 100);
  assert.ok(candles[0].ts < candles.at(-1)!.ts);
  assert.ok((await fetchTrades('BTC-USDT', 20)).length > 0);

  const book = new OrderBook();
  let updates = 0;
  let gaps = 0;
  await new Promise<void>((resolve) => {
    const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
    ws.onopen = () => ws.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'books', instId: 'BTC-USDT' }] }));
    ws.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.arg?.channel !== 'books' || !message.data) return;
      const { asks, bids, seqId, prevSeqId } = message.data[0];
      if (message.action === 'snapshot') book.applySnapshot({ asks, bids, seqId, prevSeqId });
      else {
        updates += 1;
        if (book.applyUpdate({ asks, bids, seqId, prevSeqId }) === 'gap') gaps += 1;
      }
    };
    setTimeout(() => {
      ws.close();
      resolve();
    }, 10_000);
  });
  assert.ok(updates > 5, 'received updates');
  assert.equal(gaps, 0);
});

test('Jupiter: a quote comes back with a route and a worst-case amount', async () => {
  const [sol, usdc] = SWAP_TOKENS;
  const quote = await getQuote(sol, usdc, 100_000_000n);
  assert.ok(quote.outAmount > 0n && quote.minOut > 0n && quote.minOut <= quote.outAmount);
  assert.ok(quote.route.length > 0);
});
