import { hostname } from 'node:os';
import type { AuditRuntime, AuditSummary, WirePayloadMeta } from '@xergai/core';

import { parseRemoteTarget } from './transport/index.js';
import type { RemoteSource } from './transport/index.js';

type PushSourceMeta = Pick<WirePayloadMeta, 'environment' | 'sourceHost' | 'sourceId'>;

const RAILWAY_SOURCE_ID = 'OpenClaw - Railway';

export function buildLocalPushSourceMeta(
  kind: AuditRuntime,
  localHost = hostname(),
): PushSourceMeta {
  const productName =
    kind === 'cursor' ? 'Cursor' : kind === 'hermes' ? 'Hermes' : 'OpenClaw';

  return {
    environment: 'local',
    sourceId: `${productName} - ${localHost}`,
    sourceHost: localHost,
  };
}

export function buildRemotePushSourceMeta(source: RemoteSource): PushSourceMeta {
  if (source.transport === 'railway') {
    return {
      environment: 'railway',
      sourceId: isGeneratedRailwayName(source.name)
        ? RAILWAY_SOURCE_ID
        : `OpenClaw - ${source.name}`,
      sourceHost: isGeneratedRailwayName(source.host) ? 'Railway' : source.host,
    };
  }

  return {
    environment: 'remote',
    sourceId: `OpenClaw - ${source.name}`,
    sourceHost: resolveRemoteHost(source.host),
  };
}

export function buildCachedPushSourceMeta(
  summary: AuditSummary,
  localHost = hostname(),
): PushSourceMeta {
  if (summary.runtime === 'cursor') {
    return buildLocalPushSourceMeta('cursor', localHost);
  }

  const sourceFiles = summary.sourceFiles ?? [];
  const comparisonKey = summary.comparisonKey ?? '';

  if (sourceFiles.some((sourceFile) => sourceFile.kind === 'cursor-usage-csv')) {
    return buildLocalPushSourceMeta('cursor', localHost);
  }

  if (isRailwayComparisonKey(comparisonKey)) {
    return {
      environment: 'railway',
      sourceId: RAILWAY_SOURCE_ID,
      sourceHost: 'Railway',
    };
  }

  const remoteHost = parseRemoteHostFromComparisonKey(comparisonKey);
  if (remoteHost) {
    return {
      environment: 'remote',
      sourceId: `OpenClaw - ${remoteHost}`,
      sourceHost: remoteHost,
    };
  }

  if (summary.runtime === 'hermes') {
    return buildLocalPushSourceMeta('hermes', localHost);
  }

  return buildLocalPushSourceMeta('openclaw', localHost);
}

function isGeneratedRailwayName(name: string): boolean {
  return name === 'railway-linked' || /^railway-[a-z0-9]{8}$/i.test(name);
}

function isRailwayComparisonKey(comparisonKey: string): boolean {
  return comparisonKey.startsWith('railway:') || comparisonKey.startsWith('railway-linked:');
}

function parseRemoteHostFromComparisonKey(comparisonKey: string): string | null {
  const parts = comparisonKey.split(':');
  if (parts.length < 3) {
    return null;
  }

  const target = parts.slice(0, -2).join(':');
  if (!target) {
    return null;
  }

  return resolveRemoteHost(target);
}

function resolveRemoteHost(target: string): string {
  const parsed = parseRemoteTarget(target);
  return parsed.host || target;
}
