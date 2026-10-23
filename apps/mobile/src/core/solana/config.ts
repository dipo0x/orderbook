export type Cluster = 'devnet' | 'testnet' | 'mainnet-beta';

export const CLUSTERS: Record<Cluster, { label: string; rpcUrl: string; testFunds: boolean }> = {
  devnet: { label: 'Devnet', rpcUrl: 'https://api.devnet.solana.com', testFunds: true },
  testnet: { label: 'Testnet', rpcUrl: 'https://api.testnet.solana.com', testFunds: true },
  'mainnet-beta': { label: 'Mainnet', rpcUrl: 'https://api.mainnet-beta.solana.com', testFunds: false },
};

const clusterQuery = (cluster: Cluster) => (cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`);

export const explorerTxUrl = (signature: string, cluster: Cluster) =>
  `https://solscan.io/tx/${signature}${clusterQuery(cluster)}`;

export const explorerAddressUrl = (address: string, cluster: Cluster) =>
  `https://solscan.io/account/${address}${clusterQuery(cluster)}`;
