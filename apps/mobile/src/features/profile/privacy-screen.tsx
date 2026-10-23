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
          body: 'Your public wallet address is sent to the Solana network node to read balances and send transfers, which are public on the blockchain. Market data is requested from OKX. A currency rate is requested from open.er-api.com. None of these requests include your keys.',
        },
        {
          heading: 'What is saved on the phone',
          body: 'Your settings, watchlist, recent searches and the addresses you have sent to are saved on this phone only, and are removed if you delete the app.',
        },
      ]}
    />
  );
}
