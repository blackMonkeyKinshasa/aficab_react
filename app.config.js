const appJson = require('./app.json');

function toPositiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

module.exports = ({ config }) => {
  const baseConfig = config ?? appJson.expo;
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
