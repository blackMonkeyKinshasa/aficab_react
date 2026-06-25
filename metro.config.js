const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const emptyStub = path.resolve(__dirname, 'metro-stubs/empty.js');
const config = withNativeWind(getDefaultConfig(__dirname), { input: './global.css' });
const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@opentelemetry/api' || moduleName.startsWith('@opentelemetry/')) {
    return { type: 'sourceFile', filePath: emptyStub };
  }

  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
