export type ChainId = 'solana' | 'monad';

/** Integer amount in the token's smallest unit (lamports, wei, ...). Never a float. */
export type Amount = bigint;

/** The Solana networks the app and the API both understand. */
export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

// ---- API contract: the shapes sent between the mobile app and apps/api ----

/** Which alerts a phone wants. Mirrors the toggles on the Notifications screen. */
export type NotificationPrefs = {
  confirmed: boolean;
  incoming: boolean;
  priceAlerts: boolean;
  newSignIn: boolean;
  largeTransfer: boolean;
};

/** POST /devices: register this phone to be notified about one wallet address. */
export type DeviceRegistration = {
  /** Expo push token, e.g. "ExponentPushToken[xxxx]". */
  token: string;
  address: string;
  cluster: SolanaCluster;
  prefs: NotificationPrefs;
};

/** POST /risk/check */
export type RiskCheckRequest = {
  cluster: SolanaCluster;
  owner: string;
  recipient: string;
};

export type RiskReason = {
  code: 'invalid_address' | 'self_transfer' | 'flagged' | 'never_used';
  message: string;
};

/** `block` = do not allow, `warn` = allow after an explicit extra confirmation. */
export type RiskCheckResponse = {
  level: 'ok' | 'warn' | 'block';
  reasons: RiskReason[];
};

/** GET /fx */
export type FxResponse = { base: 'USD'; rates: Record<string, number>; at: number };
