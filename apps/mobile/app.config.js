// Extends app.json. Remote push notifications need Apple's Push Notifications capability, which free
// "Personal Team" developer accounts don't have, so the plugin that requests it is opt-in:
//
//   ENABLE_PUSH=1 npx expo prebuild --platform ios --clean     (needs a paid Apple Developer account)
//
// Without it the app builds on any account, and the Notifications screen explains why alerts are unavailable.
module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), ...(process.env.ENABLE_PUSH === '1' ? [['expo-notifications', { color: '#f0b90b' }]] : [])],
});
