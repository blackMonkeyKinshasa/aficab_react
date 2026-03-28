const fs = require('fs');
const path = require('path');

const targetDir = path.join(process.cwd(), 'node_modules', 'expo-router');
const targetFile = path.join(targetDir, '_ctx-shared.js');
const content = String.raw`// Ignore root ./+html.js and API route files ./generate+api.tsx.
module.exports = {
  EXPO_ROUTER_CTX_IGNORE:
    /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+(html|native-intent))))\.[tj]sx?$).*\.[tj]sx?$/,
};
`;

if (!fs.existsSync(targetDir)) {
  console.warn('expo-router package not found in node_modules. Skipping patch.');
  process.exit(0);
}

if (!fs.existsSync(targetFile)) {
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('Patched expo-router/_ctx-shared.js');
} else {
  console.log('expo-router/_ctx-shared.js already exists, no patch needed.');
}
