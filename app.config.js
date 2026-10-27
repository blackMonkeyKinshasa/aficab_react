const appJson = require('./app.json');

function toPositiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

module.exports = ({ config }) => {
  const rawConfig = config ?? appJson.expo;
  // Native-only app: never enable Expo web / static SSR bundling.
  const { web: _ignoredWeb, ...withoutWeb } = rawConfig;
  const baseConfig = {
    ...withoutWeb,
    platforms: ['ios', 'android'],
  };
  const shouldSyncNativeVersions = process.env.EAS_BUILD === 'true';

  if (!shouldSyncNativeVersions) {
    return baseConfig;
  }

  const iosBuildNumber = toPositiveInt(baseConfig?.ios?.buildNumber);
  const androidVersionCode = toPositiveInt(baseConfig?.android?.versionCode);
  const unifiedVersion = Math.max(iosBuildNumber, androidVersionCode);

  if (unifiedVersion <= 0) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    ios: {
      ...baseConfig.ios,
      buildNumber: String(unifiedVersion),
    },
    android: {
      ...baseConfig.android,
      versionCode: unifiedVersion,
    },
  };
};
