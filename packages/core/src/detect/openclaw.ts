import { readdirSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';

import type { AuditOptions, DetectedSourceFile, DoctorReport } from '../types.js';
import { getDefaultGatewayPattern, getDefaultSessionsPattern } from '../utils/paths.js';

function toDetected(path: string, kind: 'gateway' | 'sessions'): DetectedSourceFile | null {
  try {
    const stats = statSync(path);
    if (!stats.isFile()) {
      return null;
    }

    return {
      kind,
      path,
      sizeBytes: stats.size,
      mtimeMs: stats.mtimeMs,
    };
  } catch {
    return null;
  }
}

export async function detectOpenClawSources(options: AuditOptions): Promise<DetectedSourceFile[]> {
  const explicitSources: DetectedSourceFile[] = [];

  if (options.logFile) {
    const detected = toDetected(options.logFile, 'gateway');
    if (detected) {
      explicitSources.push(detected);
    }
  }

  if (options.sessionsDir) {
    const matches = await collectGlobMatches('**/*.jsonl', {
      cwd: options.sessionsDir,
      resolveWith: options.sessionsDir,
    });

    for (const match of matches) {
      const detected = toDetected(match, 'sessions');
      if (detected) {
        explicitSources.push(detected);
      }
    }
  }

  if (explicitSources.length > 0) {
    return explicitSources.sort((left, right) => right.mtimeMs - left.mtimeMs);
  }

  const [gatewayMatches, sessionMatches] = await Promise.all([
    collectGlobMatches(getDefaultGatewayPattern()),
    collectGlobMatches(getDefaultSessionsPattern()),
  ]);

  const detected = [
    ...gatewayMatches.map((path) => toDetected(path, 'gateway')).filter(Boolean),
    ...sessionMatches.map((path) => toDetected(path, 'sessions')).filter(Boolean),
  ] as DetectedSourceFile[];

  return detected.sort((left, right) => right.mtimeMs - left.mtimeMs);
}

async function collectGlobMatches(
  pattern: string,
  options?: {
    cwd?: string;
    resolveWith?: string;
  },
) {
  const baseDir = options?.cwd ? resolve(options.cwd) : isAbsolute(pattern) ? sep : process.cwd();
  const relativePattern = options?.cwd
    ? pattern
    : isAbsolute(pattern)
      ? pattern.slice(baseDir.length)
      : pattern;
  const segments = relativePattern.split('/').filter(Boolean);
  const matches = collectMatchesFromSegments(baseDir, segments);

  return matches.map((match) =>
    options?.resolveWith ? resolve(options.resolveWith, match) : match,
  );
}

function collectMatchesFromSegments(currentPath: string, segments: string[]): string[] {
  if (segments.length === 0) {
    return [currentPath];
  }

  const [segment, ...rest] = segments;

  if (segment === '**') {
    const matches = collectMatchesFromSegments(currentPath, rest);

    for (const entry of readDirSafe(currentPath)) {
      if (entry.isDirectory()) {
        matches.push(...collectMatchesFromSegments(join(currentPath, entry.name), segments));
      }
    }

    return matches;
  }

  const matches: string[] = [];
  const matcher = segmentToRegExp(segment);

  for (const entry of readDirSafe(currentPath)) {
    if (!matcher.test(entry.name)) {
      continue;
    }

    const nextPath = join(currentPath, entry.name);
    if (rest.length === 0) {
      matches.push(nextPath);
      continue;
    }

    if (entry.isDirectory()) {
      matches.push(...collectMatchesFromSegments(nextPath, rest));
    }
  }

  return matches;
}

function readDirSafe(path: string) {
  try {
    return readdirSync(path, { withFileTypes: true });
  } catch {
    return [];
  }
}

function segmentToRegExp(segment: string) {
  const escaped = segment.replaceAll(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
  return new RegExp(`^${escaped}$`);
}

export async function inspectOpenClawSources(options: AuditOptions): Promise<DoctorReport> {
  options.onProgress?.('Checking local OpenClaw defaults...');
  const sources = await detectOpenClawSources(options);
  const notes: string[] = [];

  options.onProgress?.(
    sources.length > 0
      ? `Detected ${sources.length} local source file${sources.length === 1 ? '' : 's'}.`
      : 'No local OpenClaw source files were detected.',
  );

  if (sources.length === 0) {
    notes.push('No OpenClaw gateway logs or session files were detected.');
    notes.push(
      'Doctor checks local defaults by default. Use --remote or --railway to inspect remote targets.',
    );
    notes.push(
      'Use --log-file or --sessions-dir if your OpenClaw data lives outside the defaults.',
    );
  }

  if (sources.some((source) => source.kind === 'gateway')) {
    notes.push('Gateway logs detected. These are preferred when cost metadata is present.');
  }

  if (sources.some((source) => source.kind === 'sessions')) {
    notes.push('Session transcript fallback detected. Xerg will extract usage metadata only.');
  }

  return {
    canAudit: sources.length > 0,
    sources,
    defaults: {
      gatewayPattern: getDefaultGatewayPattern(),
      sessionsPattern: getDefaultSessionsPattern(),
    },
    notes,
  };
}
