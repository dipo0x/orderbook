import { parseUnits } from './amount';

/** Jupiter's public swap API: finds the best route across Solana's exchanges. Mainnet only. */
const API = 'https://lite-api.jup.ag/swap/v1';

export type SwapToken = { symbol: string; name: string; mint: string; decimals: number; color: string };

export const SOL_MINT = 'So11111111111111111111111111111111111111112';

export const SWAP_TOKENS: SwapToken[] = [
  { symbol: 'SOL', name: 'Solana', mint: SOL_MINT, decimals: 9, color: '#14f195' },
  { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, color: '#2775ca' },
  { symbol: 'USDT', name: 'Tether', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, color: '#26a17b' },
];

/** Allowed price movement between quote and execution. 50 = 0.5%. */
export const SLIPPAGE_BPS = 50;

export type Quote = {
  inAmount: bigint;
  outAmount: bigint;
  /** The least you will receive if the price moves against you by the allowed slippage. */
  minOut: bigint;
  priceImpactPct: number;
  route: string[];
  /** The raw response, which is sent back to Jupiter to build the transaction. */
  raw: unknown;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, init);
  const json = (await response.json()) as T & { error?: string };
  if (!response.ok || json.error) throw new Error(json.error ?? `Swap service error (HTTP ${response.status})`);
  return json;
}

export async function getQuote(from: SwapToken, to: SwapToken, amount: bigint): Promise<Quote> {
  const query = `inputMint=${from.mint}&outputMint=${to.mint}&amount=${amount}&slippageBps=${SLIPPAGE_BPS}`;
  const raw = await request<{
    inAmount: string;
    outAmount: string;
    otherAmountThreshold: string;
    priceImpactPct: string;
    routePlan: { swapInfo: { label?: string } }[];
  }>(`/quote?${query}`);
  return {
    inAmount: BigInt(raw.inAmount),
    outAmount: BigInt(raw.outAmount),
    minOut: BigInt(raw.otherAmountThreshold),
    priceImpactPct: Number(raw.priceImpactPct) * 100,
    route: [...new Set(raw.routePlan.map((step) => step.swapInfo.label ?? 'Unknown'))],
    raw,
  };
}

/** Asks Jupiter for the unsigned transaction that performs this quote for this wallet. */
export async function buildSwapTransaction(quote: Quote, userAddress: string): Promise<string> {
  const { swapTransaction } = await request<{ swapTransaction: string }>('/swap', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote.raw,
      userPublicKey: userAddress,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
    }),
  });
  return swapTransaction;
}

export const parseTokenAmount = (text: string, token: SwapToken) => parseUnits(text, token.decimals);
