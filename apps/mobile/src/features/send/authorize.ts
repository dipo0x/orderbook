import { router } from 'expo-router';

import { type SolanaAccount, deriveSolanaAccount } from '@/core/wallet/derive';
import { type WalletMeta, enableBiometrics, readMnemonicWithBiometrics } from '@/core/wallet/storage';
import { shortAddress } from '@/core/solana/address';

let pending: ((mnemonic: string | null) => void) | null = null;

/** Called by the PIN screen when it finishes, with the phrase or null if it was cancelled. */
export function resolveAuthorization(mnemonic: string | null) {
  pending?.(mnemonic);
  pending = null;
}

/**
 * Asks the user to prove it's them and returns the recovery phrase, or null if they back out.
 * Face ID wallets get the system prompt; PIN wallets get the PIN screen. The phrase is only ever
 * decrypted here, for the moment of signing.
 */
export async function requestMnemonic(biometric: boolean): Promise<string | null> {
  if (biometric) {
    try {
      return await readMnemonicWithBiometrics('Confirm this transaction');
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    pending = resolve;
    router.push('/authorize');
  });
}

/** Derives the account for a phrase and returns it only if it is the wallet saved on this phone. */
async function verified(mnemonic: string, meta: WalletMeta): Promise<{ mnemonic: string; account: SolanaAccount } | null> {
  const account = await deriveSolanaAccount(mnemonic);
  if (account.address === meta.address) return { mnemonic, account };
  account.privateKey.fill(0);
  return null;
}

/**
 * Like requestMnemonic, but checks the phrase really belongs to this wallet before returning it.
 * The Face ID copy and the PIN copy are stored separately, so if one has drifted out of date this
 * falls back to the other and repairs the bad one. If neither matches it explains what it found.
 * The caller must wipe `account.privateKey` when done.
 */
export async function requestVerifiedSecret(
  meta: WalletMeta,
  useFaceId: boolean,
): Promise<{ mnemonic: string; account: SolanaAccount } | null> {
  const first = await requestMnemonic(useFaceId);
  if (!first) return null;
  const ok = await verified(first, meta);
  if (ok) return ok;

  let derivedFirst = '';
  {
    const account = await deriveSolanaAccount(first);
    derivedFirst = account.address;
    account.privateKey.fill(0);
  }

  if (useFaceId) {
    // The Face ID copy is wrong. Try the PIN copy, and if it is right, fix the Face ID copy from it.
    const second = await requestMnemonic(false);
    if (!second) return null;
    const good = await verified(second, meta);
    if (good) {
      try {
        await enableBiometrics(second);
      } catch {
        // Still usable: the PIN copy is correct.
      }
      return good;
    }
  }
  throw new Error(
    `The recovery phrase stored on this phone unlocks ${shortAddress(derivedFirst)}, not this wallet (${shortAddress(meta.address)}). Nothing was sent. Remove the wallet in Security and import your phrase again.`,
  );
}
