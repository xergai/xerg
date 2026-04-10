import { readdirSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';

import type { AuditRuntime, DetectedSourceFile, SourceKind } from '../types.js';

export function toDetected(
  path: string,
  kind: Extract<SourceKind, 'gateway' | 'sessions'>,
  runtime: AuditRuntime,
): DetectedSourceFile | null {
  try {
    const stats = statSync(path);
    if (!stats.isFile()) {
      return null;
    }

    return {
      kind,
      runtime,
      path,
      sizeBytes: stats.size,
      mtimeMs: stats.mtimeMs,
    };
  } catch {
    return null;
  }
}

export async function collectGlobMatches(
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
