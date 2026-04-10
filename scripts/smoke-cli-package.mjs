import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cliDir = join(root, 'packages', 'cli');
const cursorFixture = join(root, 'fixtures', 'cursor', 'usage-sample.csv');
const tempRoot = mkdtempSync(join(tmpdir(), 'xerg-cli-smoke-'));
const packDir = join(tempRoot, 'pack');
const installDir = join(tempRoot, 'install');
const npmCacheDir = join(tempRoot, 'npm-cache');
const execEnv = {
  ...process.env,
  NPM_CONFIG_CACHE: npmCacheDir,
};

try {
  mkdirSync(packDir, { recursive: true });
  mkdirSync(installDir, { recursive: true });
  mkdirSync(npmCacheDir, { recursive: true });

  const packOutput = execFileSync('npm', ['pack', '--pack-destination', packDir], {
    cwd: cliDir,
    encoding: 'utf8',
    env: execEnv,
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
    env: execEnv,
    stdio: 'pipe',
  });

  const helpOutput = execFileSync('corepack', ['pnpm', 'exec', 'xerg', '--help'], {
    cwd: installDir,
    encoding: 'utf8',
    env: execEnv,
  });
  const versionOutput = execFileSync('corepack', ['pnpm', 'exec', 'xerg', '--version'], {
    cwd: installDir,
    encoding: 'utf8',
    env: execEnv,
  }).trim();
  const auditPayloadOutput = execFileSync(
    'corepack',
    [
      'pnpm',
      'exec',
      'xerg',
      'audit',
      '--cursor-usage-csv',
      cursorFixture,
      '--push',
      '--dry-run',
      '--no-db',
    ],
    {
      cwd: installDir,
      encoding: 'utf8',
      env: execEnv,
    },
  );
  const auditPayload = JSON.parse(auditPayloadOutput);

  if (!helpOutput.includes('xerg <command> [options]')) {
    throw new Error('Installed package did not expose the xerg CLI as expected.');
  }

  if (!/^\d+\.\d+\.\d+/.test(versionOutput)) {
    throw new Error('Installed package did not report a valid semantic version.');
  }

  if (auditPayload?.meta?.cliVersion !== versionOutput) {
    throw new Error(
      `Installed package reported cliVersion ${auditPayload?.meta?.cliVersion ?? 'missing'} in push payload, expected ${versionOutput}.`,
    );
  }

  const bundledSkillPath = join(
    installDir,
    'node_modules',
    '@xerg',
    'cli',
    'skills',
    'xerg',
    'SKILL.md',
  );

  if (!existsSync(bundledSkillPath)) {
    throw new Error('Installed package did not include the bundled Xerg skill.');
  }

  const bundledSkill = readFileSync(bundledSkillPath, 'utf8');
  if (!bundledSkill.includes('name: xerg')) {
    throw new Error('Bundled Xerg skill did not contain expected frontmatter.');
  }

  process.stdout.write('CLI package smoke test passed.\n');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
