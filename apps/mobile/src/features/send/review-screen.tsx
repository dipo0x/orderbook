import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Image } from '@/components/ui/image';
import { useNetwork } from '@/core/solana/network';
import { LAMPORTS_PER_SOL, formatLamportsExact } from '@/core/solana/amount';
import { findLookalike, shortAddress } from '@/core/solana/address';
import { describeSimulationError } from '@/core/solana/errors';
import {
  getFeeForMessage,
  getLatestBlockhash,
  sendTransaction,
  simulateUnsigned,
} from '@/core/solana/rpc';
import { buildTransferMessage, messageBase64, signMessage, unsignedWireBase64 } from '@/core/solana/transaction';
import { getWalletMeta } from '@/core/wallet/storage';
import { useTickers } from '@/features/markets/use-tickers';
import { WalletScreen } from '@/features/wallet/wallet-screen';
import { useFiat } from '@/lib/currency';
import { isKnownAddress, knownAddresses, rememberAddress } from '@/lib/known-addresses';
import { useSettings } from '@/lib/settings';

import type { RiskCheckResponse } from '@orderbook/shared';
import { requestVerifiedSecret } from './authorize';
import { checkRecipient } from './recipient-risk';
import { useSend } from './send-context';

const SOL_MARKET = ['SOL-USDT'] as const;
const BASE_FEE = 5_000n;

type Check = { state: 'checking' } | { state: 'ok' } | { state: 'failed'; reason: string };

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between py-3 ${strong ? '' : 'border-b border-line'}`}>
      <Text className={`font-inter text-[13px] leading-5 ${strong ? 'text-ink' : 'text-ink-muted'}`}>{label}</Text>
      <Text
        className={strong ? 'font-jetbrains-medium text-[16px] leading-6 text-ink' : 'font-jetbrains text-[12px] leading-5 text-ink'}>
        {value}
      </Text>
    </View>
  );
}

export function ReviewScreen() {
  const send = useSend();
  const { isTestnet, label } = useNetwork();
  const sol = useTickers(SOL_MARKET)['SOL-USDT'];
  const fx = useFiat();
  const { faceIdToSend, warnNewAddresses } = useSettings();
  const [newAddress, setNewAddress] = useState(false);
  const [risk, setRisk] = useState<RiskCheckResponse | null>(null);
  const [lookalike, setLookalike] = useState<string | null>(null);
  const { cluster } = useNetwork();
  const [check, setCheck] = useState<Check>({ state: 'checking' });
  const [hasFaceId, setHasFaceId] = useState(true);
  const [busy, setBusy] = useState(false);

  // Dry-run the transfer first. Nothing is signed yet, so this needs no authentication.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const meta = await getWalletMeta();
        if (!meta) throw new Error('No wallet on this device.');
        if (!cancelled) setHasFaceId(meta.biometric);
        const known = await isKnownAddress(send.to);
        if (!cancelled) setNewAddress(!known && send.to !== meta.address);
        // Address poisoning is checked on the phone, so the list of who you pay never leaves it.
        if (!cancelled) setLookalike(findLookalike(send.to, await knownAddresses()));
        void checkRecipient(cluster, meta.address, send.to).then((result) => !cancelled && setRisk(result));

        const { blockhash } = await getLatestBlockhash();
        const { base58 } = await import('@scure/base');
        const message = buildTransferMessage({
          from: base58.decode(meta.address),
          to: send.to,
          lamports: send.lamports,
          recentBlockhash: blockhash,
        });
        const [fee, simulation] = await Promise.all([
          getFeeForMessage(messageBase64(message)),
          simulateUnsigned(unsignedWireBase64(message)),
        ]);
        if (cancelled) return;
        send.setFee(fee ?? BASE_FEE);
        setCheck(
          simulation.err === null
            ? { state: 'ok' }
            : { state: 'failed', reason: describeSimulationError(simulation.err, simulation.logs) },
        );
      } catch (error) {
        if (!cancelled) {
          setCheck({ state: 'failed', reason: error instanceof Error ? error.message : 'Could not check this transfer.' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // The draft is fixed once this screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirm() {
    if (busy) return;
    const riskWarnings = risk?.level === 'warn' ? risk.reasons.map((reason) => reason.message) : [];
    if ((warnNewAddresses && newAddress) || riskWarnings.length > 0) {
      Alert.alert(
        'Check this address',
        [
          warnNewAddresses && newAddress ? `You haven't sent to ${shortAddress(send.to)} from this phone before.` : null,
          ...riskWarnings,
          "A wrong address can't be undone. Check every character against where you copied it.",
        ]
          .filter(Boolean)
          .join('\n\n'),
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'Send anyway', onPress: () => void sign() },
        ],
      );
      return;
    }
    void sign();
  }

  async function sign() {
    if (busy) return;
    setBusy(true);
    try {
      const meta = await getWalletMeta();
      if (!meta) throw new Error('No wallet on this device.');

      // The recovery phrase is decrypted only here, only to sign, and the key is wiped straight after.
      // Face ID signs only when it is on and the user wants it for sending; otherwise the PIN does.
      // The phrase is decrypted only here, only to sign, and the key is wiped straight after.
      const secret = await requestVerifiedSecret(meta, meta.biometric && faceIdToSend);
      if (!secret) return;
      const { account } = secret;
      try {
        const { blockhash } = await getLatestBlockhash();
        const message = buildTransferMessage({
          from: account.publicKey,
          to: send.to,
          lamports: send.lamports,
          recentBlockhash: blockhash,
        });
        const { wireBase64 } = signMessage(message, account.privateKey);
        const signature = await sendTransaction(wireBase64);
        send.setSent(signature);
        void rememberAddress(send.to);
      } finally {
        account.privateKey.fill(0);
      }
      router.replace('/send/sent');
    } catch (error) {
      Alert.alert("Couldn't send", error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const fiat = sol ? (Number(send.lamports) / Number(LAMPORTS_PER_SOL)) * Number(sol.last) : null;
  const total = send.lamports + send.fee;
  const blocked = risk?.level === 'block' || lookalike !== null;

  return (
    <WalletScreen
      title="Review"
      onBack={() => router.back()}
      footer={
        <>
          <Button
            label={hasFaceId && faceIdToSend ? 'Confirm with Face ID' : 'Confirm with PIN'}
            onPress={confirm}
            disabled={check.state !== 'ok' || busy || blocked}
          />
          <Text className="pb-1 text-center font-jetbrains text-[11px] leading-4 text-ink-faint">
            The key is decrypted only for this signature
          </Text>
        </>
      }>
      <View className="items-center gap-2 rounded-2xl bg-surface px-4 py-6">
        <View className="size-12 items-center justify-center rounded-2xl bg-[#14f195]">
          <Text className="font-inter-bold text-[20px] text-canvas">S</Text>
        </View>
        <Text className="font-jetbrains-bold text-[28px] leading-9 text-ink">
          {formatLamportsExact(send.lamports)} SOL
        </Text>
        <Text className="font-jetbrains text-[13px] leading-5 text-ink-muted">
          {fiat !== null ? `≈ ${fx.format(fiat, 2)}` : ' '}
        </Text>
      </View>

      <View className="rounded-2xl bg-surface px-4">
        <Row label="To" value={shortAddress(send.to)} />
        <Row label="Network" value={`Solana ${label.toLowerCase()}`} />
        <Row label="Network fee" value={`${formatLamportsExact(send.fee || BASE_FEE)} SOL`} />
        <Row label="Total" value={`${formatLamportsExact(total || send.lamports)} SOL`} strong />
      </View>

      {!isTestnet ? (
        <Callout tone="danger">
          This is mainnet: real money. A transfer can&apos;t be undone, and this app is still being
          built, so only send small amounts.
        </Callout>
      ) : null}
      {lookalike ? (
        <Callout tone="danger">
          {`This address starts and ends like ${shortAddress(lookalike)}, which you have paid before, but it is a different address. Scammers do this on purpose. Don't send.`}
        </Callout>
      ) : null}
      {risk?.reasons.map((reason) => (
        <Callout key={reason.code} tone={risk.level === 'block' ? 'danger' : 'warning'}>
          {reason.message}
        </Callout>
      ))}
      {warnNewAddresses && newAddress && !risk?.reasons.some((reason) => reason.code === 'never_used') ? (
        <Callout tone="warning">
          You haven&apos;t sent to this address from this phone before. Check every character.
        </Callout>
      ) : null}
      {check.state === 'failed' ? (
        <Callout tone="danger">{check.reason}</Callout>
      ) : (
        <Callout tone="info">
          {check.state === 'checking'
            ? 'Checking this transfer against the network…'
            : 'Check the address carefully. Once this is broadcast it cannot be reversed, and nobody can recover it for you.'}
        </Callout>
      )}
      {check.state === 'ok' ? (
        <View className="flex-row items-center gap-2">
          <Image source={require('@/assets/images/onboarding/icon-check.svg')} className="size-4" />
          <Text className="font-inter text-[13px] leading-5 text-ink-muted">
            Simulated on {label.toLowerCase()}: this transfer would succeed.
          </Text>
        </View>
      ) : null}
    </WalletScreen>
  );
}
