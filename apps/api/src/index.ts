import { createServer } from 'node:http';
import type { ChainId } from '@orderbook/shared';

const chains: ChainId[] = ['solana', 'monad'];

createServer((_req, res) => {
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ ok: true, chains }));
}).listen(3000, () => console.log('api listening on :3000'));
