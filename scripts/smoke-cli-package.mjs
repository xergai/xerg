import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cliDir = join(root, 'packages', 'cli');
const tempRoot = mkdtempSync(join(tmpdir(), 'xerg-cli-smoke-'));
const packDir = join(tempRoot, 'pack');
const installDir = join(tempRoot, 'install');

try {
  mkdirSync(packDir, { recursive: true });
  mkdirSync(installDir, { recursive: true });

  const packOutput = execFileSync('npm', ['pack', '--pack-destination', packDir], {
    cwd: cliDir,
    encoding: 'utf8',
  }).trim();
  const tarballName = packOutput.split('\n').filter(Boolean).at(-1);

  if (!tarballName) {
    throw new Error('npm pack did not return a tarball name.');
  }

  writeFileSync(
    join(installDir, 'package.json'),
    JSON.stringify(
      {
        name: 'xerg-cli-smoke',
        private: true,
      },
      null,
      2,
    ),
  );

  execFileSync('corepack', ['pnpm', 'add', join(packDir, tarballName)], {
    cwd: installDir,
    stdio: 'pipe',
  });

  const helpOutput = execFileSync('corepack', ['pnpm', 'exec', 'xerg', '--help'], {
    cwd: installDir,
    encoding: 'utf8',
  });
  const versionOutput = execFileSync('corepack', ['pnpm', 'exec', 'xerg', '--version'], {
    cwd: installDir,
    encoding: 'utf8',
  }).trim();

  if (!helpOutput.includes('xerg <command> [options]')) {
    throw new Error('Installed package did not expose the xerg CLI as expected.');
  }

  if (!/^\d+\.\d+\.\d+/.test(versionOutput)) {
    throw new Error('Installed package did not report a valid semantic version.');
  }

  process.stdout.write('CLI package smoke test passed.\n');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
