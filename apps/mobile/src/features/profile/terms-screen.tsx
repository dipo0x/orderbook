import { InfoScreen } from './info-screen';

export function TermsScreen() {
  return (
    <InfoScreen
      title="Terms of use"
      sections={[
        {
          heading: 'Early software',
          body: 'This app is still being built. It can have bugs. Use test networks first, and only send small amounts on mainnet.',
        },
        {
          heading: 'You hold the keys',
          body: 'Your wallet lives on this phone. Nobody else can recover it, reverse a transfer, or reset your PIN. If you lose your 12-word recovery phrase and this phone, the funds are gone.',
        },
        {
          heading: 'Not financial advice',
          body: 'Prices and order books come from OKX and can be delayed or wrong. Nothing in the app is advice to buy or sell.',
        },
        {
          heading: 'No warranty',
          body: 'The app is provided as it is. You are responsible for the transfers you sign.',
        },
      ]}
    />
  );
}
