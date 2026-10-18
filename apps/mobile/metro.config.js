const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = withUniwindConfig(getDefaultConfig(__dirname), {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});

// Uniwind swaps every `import 'react-native'` for its own className-aware wrapper, which has no
// AssetRegistry. expo-asset needs the real one to load fonts, so give it the real react-native.
const uniwindResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromExpoAsset = context.originModulePath.includes(
    `${path.sep}node_modules${path.sep}expo-asset${path.sep}`,
  );
  if (moduleName === 'react-native' && fromExpoAsset) {
    return context.resolveRequest(context, moduleName, platform);
  }
  return uniwindResolve(context, moduleName, platform);
};

module.exports = config;
