/** Markets shown in the app, in display order. (TON-USDT from the design is not listed on OKX spot.) */
export const MARKET_IDS = [
  'BTC-USDT',
  'ETH-USDT',
  'SOL-USDT',
  'XRP-USDT',
  'DOGE-USDT',
  'AVAX-USDT',
  'LINK-USDT',
  'NEAR-USDT',
] as const;

export function splitInstId(instId: string): { base: string; quote: string } {
  const [base = instId, quote = ''] = instId.split('-');
  return { base, quote };
}
