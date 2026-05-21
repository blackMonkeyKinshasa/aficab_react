const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const tarExecutable = process.platform === 'win32' ? 'tar.exe' : 'tar';

const expoRouterDir = path.join(process.cwd(), 'node_modules', 'expo-router');
const expoRouterFile = path.join(expoRouterDir, '_ctx-shared.js');
const expoRouterPluginDir = path.join(expoRouterDir, 'plugin');
const expoRouterAssetsDir = path.join(expoRouterDir, 'assets');
const vendoredExpoRouterPluginDir = path.join(process.cwd(), 'package', 'plugin');
const vendoredExpoRouterAssetsDir = path.join(process.cwd(), 'package', 'assets');
const expoRouterContent = String.raw`// Ignore root ./+html.js and API route files ./generate+api.tsx.
module.exports = {
  EXPO_ROUTER_CTX_IGNORE:
    /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+(html|native-intent))))\.[tj]sx?$).*\.[tj]sx?$/,
};
`;

const expoLocationTsconfigFile = path.join(process.cwd(), 'node_modules', 'expo-location', 'tsconfig.json');
const expoSplashScreenTsconfigFile = path.join(process.cwd(), 'node_modules', 'expo-splash-screen', 'tsconfig.json');
const expoKeepAwakeDir = path.join(process.cwd(), 'node_modules', 'expo-keep-awake');
const gorhomBottomSheetDir = path.join(process.cwd(), 'node_modules', '@gorhom', 'bottom-sheet');
const reactNavigationElementsDir = path.join(
  process.cwd(),
  'node_modules',
  '@react-navigation',
  'elements'
);
const reactNativeGestureHandlerDir = path.join(
  process.cwd(),
  'node_modules',
  'react-native-gesture-handler'
);
const reactNativeSafeAreaContextDir = path.join(
  process.cwd(),
  'node_modules',
  'react-native-safe-area-context'
);
const gorhomPortalDir = path.join(
  process.cwd(),
  'node_modules',
  '@gorhom',
  'portal'
);
const reactNativeGradlePluginDir = path.join(
  process.cwd(),
  'node_modules',
  '@react-native',
  'gradle-plugin'
);
const supabaseAuthJsDir = path.join(
  process.cwd(),
  'node_modules',
  '@supabase',
  'auth-js'
);
const hermesParserDir = path.join(process.cwd(), 'node_modules', 'hermes-parser');
const hermesParserDistDir = path.join(hermesParserDir, 'dist');
const expoMetroRuntimeDir = path.join(process.cwd(), 'node_modules', '@expo', 'metro-runtime');
const expoCliDir = path.join(process.cwd(), 'node_modules', '@expo', 'cli');
const expoPackageManagerDir = path.join(process.cwd(), 'node_modules', '@expo', 'package-manager');

function copyMissingDirectory(sourceDir, targetDir) {
  if (fs.existsSync(targetDir)) {
    return false;
  }

  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  return true;
}

function mergeMissingDirectoryContents(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir) || !fs.lstatSync(sourceDir).isDirectory()) {
    return false;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  let copiedAny = false;

  for (const childName of fs.readdirSync(sourceDir)) {
    if (
      copyMissingPath(
        path.join(sourceDir, childName),
        path.join(targetDir, childName)
      )
    ) {
      copiedAny = true;
    }
  }

  return copiedAny;
}

function copyMissingPath(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  if (fs.existsSync(targetPath)) {
    if (fs.lstatSync(sourcePath).isDirectory() && fs.lstatSync(targetPath).isDirectory()) {
      return mergeMissingDirectoryContents(sourcePath, targetPath);
    }

    return false;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.cpSync(sourcePath, targetPath, { recursive: fs.lstatSync(sourcePath).isDirectory() });
  return true;
}

function copyMissingChildren(sourceDir, targetDir, names) {
  const copiedNames = [];

  for (const name of names) {
    if (
      copyMissingPath(
        path.join(sourceDir, name),
        path.join(targetDir, name)
      )
    ) {
      copiedNames.push(name);
    }
  }

  return copiedNames;
}

function listExistingChildren(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath, { withFileTypes: true }).map((entry) => entry.name);
}

function tryResolveModulePath(basePath) {
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json'];

  if (fs.existsSync(basePath)) {
    return true;
  }

  for (const extension of extensions) {
    if (fs.existsSync(`${basePath}${extension}`)) {
      return true;
    }
  }

  for (const extension of extensions) {
    if (fs.existsSync(path.join(basePath, `index${extension}`))) {
      return true;
    }
  }

  return false;
}

function getPackageEntryCandidates(packageJson) {
  const entries = new Set();

  for (const field of ['main', 'module', 'react-native', 'source']) {
    if (typeof packageJson[field] === 'string' && packageJson[field]) {
      entries.add(packageJson[field]);
    }
  }

  const defaultExport = packageJson.exports?.['.'];
  if (typeof defaultExport === 'string') {
    entries.add(defaultExport);
  } else if (typeof defaultExport?.default === 'string') {
    entries.add(defaultExport.default);
  }

  return [...entries];
}

function getPackageTypeCandidates(packageJson) {
  const entries = new Set();

  if (typeof packageJson.types === 'string' && packageJson.types) {
    entries.add(packageJson.types);
  }

  if (typeof packageJson.typings === 'string' && packageJson.typings) {
    entries.add(packageJson.typings);
  }

  const defaultExport = packageJson.exports?.['.'];
  if (typeof defaultExport?.types === 'string') {
    entries.add(defaultExport.types);
  }

  for (const exportValue of Object.values(packageJson.exports ?? {})) {
    if (typeof exportValue?.types === 'string') {
      entries.add(exportValue.types);
    }

    if (typeof exportValue?.import?.types === 'string') {
      entries.add(exportValue.import.types);
    }

    if (typeof exportValue?.require?.types === 'string') {
      entries.add(exportValue.require.types);
    }
  }

  return [...entries]
    .map((entry) => entry.replace(/\\/g, '/').replace(/^\.\//, ''))
    .filter((entry) => Boolean(entry) && !entry.includes('*'));
}

function getRestoreEntries(packageJson, entryCandidates) {
  const restoreEntries = new Set(['src', 'lib', 'build', 'dist', 'assets']);

  for (const entry of packageJson.files ?? []) {
    if (!entry.startsWith('!')) {
      restoreEntries.add(entry.replace(/\\/g, '/').replace(/\/$/, ''));
    }
  }

  for (const entry of entryCandidates) {
    const normalizedEntry = entry.replace(/\\/g, '/').replace(/^\.\//, '');
    const topLevelEntry = normalizedEntry.split('/')[0];
    if (topLevelEntry) {
      restoreEntries.add(topLevelEntry);
    }
  }

  return [...restoreEntries].filter(Boolean);
}

function patchJsonFile(filePath, mutate) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const originalContent = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(originalContent);
  const changed = mutate(parsed);

  if (!changed) {
    return false;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return true;
}

function withPackedPackage(packageSpec, callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aficab-patch-'));

  try {
    const packOutput = (
      process.platform === 'win32'
        ? execSync(`npm pack ${packageSpec}`, {
            cwd: tempDir,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          })
        : execFileSync('npm', ['pack', packageSpec], {
            cwd: tempDir,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          })
    ).trim();
    const tarballName = packOutput.split(/\r?\n/).pop();

    execFileSync(tarExecutable, ['-xf', tarballName], {
      cwd: tempDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    callback(path.join(tempDir, 'package'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function parseJsonWithComments(content) {
  return JSON.parse(
    content
      .replace(/^\uFEFF/, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/^\s*\/\*[\s\S]*?\*\/\s*/m, '')
  );
}

function replaceExactString(filePath, oldText, newText) {
  if (!fs.existsSync(filePath)) {
    console.warn(`${path.relative(process.cwd(), filePath)} not found. Skipping patch.`);
    return;
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');

  if (fileContent.includes(newText)) {
    console.log(`${path.relative(process.cwd(), filePath)} already patched, no patch needed.`);
    return;
  }

  if (!fileContent.includes(oldText)) {
    console.warn(`${path.relative(process.cwd(), filePath)} did not match the expected content. Skipping patch.`);
    return;
  }

  fs.writeFileSync(filePath, fileContent.replace(oldText, newText), 'utf8');
  console.log(`Patched ${path.relative(process.cwd(), filePath)}.`);
}

function patchExpoRouter() {
  if (!fs.existsSync(expoRouterDir)) {
    console.warn('expo-router package not found in node_modules. Skipping patch.');
    return;
  }

  if (!fs.existsSync(expoRouterPluginDir)) {
    if (!fs.existsSync(vendoredExpoRouterPluginDir)) {
      console.warn('Vendored expo-router plugin not found. Skipping plugin patch.');
    } else {
      fs.cpSync(vendoredExpoRouterPluginDir, expoRouterPluginDir, { recursive: true });
      console.log('Restored expo-router/plugin from vendored package files.');
    }
  }

  if (!fs.existsSync(expoRouterFile)) {
    fs.writeFileSync(expoRouterFile, expoRouterContent, 'utf8');
    console.log('Patched expo-router/_ctx-shared.js');
  } else {
    console.log('expo-router/_ctx-shared.js already exists, no patch needed.');
  }
}

function patchExpoRouterAssets() {
  if (!fs.existsSync(expoRouterDir)) {
    console.warn('expo-router package not found in node_modules. Skipping assets patch.');
    return;
  }

  const expoRouterPackageJson = JSON.parse(
    fs.readFileSync(path.join(expoRouterDir, 'package.json'), 'utf8')
  );
  const restoredFromVendored = fs.existsSync(vendoredExpoRouterAssetsDir)
    ? copyMissingChildren(
        vendoredExpoRouterAssetsDir,
        expoRouterAssetsDir,
        listExistingChildren(vendoredExpoRouterAssetsDir)
      )
    : [];

  const packageSpec = `expo-router@${expoRouterPackageJson.version}`;

  withPackedPackage(packageSpec, (packedPackageDir) => {
    const packedAssetsDir = path.join(packedPackageDir, 'assets');
    const restoredFromPackage = copyMissingChildren(
      packedAssetsDir,
      expoRouterAssetsDir,
      listExistingChildren(packedAssetsDir)
    );

    const missingAssets = listExistingChildren(packedAssetsDir).filter(
      (name) => !fs.existsSync(path.join(expoRouterAssetsDir, name))
    );

    if (missingAssets.length > 0) {
      throw new Error(`Unable to restore expo-router assets: ${missingAssets.join(', ')}`);
    }

    const restoredAssets = [...restoredFromVendored, ...restoredFromPackage];

    if (restoredAssets.length === 0) {
      console.log('expo-router/assets already matches the published package, no patch needed.');
      return;
    }

    console.log(`Restored expo-router assets: ${restoredAssets.join(', ')}.`);
  });
}

function patchExpoLocationTsconfig() {
  if (!fs.existsSync(expoLocationTsconfigFile)) {
    console.warn('expo-location tsconfig not found in node_modules. Skipping patch.');
    return;
  }

  const fileContent = fs.readFileSync(expoLocationTsconfigFile, 'utf8');
  const parsed = parseJsonWithComments(fileContent);

  if (parsed.compilerOptions?.rootDir === './src') {
    console.log('expo-location/tsconfig.json already has rootDir, no patch needed.');
    return;
  }

  parsed.compilerOptions = {
    ...(parsed.compilerOptions ?? {}),
    rootDir: './src',
  };

  fs.writeFileSync(expoLocationTsconfigFile, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  console.log('Patched expo-location/tsconfig.json with rootDir.');
}

function patchExpoSplashScreenTsconfig() {
  if (!fs.existsSync(expoSplashScreenTsconfigFile)) {
    console.warn('expo-splash-screen tsconfig not found in node_modules. Skipping patch.');
    return;
  }

  const fileContent = fs.readFileSync(expoSplashScreenTsconfigFile, 'utf8');
  const parsed = parseJsonWithComments(fileContent);

  if (parsed.compilerOptions?.rootDir === './src') {
    console.log('expo-splash-screen/tsconfig.json already has rootDir, no patch needed.');
    return;
  }

  parsed.compilerOptions = {
    ...(parsed.compilerOptions ?? {}),
    rootDir: './src',
  };

  fs.writeFileSync(expoSplashScreenTsconfigFile, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  console.log('Patched expo-splash-screen/tsconfig.json with rootDir.');
}

function patchHermesParser() {
  if (!fs.existsSync(hermesParserDir)) {
    console.warn('hermes-parser package not found in node_modules. Skipping patch.');
    return;
  }

  const requiredDirs = ['transform', 'traverse', 'utils'];
  const missingDirs = requiredDirs.filter(
    (dirName) => !fs.existsSync(path.join(hermesParserDistDir, dirName))
  );

  if (missingDirs.length === 0) {
    console.log('hermes-parser/dist has all required directories, no patch needed.');
    return;
  }

  const hermesParserPackageJson = JSON.parse(
    fs.readFileSync(path.join(hermesParserDir, 'package.json'), 'utf8')
  );
  const packageSpec = `hermes-parser@${hermesParserPackageJson.version}`;

  withPackedPackage(packageSpec, (packedPackageDir) => {
    const packedDistDir = path.join(packedPackageDir, 'dist');
    let copiedCount = 0;

    for (const dirName of missingDirs) {
      if (
        copyMissingDirectory(
          path.join(packedDistDir, dirName),
          path.join(hermesParserDistDir, dirName)
        )
      ) {
        copiedCount += 1;
      }

      copyMissingDirectory(
        path.join(packedDistDir, 'src', dirName),
        path.join(hermesParserDistDir, 'src', dirName)
      );
    }

    console.log(
      `Restored hermes-parser dist directories from published package: ${missingDirs.join(', ')}.`
    );
  });
}

function patchExpoMetroRuntime() {
  if (!fs.existsSync(expoMetroRuntimeDir)) {
    console.warn('@expo/metro-runtime package not found in node_modules. Skipping patch.');
    return;
  }

  const packageJsonPath = path.join(expoMetroRuntimeDir, 'package.json');
  const expoMetroRuntimePackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const mainEntryPath = expoMetroRuntimePackageJson.main
    ? path.join(expoMetroRuntimeDir, expoMetroRuntimePackageJson.main)
    : null;

  if (!mainEntryPath || fs.existsSync(mainEntryPath)) {
    console.log('@expo/metro-runtime main entry exists, no patch needed.');
    return;
  }

  const packageSpec = `@expo/metro-runtime@${expoMetroRuntimePackageJson.version}`;

  withPackedPackage(packageSpec, (packedPackageDir) => {
    const entriesToRestore = new Set([
      'src',
      'build',
      'rsc',
      'assets',
      'async-require.js',
      'async-require.d.ts',
      'error-overlay.js',
      'error-overlay.d.ts',
    ]);

    for (const entry of expoMetroRuntimePackageJson.files ?? []) {
      if (!entry.startsWith('!')) {
        entriesToRestore.add(entry);
      }
    }

    const restoredEntries = [];

    for (const entry of entriesToRestore) {
      if (
        copyMissingPath(
          path.join(packedPackageDir, entry),
          path.join(expoMetroRuntimeDir, entry)
        )
      ) {
        restoredEntries.push(entry);
      }
    }

    if (!fs.existsSync(mainEntryPath)) {
      throw new Error(`Unable to restore @expo/metro-runtime main entry: ${expoMetroRuntimePackageJson.main}`);
    }

    console.log(
      `Restored @expo/metro-runtime package contents from published package: ${restoredEntries.join(', ')}.`
    );
  });
}

function patchExpoPackageManager() {
  if (!fs.existsSync(expoCliDir)) {
    console.warn('@expo/cli package not found in node_modules. Skipping @expo/package-manager patch.');
    return;
  }

  const expoCliPackageJson = JSON.parse(
    fs.readFileSync(path.join(expoCliDir, 'package.json'), 'utf8')
  );
  const dependencySpec = expoCliPackageJson.dependencies?.['@expo/package-manager'];

  if (!dependencySpec) {
    console.warn('@expo/cli does not declare @expo/package-manager. Skipping patch.');
    return;
  }

  const packageJsonPath = path.join(expoPackageManagerDir, 'package.json');
  const installedPackageJson = fs.existsSync(packageJsonPath)
    ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    : null;
  const packageSpec = installedPackageJson
    ? `@expo/package-manager@${installedPackageJson.version}`
    : `@expo/package-manager@${dependencySpec}`;
  const mainEntry = installedPackageJson?.main ?? 'build/index.js';
  const typeEntry = installedPackageJson?.types ?? null;

  if (
    tryResolveModulePath(path.join(expoPackageManagerDir, mainEntry))
    && (!typeEntry || fs.existsSync(path.join(expoPackageManagerDir, typeEntry)))
  ) {
    console.log('@expo/package-manager main entry exists, no patch needed.');
    return;
  }

  withPackedPackage(packageSpec, (packedPackageDir) => {
    const packedPackageJson = JSON.parse(
      fs.readFileSync(path.join(packedPackageDir, 'package.json'), 'utf8')
    );
    const restoreEntries = new Set([
      'package.json',
      ...getRestoreEntries(packedPackageJson, [
        ...getPackageEntryCandidates(packedPackageJson),
        ...getPackageTypeCandidates(packedPackageJson),
      ]),
    ]);
    const restoredEntries = [];

    for (const entry of restoreEntries) {
      if (
        copyMissingPath(
          path.join(packedPackageDir, entry),
          path.join(expoPackageManagerDir, entry)
        )
      ) {
        restoredEntries.push(entry);
      }
    }

    if (!tryResolveModulePath(path.join(expoPackageManagerDir, packedPackageJson.main))) {
      throw new Error(
        `Unable to restore @expo/package-manager main entry: ${packedPackageJson.main}`
      );
    }

    console.log(
      `Restored @expo/package-manager package contents from published package: ${restoredEntries.join(', ')}.`
    );
  });
}

function patchExpoKeepAwake() {
  if (!fs.existsSync(expoKeepAwakeDir)) {
    console.warn('expo-keep-awake package not found in node_modules. Skipping patch.');
    return;
  }

  const packageJsonPath = path.join(expoKeepAwakeDir, 'package.json');
  const expoKeepAwakePackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const defaultExportPath = expoKeepAwakePackageJson.exports?.['.']?.default
    ? path.join(expoKeepAwakeDir, expoKeepAwakePackageJson.exports['.'].default)
    : null;

  if (!defaultExportPath || fs.existsSync(defaultExportPath)) {
    console.log('expo-keep-awake default export exists, no patch needed.');
    return;
  }

  const packageSpec = `expo-keep-awake@${expoKeepAwakePackageJson.version}`;

  withPackedPackage(packageSpec, (packedPackageDir) => {
    const restoredEntries = [];

    for (const entry of ['src', 'build']) {
      if (
        copyMissingPath(
          path.join(packedPackageDir, entry),
          path.join(expoKeepAwakeDir, entry)
        )
      ) {
        restoredEntries.push(entry);
      }
    }

    if (!fs.existsSync(defaultExportPath)) {
      throw new Error(
        `Unable to restore expo-keep-awake default export: ${expoKeepAwakePackageJson.exports['.'].default}`
      );
    }

    console.log(
      `Restored expo-keep-awake package contents from published package: ${restoredEntries.join(', ')}.`
    );
  });
}

function patchReactNavigationElements() {
  if (!fs.existsSync(reactNavigationElementsDir)) {
    console.warn('@react-navigation/elements package not found in node_modules. Skipping patch.');
    return;
  }

  const packageJsonPath = path.join(reactNavigationElementsDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const expectedAssetPath = path.join(
    reactNavigationElementsDir,
    'lib',
    'module',
    'assets',
    'back-icon.png'
  );

  if (fs.existsSync(expectedAssetPath)) {
    console.log('@react-navigation/elements assets exist, no patch needed.');
    return;
  }

  const packageSpec = `@react-navigation/elements@${packageJson.version}`;

  withPackedPackage(packageSpec, (packedPackageDir) => {
    const restoredEntries = [];

    for (const entry of ['lib', 'src']) {
      if (
        copyMissingPath(
          path.join(packedPackageDir, entry),
          path.join(reactNavigationElementsDir, entry)
        )
      ) {
        restoredEntries.push(entry);
      }
    }

    if (!fs.existsSync(expectedAssetPath)) {
      throw new Error('Unable to restore @react-navigation/elements assets.');
    }

    console.log(
      `Restored @react-navigation/elements package contents from published package: ${restoredEntries.join(', ')}.`
    );
  });
}

function patchReactNativeGestureHandler() {
  if (!fs.existsSync(reactNativeGestureHandlerDir)) {
    console.warn('react-native-gesture-handler package not found in node_modules. Skipping patch.');
    return;
  }

  const packageJsonPath = path.join(reactNativeGestureHandlerDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const reactNativeEntryPath = packageJson['react-native']
    ? path.join(reactNativeGestureHandlerDir, packageJson['react-native'])
    : null;

  if (!reactNativeEntryPath || fs.existsSync(reactNativeEntryPath)) {
    console.log('react-native-gesture-handler React Native entry exists, no patch needed.');
    return;
  }

  const packageSpec = `react-native-gesture-handler@${packageJson.version}`;

  withPackedPackage(packageSpec, (packedPackageDir) => {
    const restoredEntries = [];

    for (const entry of ['src', 'lib']) {
      if (
        copyMissingPath(
          path.join(packedPackageDir, entry),
          path.join(reactNativeGestureHandlerDir, entry)
        )
      ) {
        restoredEntries.push(entry);
      }
    }

    if (!fs.existsSync(reactNativeEntryPath)) {
      throw new Error(
        `Unable to restore react-native-gesture-handler entry: ${packageJson['react-native']}`
      );
    }

    console.log(
      `Restored react-native-gesture-handler package contents from published package: ${restoredEntries.join(', ')}.`
    );
  });
}

function patchGorhomBottomSheet() {
  if (!fs.existsSync(gorhomBottomSheetDir)) {
    console.warn('@gorhom/bottom-sheet package not found in node_modules. Skipping patch.');
    return;
  }

  const packageJsonPath = path.join(gorhomBottomSheetDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const reactNativeEntryPath = packageJson['react-native']
    ? path.join(gorhomBottomSheetDir, packageJson['react-native'])
    : null;

  if (!reactNativeEntryPath || fs.existsSync(reactNativeEntryPath)) {
    console.log('@gorhom/bottom-sheet React Native entry exists, no patch needed.');
    return;
  }

  const packageSpec = `@gorhom/bottom-sheet@${packageJson.version}`;

  withPackedPackage(packageSpec, (packedPackageDir) => {
    const restoredEntries = [];

    for (const entry of ['src', 'lib']) {
      if (
        copyMissingPath(
          path.join(packedPackageDir, entry),
          path.join(gorhomBottomSheetDir, entry)
        )
      ) {
        restoredEntries.push(entry);
      }
    }

    if (!fs.existsSync(reactNativeEntryPath)) {
      throw new Error(`Unable to restore @gorhom/bottom-sheet entry: ${packageJson['react-native']}`);
    }

    console.log(
      `Restored @gorhom/bottom-sheet package contents from published package: ${restoredEntries.join(', ')}.`
    );
  });
}

function patchExpoCliBundledNativeModulesFallback() {
  const bundledNativeModulesFile = path.join(
    process.cwd(),
    'node_modules',
    '@expo',
    'cli',
    'build',
    'src',
    'start',
    'doctor',
    'dependencies',
    'bundledNativeModules.js'
  );

  replaceExactString(
    bundledNativeModulesFile,
    "            if (error instanceof _errors.CommandError && (error.code === 'OFFLINE' || error.code === 'API')) {\n                _log.warn((0, _chalk().default)`Unable to reach well-known versions endpoint. Using local dependency map {bold expo/bundledNativeModules.json} for version validation`);\n            } else {\n                throw error;\n            }",
    "            if (error instanceof _errors.CommandError && (error.code === 'OFFLINE' || error.code === 'API') || error instanceof TypeError && (error.message === 'fetch failed' || error.message === 'Body is unusable: Body has already been read')) {\n                _log.warn((0, _chalk().default)`Unable to reach well-known versions endpoint. Using local dependency map {bold expo/bundledNativeModules.json} for version validation`);\n            } else {\n                throw error;\n            }"
  );
}

function patchReactNativeSafeAreaContext() {
  if (!fs.existsSync(reactNativeSafeAreaContextDir)) {
    console.warn('react-native-safe-area-context package not found in node_modules. Skipping patch.');
    return;
  }

  const packageJsonPath = path.join(reactNativeSafeAreaContextDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const sourceEntry = 'src/index';

  if (!tryResolveModulePath(path.join(reactNativeSafeAreaContextDir, sourceEntry))) {
    const packageSpec = `react-native-safe-area-context@${packageJson.version}`;

    withPackedPackage(packageSpec, (packedPackageDir) => {
      const restoredEntries = [];

      for (const entry of ['src', 'lib', 'common', 'android', 'ios', 'jest', 'react-native.config.js']) {
        if (
          copyMissingPath(
            path.join(packedPackageDir, entry),
            path.join(reactNativeSafeAreaContextDir, entry)
          )
        ) {
          restoredEntries.push(entry);
        }
      }

      if (!tryResolveModulePath(path.join(reactNativeSafeAreaContextDir, sourceEntry))) {
        console.warn('Unable to restore react-native-safe-area-context source entry from the published package.');
        return;
      }

      console.log(
        `Restored react-native-safe-area-context package contents from published package: ${restoredEntries.join(', ')}.`
      );
    });
  }

  if (tryResolveModulePath(path.join(reactNativeSafeAreaContextDir, sourceEntry))) {
    const changed = patchJsonFile(packageJsonPath, (mutablePackageJson) => {
      let hasChanges = false;

      for (const field of ['react-native', 'source']) {
        if (mutablePackageJson[field] !== 'src/index.tsx') {
          mutablePackageJson[field] = 'src/index.tsx';
          hasChanges = true;
        }
      }

      return hasChanges;
    });

    if (changed) {
      console.log('Patched react-native-safe-area-context package.json to restore source entrypoints.');
    }
  }
}

function patchMissingTypeDeclarations() {
  const projectPackageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  );
  const dependencyNames = [
    ...Object.keys(projectPackageJson.dependencies ?? {}),
    ...Object.keys(projectPackageJson.devDependencies ?? {}),
  ];

  for (const dependencyName of dependencyNames) {
    const packageDir = path.join(process.cwd(), 'node_modules', ...dependencyName.split('/'));
    const packageJsonPath = path.join(packageDir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const typeCandidates = getPackageTypeCandidates(packageJson);
    const missingTypeEntries = typeCandidates.filter(
      (entry) => !fs.existsSync(path.join(packageDir, entry))
    );

    if (missingTypeEntries.length === 0) {
      continue;
    }

    const restoreEntries = getRestoreEntries(packageJson, missingTypeEntries);
    const packageSpec = `${dependencyName}@${packageJson.version}`;

    withPackedPackage(packageSpec, (packedPackageDir) => {
      const restoredEntries = [];

      for (const entry of restoreEntries) {
        if (
          copyMissingPath(
            path.join(packedPackageDir, entry),
            path.join(packageDir, entry)
          )
        ) {
          restoredEntries.push(entry);
        }
      }

      const unresolvedTypeEntries = missingTypeEntries.filter(
        (entry) => !fs.existsSync(path.join(packageDir, entry))
      );

      if (unresolvedTypeEntries.length > 0) {
        throw new Error(
          `Unable to restore ${dependencyName} type declarations: ${unresolvedTypeEntries.join(', ')}`
        );
      }

      console.log(
        `Restored ${dependencyName} published type files from package tarball: ${restoredEntries.join(', ')}.`
      );
    });
  }
}

function patchGorhomPortal() {
  if (!fs.existsSync(gorhomPortalDir)) {
    console.warn('@gorhom/portal package not found in node_modules. Skipping patch.');
    return;
  }

  const packageJsonPath = path.join(gorhomPortalDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const reactNativeEntryPath = tryResolveModulePath(
    path.join(gorhomPortalDir, packageJson['react-native'])
  );
  const portalComponentPath = tryResolveModulePath(
    path.join(gorhomPortalDir, 'src/components/portal/Portal')
  );

  if (reactNativeEntryPath && portalComponentPath) {
    console.log('@gorhom/portal React Native sources exist, no patch needed.');
    return;
  }

  const packageSpec = `@gorhom/portal@${packageJson.version}`;

  withPackedPackage(packageSpec, (packedPackageDir) => {
    const restoredEntries = [];

    for (const entry of ['src', 'lib']) {
      if (copyMissingPath(path.join(packedPackageDir, entry), path.join(gorhomPortalDir, entry))) {
        restoredEntries.push(entry);
      }
    }

    if (
      !tryResolveModulePath(path.join(gorhomPortalDir, packageJson['react-native']))
      || !tryResolveModulePath(path.join(gorhomPortalDir, 'src/components/portal/Portal'))
    ) {
      throw new Error('Unable to restore @gorhom/portal React Native sources.');
    }

    console.log(
      `Restored @gorhom/portal package contents from published package: ${restoredEntries.join(', ')}.`
    );
  });
}

function patchReactNativeGradlePlugin() {
  if (!fs.existsSync(reactNativeGradlePluginDir)) {
    console.warn('@react-native/gradle-plugin package not found in node_modules. Skipping patch.');
    return;
  }

  const packageJsonPath = path.join(reactNativeGradlePluginDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredEntries = [
    'settings.gradle.kts',
    'build.gradle.kts',
    'gradle',
    'gradle/libs.versions.toml',
    'react-native-gradle-plugin',
    'react-native-gradle-plugin/build.gradle.kts',
    'settings-plugin',
    'settings-plugin/build.gradle.kts',
    'shared',
    'shared/build.gradle.kts',
    'shared-testutil',
    'shared-testutil/build.gradle.kts',
  ];
  const missingEntries = requiredEntries.filter(
    (entry) => !fs.existsSync(path.join(reactNativeGradlePluginDir, entry))
  );

  if (missingEntries.length === 0) {
    console.log('@react-native/gradle-plugin settings plugin files exist, no patch needed.');
    return;
  }

  const packageSpec = `@react-native/gradle-plugin@${packageJson.version}`;

  withPackedPackage(packageSpec, (packedPackageDir) => {
    const restoredEntries = [];

    for (const entry of requiredEntries) {
      if (
        copyMissingPath(
          path.join(packedPackageDir, entry),
          path.join(reactNativeGradlePluginDir, entry)
        )
      ) {
        restoredEntries.push(entry);
      }
    }

    const unresolvedEntries = requiredEntries.filter(
      (entry) => !fs.existsSync(path.join(reactNativeGradlePluginDir, entry))
    );

    if (unresolvedEntries.length > 0) {
      throw new Error(
        `Unable to restore @react-native/gradle-plugin entries: ${unresolvedEntries.join(', ')}`
      );
    }

    console.log(
      `Restored @react-native/gradle-plugin package contents from published package: ${restoredEntries.join(', ')}.`
    );
  });
}

function patchSupabaseAuthJs() {
  if (!fs.existsSync(supabaseAuthJsDir)) {
    console.warn('@supabase/auth-js package not found in node_modules. Skipping patch.');
    return;
  }

  const packageJsonPath = path.join(supabaseAuthJsDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredEntries = ['dist', 'dist/module/index.d.ts', 'dist/main/index.d.ts', 'src'];
  const missingEntries = requiredEntries.filter(
    (entry) => !fs.existsSync(path.join(supabaseAuthJsDir, entry))
  );

  if (missingEntries.length === 0) {
    console.log('@supabase/auth-js type files exist, no patch needed.');
    return;
  }

  const packageSpec = `@supabase/auth-js@${packageJson.version}`;

  withPackedPackage(packageSpec, (packedPackageDir) => {
    const restoredEntries = [];

    for (const entry of requiredEntries) {
      if (
        copyMissingPath(
          path.join(packedPackageDir, entry),
          path.join(supabaseAuthJsDir, entry)
        )
      ) {
        restoredEntries.push(entry);
      }
    }

    const unresolvedEntries = requiredEntries.filter(
      (entry) => !fs.existsSync(path.join(supabaseAuthJsDir, entry))
    );

    if (unresolvedEntries.length > 0) {
      throw new Error(
        `Unable to restore @supabase/auth-js entries: ${unresolvedEntries.join(', ')}`
      );
    }

    console.log(
      `Restored @supabase/auth-js package contents from published package: ${restoredEntries.join(', ')}.`
    );
  });
}

function patchBrokenDependencyManifests() {
  const projectPackageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  );
  const dependencyNames = Object.keys(projectPackageJson.dependencies ?? {});

  for (const dependencyName of dependencyNames) {
    const packageDir = path.join(process.cwd(), 'node_modules', ...dependencyName.split('/'));
    const packageJsonPath = path.join(packageDir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const fallbackEntry = [packageJson.module, packageJson.main].find(
      (entry) => typeof entry === 'string' && tryResolveModulePath(path.join(packageDir, entry))
    );

    if (!fallbackEntry) {
      continue;
    }

    const changed = patchJsonFile(packageJsonPath, (mutablePackageJson) => {
      let hasChanges = false;

      for (const field of ['react-native', 'source']) {
        const fieldValue = mutablePackageJson[field];
        if (
          typeof fieldValue === 'string'
          && fieldValue.startsWith('src/')
          && !tryResolveModulePath(path.join(packageDir, fieldValue))
        ) {
          mutablePackageJson[field] = fallbackEntry;
          hasChanges = true;
        }
      }

      const defaultExport = mutablePackageJson.exports?.['.'];
      if (
        typeof defaultExport?.default === 'string'
        && defaultExport.default.includes('src/')
        && !tryResolveModulePath(path.join(packageDir, defaultExport.default))
      ) {
        defaultExport.default = fallbackEntry.startsWith('.') ? fallbackEntry : `./${fallbackEntry}`;
        hasChanges = true;
      }

      return hasChanges;
    });

    if (changed) {
      console.log(`Patched ${dependencyName} package.json to use compiled entrypoints.`);
    }
  }
}

function patchBrokenDirectDependencies() {
  const projectPackageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  );
  const dependencyNames = Object.keys(projectPackageJson.dependencies ?? {});

  for (const dependencyName of dependencyNames) {
    const packageDir = path.join(process.cwd(), 'node_modules', ...dependencyName.split('/'));
    const packageJsonPath = path.join(packageDir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    const dependencyPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const entryCandidates = getPackageEntryCandidates(dependencyPackageJson);
    const missingEntries = entryCandidates.filter(
      (entry) => entry.startsWith('src/') && !tryResolveModulePath(path.join(packageDir, entry))
    );

    if (missingEntries.length === 0) {
      continue;
    }

    const restoreEntries = getRestoreEntries(dependencyPackageJson, missingEntries);
    const packageSpec = `${dependencyName}@${dependencyPackageJson.version}`;

    withPackedPackage(packageSpec, (packedPackageDir) => {
      const restoredEntries = [];

      for (const entry of restoreEntries) {
        if (
          copyMissingPath(
            path.join(packedPackageDir, entry),
            path.join(packageDir, entry)
          )
        ) {
          restoredEntries.push(entry);
        }
      }

      const unresolvedEntries = missingEntries.filter(
        (entry) => !tryResolveModulePath(path.join(packageDir, entry))
      );

      if (unresolvedEntries.length > 0) {
        console.warn(
          `Unable to restore ${dependencyName} entries from the published package: ${unresolvedEntries.join(', ')}. Falling back to manifest patching if possible.`
        );
        return;
      }

      console.log(
        `Restored ${dependencyName} package contents from published package: ${restoredEntries.join(', ')}.`
      );
    });
  }
}

function getExpoModulePublication(moduleConfig) {
  if (!moduleConfig?.android) {
    return null;
  }

  if (moduleConfig.android.publication) {
    return moduleConfig.android.publication;
  }

  if (Array.isArray(moduleConfig.android.projects)) {
    for (const projectConfig of moduleConfig.android.projects) {
      if (projectConfig?.publication) {
        return projectConfig.publication;
      }
    }
  }

  return null;
}

function patchExpoLocalMavenRepos() {
  const nodeModulesDir = path.join(process.cwd(), 'node_modules');

  if (!fs.existsSync(nodeModulesDir)) {
    console.warn('node_modules directory not found. Skipping Expo local Maven repository patch.');
    return;
  }

  const expoPackageDirs = fs.readdirSync(nodeModulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^expo($|-)/.test(entry.name))
    .map((entry) => path.join(nodeModulesDir, entry.name));

  let restoredPackages = 0;

  for (const packageDir of expoPackageDirs) {
    const moduleConfigPath = path.join(packageDir, 'expo-module.config.json');
    const localMavenRepoDir = path.join(packageDir, 'local-maven-repo');
    const packageJsonPath = path.join(packageDir, 'package.json');

    if (!fs.existsSync(moduleConfigPath) || !fs.existsSync(localMavenRepoDir) || !fs.existsSync(packageJsonPath)) {
      continue;
    }

    const moduleConfig = JSON.parse(fs.readFileSync(moduleConfigPath, 'utf8'));
    const publication = getExpoModulePublication(moduleConfig);

    if (!publication?.groupId || !publication?.artifactId || !publication?.version) {
      continue;
    }

    const artifactDir = path.join(
      localMavenRepoDir,
      ...publication.groupId.split('.'),
      publication.artifactId,
      publication.version
    );

    const pomPath = path.join(artifactDir, `${publication.artifactId}-${publication.version}.pom`);
    const moduleMetadataPath = path.join(artifactDir, `${publication.artifactId}-${publication.version}.module`);

    if (fs.existsSync(pomPath) && fs.existsSync(moduleMetadataPath)) {
      continue;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const packageSpec = `${packageJson.name}@${packageJson.version}`;

    withPackedPackage(packageSpec, (packedPackageDir) => {
      const packedLocalMavenRepoDir = path.join(packedPackageDir, 'local-maven-repo');

      if (!fs.existsSync(packedLocalMavenRepoDir)) {
        throw new Error(`Published package ${packageSpec} does not include local-maven-repo.`);
      }

      copyMissingPath(packedLocalMavenRepoDir, localMavenRepoDir);

      if (!fs.existsSync(pomPath) || !fs.existsSync(moduleMetadataPath)) {
        throw new Error(
          `Unable to restore Expo local Maven metadata for ${packageJson.name}: ${publication.groupId}:${publication.artifactId}:${publication.version}`
        );
      }

      restoredPackages += 1;
      console.log(`Restored ${packageJson.name} local-maven-repo metadata from published package.`);
    });
  }

  if (restoredPackages === 0) {
    console.log('Expo local Maven repositories already include required metadata, no patch needed.');
  }
}

patchExpoRouter();
patchExpoRouterAssets();
patchExpoLocationTsconfig();
patchExpoSplashScreenTsconfig();
patchHermesParser();
patchExpoKeepAwake();
patchReactNavigationElements();
patchGorhomBottomSheet();
patchReactNativeGestureHandler();
patchExpoMetroRuntime();
patchExpoPackageManager();
patchExpoCliBundledNativeModulesFallback();
patchBrokenDirectDependencies();
patchExpoLocalMavenRepos();
patchMissingTypeDeclarations();
patchReactNativeSafeAreaContext();
patchGorhomPortal();
patchReactNativeGradlePlugin();
patchSupabaseAuthJs();
patchBrokenDependencyManifests();
