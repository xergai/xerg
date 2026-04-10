import { homedir } from 'node:os';
import { basename, join } from 'node:path';

import type { AuditOptions, DetectedSourceFile } from '../types.js';
import {
  getDefaultHermesGatewayPattern,
  getDefaultHermesSessionsPattern,
} from '../utils/paths.js';
import { logFileHasBillableRecords } from '../normalize/hermes.js';
import { collectGlobMatches, toDetected } from './shared.js';

function getDefaultAgentLogPattern() {
  return join(process.env.HOME ?? homedir(), '.hermes', 'logs', 'agent.log*');
}

function getDefaultGatewayLogPattern() {
  return join(process.env.HOME ?? homedir(), '.hermes', 'logs', 'gateway.log*');
}

function getDefaultSessionsDirPattern() {
  return join(process.env.HOME ?? homedir(), '.hermes', 'sessions', '**', '*');
}

function isHermesSessionTranscript(path: string) {
  const lowerName = basename(path).toLowerCase();
  if (lowerName === 'sessions.json') {
    return false;
  }

  return lowerName.endsWith('.jsonl') || lowerName.endsWith('.json');
}

async function collectHermesSessionMatches(baseDir: string) {
  const matches = await collectGlobMatches('**/*', {
    cwd: baseDir,
    resolveWith: baseDir,
  });

  return matches.filter((match) => isHermesSessionTranscript(match));
}

async function pickPreferredLogFamily() {
  const [agentMatches, gatewayMatches] = await Promise.all([
    collectGlobMatches(getDefaultAgentLogPattern()),
    collectGlobMatches(getDefaultGatewayLogPattern()),
  ]);

  if (agentMatches.some((path) => logFileHasBillableRecords(path))) {
    return agentMatches;
  }

  if (gatewayMatches.some((path) => logFileHasBillableRecords(path))) {
    return gatewayMatches;
  }

  return [...agentMatches, ...gatewayMatches];
}

export async function detectHermesSources(options: AuditOptions): Promise<DetectedSourceFile[]> {
  const explicitSources: DetectedSourceFile[] = [];

  if (options.logFile) {
    const detected = toDetected(options.logFile, 'gateway', 'hermes');
    if (detected) {
      explicitSources.push(detected);
    }
  }

  if (options.sessionsDir) {
    const matches = await collectHermesSessionMatches(options.sessionsDir);

    for (const match of matches) {
      const detected = toDetected(match, 'sessions', 'hermes');
      if (detected) {
        explicitSources.push(detected);
      }
    }
  }

  if (explicitSources.length > 0) {
    return explicitSources.sort((left, right) => right.mtimeMs - left.mtimeMs);
  }

  const [gatewayMatches, sessionMatches] = await Promise.all([
    pickPreferredLogFamily(),
    collectGlobMatches(getDefaultSessionsDirPattern()),
  ]);

  const detected = [
    ...gatewayMatches.map((path) => toDetected(path, 'gateway', 'hermes')).filter(Boolean),
    ...sessionMatches
      .filter((path) => isHermesSessionTranscript(path))
      .map((path) => toDetected(path, 'sessions', 'hermes'))
      .filter(Boolean),
  ] as DetectedSourceFile[];

  return detected.sort((left, right) => right.mtimeMs - left.mtimeMs);
}

export function getHermesDefaultDoctorPaths() {
  return {
    runtime: 'hermes' as const,
    gatewayPattern: getDefaultHermesGatewayPattern(),
    sessionsPattern: getDefaultHermesSessionsPattern(),
  };
}
