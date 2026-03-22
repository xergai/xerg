import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { RemoteConfig, RemoteConfigEntry, RemoteSource } from './types.js';

export function loadRemoteConfig(configPath: string): RemoteSource[] {
  const resolved = resolve(configPath);
  let raw: string;

  try {
    raw = readFileSync(resolved, 'utf8');
  } catch {
    throw new Error(`Cannot read remote config at ${resolved}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in remote config at ${resolved}`);
  }

  const config = parsed as RemoteConfig;
  if (!config.remotes || !Array.isArray(config.remotes)) {
    throw new Error('Remote config must have a "remotes" array');
  }

  if (config.remotes.length === 0) {
    throw new Error('Remote config "remotes" array is empty');
  }

  return config.remotes.map((entry) => validateAndNormalize(entry));
}

function validateAndNormalize(entry: RemoteConfigEntry): RemoteSource {
  if (!entry.name || typeof entry.name !== 'string') {
    throw new Error('Each remote must have a "name" string');
  }

  const transport = entry.transport ?? 'ssh';

  if (transport !== 'ssh' && transport !== 'railway') {
    throw new Error(
      `Remote "${entry.name}" has invalid transport "${transport}". Use "ssh" or "railway".`,
    );
  }

  if (transport === 'railway') {
    return validateRailwayEntry(entry);
  }

  return validateSshEntry(entry);
}

function validateSshEntry(entry: RemoteConfigEntry): RemoteSource {
  if (!entry.host || typeof entry.host !== 'string') {
    throw new Error(`Remote "${entry.name}" must have a "host" string`);
  }

  return {
    name: entry.name,
    transport: 'ssh',
    host: entry.host,
    logFile: entry.logFile,
    sessionsDir: entry.sessionsDir,
    identityFile: entry.identityFile,
  };
}

function validateRailwayEntry(entry: RemoteConfigEntry): RemoteSource {
  if (!entry.railway || typeof entry.railway !== 'object') {
    throw new Error(`Remote "${entry.name}" with transport "railway" must have a "railway" object`);
  }

  const { projectId, environmentId, serviceId } = entry.railway;

  if (!projectId || typeof projectId !== 'string') {
    throw new Error(`Remote "${entry.name}" railway config must have a "projectId" string`);
  }
  if (!environmentId || typeof environmentId !== 'string') {
    throw new Error(`Remote "${entry.name}" railway config must have an "environmentId" string`);
  }
  if (!serviceId || typeof serviceId !== 'string') {
    throw new Error(`Remote "${entry.name}" railway config must have a "serviceId" string`);
  }

  return {
    name: entry.name,
    transport: 'railway',
    host: `railway-${serviceId.slice(0, 8)}`,
    logFile: entry.logFile,
    sessionsDir: entry.sessionsDir,
    railway: { projectId, environmentId, serviceId },
  };
}
