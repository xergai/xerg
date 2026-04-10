import type { AuditOptions, DetectedSourceFile } from '../types.js';
import {
  getDefaultOpenClawGatewayPattern,
  getDefaultOpenClawSessionsPattern,
} from '../utils/paths.js';
import { collectGlobMatches, toDetected } from './shared.js';

export async function detectOpenClawSources(options: AuditOptions): Promise<DetectedSourceFile[]> {
  const explicitSources: DetectedSourceFile[] = [];

  if (options.logFile) {
    const detected = toDetected(options.logFile, 'gateway', 'openclaw');
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
      const detected = toDetected(match, 'sessions', 'openclaw');
      if (detected) {
        explicitSources.push(detected);
      }
    }
  }

  if (explicitSources.length > 0) {
    return explicitSources.sort((left, right) => right.mtimeMs - left.mtimeMs);
  }

  const [gatewayMatches, sessionMatches] = await Promise.all([
    collectGlobMatches(getDefaultOpenClawGatewayPattern()),
    collectGlobMatches(getDefaultOpenClawSessionsPattern()),
  ]);

  const detected = [
    ...gatewayMatches.map((path) => toDetected(path, 'gateway', 'openclaw')).filter(Boolean),
    ...sessionMatches.map((path) => toDetected(path, 'sessions', 'openclaw')).filter(Boolean),
  ] as DetectedSourceFile[];

  return detected.sort((left, right) => right.mtimeMs - left.mtimeMs);
}
