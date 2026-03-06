import { statSync } from 'node:fs';
import fg from 'fast-glob';

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
    const matches = await fg('**/*.jsonl', {
      absolute: true,
      cwd: options.sessionsDir,
      onlyFiles: true,
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
    fg(getDefaultGatewayPattern(), { absolute: true, onlyFiles: true }),
    fg(getDefaultSessionsPattern(), { absolute: true, onlyFiles: true }),
  ]);

  const detected = [
    ...gatewayMatches.map((path) => toDetected(path, 'gateway')).filter(Boolean),
    ...sessionMatches.map((path) => toDetected(path, 'sessions')).filter(Boolean),
  ] as DetectedSourceFile[];

  return detected.sort((left, right) => right.mtimeMs - left.mtimeMs);
}

export async function inspectOpenClawSources(options: AuditOptions): Promise<DoctorReport> {
  const sources = await detectOpenClawSources(options);
  const notes: string[] = [];

  if (sources.length === 0) {
    notes.push('No OpenClaw gateway logs or session files were detected.');
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
