// Runs the tests in ./test under Node. The app's code uses extensionless imports and React Native
// packages, so each test file is bundled with esbuild first, then run with Node's built-in test runner.
//
//   npm test            offline tests (what CI runs)
//   LIVE=1 npm test     also the live checks against devnet, Jupiter and OKX (read-only, nothing is sent)
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, '.test-build');
rmSync(out, { recursive: true, force: true });

const live = process.env.LIVE === '1';
const entries = readdirSync(join(root, 'test'))
  .filter((file) => file.endsWith('.test.ts'))
  .filter((file) => live || !file.startsWith('live.'))
  .map((file) => join(root, 'test', file));

await build({
  entryPoints: entries,
  outdir: out,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outExtension: { '.js': '.cjs' },
  logLevel: 'error',
  alias: { '@react-native-async-storage/async-storage': join(root, 'test/stubs/async-storage.cjs') },
});

const bundles = readdirSync(out).map((file) => join(out, file));
const result = spawnSync(process.execPath, ['--test', ...bundles], { stdio: 'inherit' });
process.exit(result.status ?? 1);
