const fs = require('fs');
const path = require('path');

const supabaseDistDir = path.join(
  process.cwd(),
  'node_modules',
  '@supabase',
  'supabase-js',
  'dist'
);

const patches = [
  {
    file: 'index.mjs',
    from:
      'if (otelModulePromise === null) otelModulePromise = import(/* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ OTEL_PKG).catch(() => null);',
    to: 'if (otelModulePromise === null) otelModulePromise = Promise.resolve(null);',
  },
  {
    file: 'index.cjs',
    from:
      'if (otelModulePromise === null) otelModulePromise = Promise.resolve(`${OTEL_PKG}`).then((s) => tslib_1.__importStar(require(s))).catch(() => null);',
    to: 'if (otelModulePromise === null) otelModulePromise = Promise.resolve(null);',
  },
];

for (const patch of patches) {
  const filePath = path.join(supabaseDistDir, patch.file);

  if (!fs.existsSync(filePath)) {
    console.warn(`Supabase tracing patch skipped: ${patch.file} not found.`);
    continue;
  }

  const contents = fs.readFileSync(filePath, 'utf8');

  if (contents.includes(patch.to)) {
    console.log(`Supabase tracing patch already applied to ${patch.file}.`);
    continue;
  }

  if (!contents.includes(patch.from)) {
    console.warn(`Supabase tracing patch skipped: expected code not found in ${patch.file}.`);
    continue;
  }

  fs.writeFileSync(filePath, contents.replace(patch.from, patch.to));
  console.log(`Patched Supabase optional OpenTelemetry import in ${patch.file}.`);
}
