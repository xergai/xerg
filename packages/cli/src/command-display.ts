const PACKAGE_NAME = '@xerg/cli';
const DEFAULT_COMMAND_PREFIX = 'xerg';

type PackageExecutor = 'npx' | 'pnpm dlx' | 'yarn dlx' | 'bunx';

export interface CommandDisplay {
  prefix: string;
  name: string;
}

export function resolveCommandDisplay(context?: {
  argv?: string[];
  env?: NodeJS.ProcessEnv;
}): CommandDisplay {
  const runner = detectPackageExecutor(context);
  if (!runner) {
    return {
      prefix: DEFAULT_COMMAND_PREFIX,
      name: DEFAULT_COMMAND_PREFIX,
    };
  }

  return {
    prefix: `${runner} ${PACKAGE_NAME}`,
    name: PACKAGE_NAME,
  };
}

export function formatCommand(
  command: string | string[],
  commandPrefix = resolveCommandDisplay().prefix,
): string {
  const suffix = Array.isArray(command) ? command.join(' ') : command;
  return suffix ? `${commandPrefix} ${suffix}` : commandPrefix;
}

function detectPackageExecutor(context?: {
  argv?: string[];
  env?: NodeJS.ProcessEnv;
}): PackageExecutor | null {
  const env = context?.env ?? process.env;
  const argv = context?.argv ?? process.argv;

  const userAgent = normalizeSignal(env.npm_config_user_agent);
  const execPath = normalizeSignal(env.npm_execpath);
  const argvPath = normalizeSignal(argv[1]);

  const fromArgvPath = detectRunnerFromArgvPath(argvPath);
  if (fromArgvPath) {
    return fromArgvPath;
  }

  if (looksLikeInstalledCli(argvPath)) {
    return null;
  }

  const fromUserAgent = detectRunnerFromSignal(userAgent);
  if (fromUserAgent) {
    return fromUserAgent;
  }

  const fromExecPath = detectRunnerFromSignal(execPath);
  if (fromExecPath) {
    return fromExecPath;
  }

  if (argvPath.includes('/_npx/') || argvPath.includes('\\_npx\\')) {
    return 'npx';
  }

  if (argvPath.includes('/.yarn/') && argvPath.includes('/dlx/')) {
    return 'yarn dlx';
  }

  if (argvPath.includes('/bunx/') || argvPath.includes('\\bunx\\')) {
    return 'bunx';
  }

  if (argvPath.includes('/dlx-') || argvPath.includes('\\dlx-')) {
    return 'pnpm dlx';
  }

  if (userAgent || execPath) {
    return 'npx';
  }

  return null;
}

function detectRunnerFromArgvPath(argvPath: string): PackageExecutor | null {
  if (!argvPath) {
    return null;
  }

  if (argvPath.includes('/_npx/') || argvPath.includes('\\_npx\\')) {
    return 'npx';
  }

  if (argvPath.includes('/.yarn/') && argvPath.includes('/dlx/')) {
    return 'yarn dlx';
  }

  if (argvPath.includes('/bunx/') || argvPath.includes('\\bunx\\')) {
    return 'bunx';
  }

  if (argvPath.includes('/dlx-') || argvPath.includes('\\dlx-')) {
    return 'pnpm dlx';
  }

  return null;
}

function looksLikeInstalledCli(argvPath: string): boolean {
  if (!argvPath) {
    return false;
  }

  const normalized = argvPath.replaceAll('\\', '/');
  return (
    normalized.endsWith('/node_modules/.bin/xerg') ||
    normalized.includes('/node_modules/@xerg/cli/dist/index.js') ||
    normalized.endsWith('/bin/xerg')
  );
}

function detectRunnerFromSignal(signal: string): PackageExecutor | null {
  if (!signal) {
    return null;
  }

  if (signal.includes('pnpm')) {
    return 'pnpm dlx';
  }

  if (signal.includes('yarn')) {
    return 'yarn dlx';
  }

  if (signal.includes('bun')) {
    return 'bunx';
  }

  if (signal.includes('npm')) {
    return 'npx';
  }

  return null;
}

function normalizeSignal(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}
