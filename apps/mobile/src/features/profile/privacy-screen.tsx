import { InfoScreen } from './info-screen';

export function PrivacyScreen() {
  return (
    <InfoScreen
      title="Privacy policy"
      sections={[
        {
          heading: 'No account, no sign-up',
          body: 'The app has no accounts and no server of its own. We do not collect your name, email or phone number.',
        },
        {
          heading: 'Your keys stay on this phone',
          body: 'Your recovery phrase is stored encrypted in the iPhone keychain. It is never sent anywhere, logged, or included in a notification.',
        },
        {
          heading: 'What leaves the phone',
          body: 'Your public wallet address is sent to the Solana network (through the app server when one is configured) to read balances and send transfers, which are public on the blockchain. Market data comes from OKX and currency rates from open.er-api.com. None of these requests include your keys.',
        },
        {
          heading: 'If you turn on alerts',
          body: 'The server stores your phone notification token next to your public address, so it can tell you when money arrives. It never stores keys or your recovery phrase, and it forgets your phone when you turn alerts off or remove the wallet.',
        },
        {
          heading: 'What is saved on the phone',
          body: 'Your settings, watchlist, recent searches and the addresses you have sent to are saved on this phone only, and are removed if you delete the app.',
        },
      ]}
    />
  );
}
