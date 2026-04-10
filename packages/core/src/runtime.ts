import { basename } from 'node:path';

import { detectHermesSources } from './detect/hermes.js';
import { detectOpenClawSources } from './detect/openclaw.js';
import { normalizeHermesSources } from './normalize/hermes.js';
import { normalizeOpenClawSources } from './normalize/openclaw.js';
import type { AgentRuntime, AuditOptions, DetectedSourceFile, DoctorReport } from './types.js';
import {
  getDefaultHermesGatewayPattern,
  getDefaultHermesSessionsPattern,
  getDefaultOpenClawGatewayPattern,
  getDefaultOpenClawSessionsPattern,
} from './utils/paths.js';

export interface RuntimeAdapter {
  runtime: AgentRuntime;
  productName: string;
  detectSources: (options: AuditOptions) => Promise<DetectedSourceFile[]>;
  normalizeSources: typeof normalizeOpenClawSources;
  noSourceNotes: string[];
  gatewayNote: string;
  sessionNote: string;
  noDataError: (commandPrefix: string) => string;
  defaultPaths: () => {
    runtime: AgentRuntime;
    gatewayPattern: string;
    sessionsPattern: string;
  };
}

const RUNTIME_ADAPTERS: Record<AgentRuntime, RuntimeAdapter> = {
  openclaw: {
    runtime: 'openclaw',
    productName: 'OpenClaw',
    detectSources: detectOpenClawSources,
    normalizeSources: normalizeOpenClawSources,
    noSourceNotes: [
      'No OpenClaw gateway logs or session files were detected.',
      'Doctor checks local defaults by default. Use --log-file or --sessions-dir if your OpenClaw data lives outside the defaults.',
      'Use --remote or --railway to inspect remote OpenClaw targets.',
    ],
    gatewayNote: 'Gateway logs detected. These are preferred when cost metadata is present.',
    sessionNote: 'Session transcript fallback detected. Xerg will extract usage metadata only.',
    noDataError: (commandPrefix: string) =>
      `No OpenClaw sources were detected. Run \`${commandPrefix} doctor --runtime openclaw\` or provide --log-file / --sessions-dir.`,
    defaultPaths: () => ({
      runtime: 'openclaw',
      gatewayPattern: getDefaultOpenClawGatewayPattern(),
      sessionsPattern: getDefaultOpenClawSessionsPattern(),
    }),
  },
  hermes: {
    runtime: 'hermes',
    productName: 'Hermes',
    detectSources: detectHermesSources,
    normalizeSources: normalizeHermesSources,
    noSourceNotes: [
      'No Hermes gateway logs or session files were detected.',
      'Doctor checks local defaults by default. Use --log-file or --sessions-dir if your Hermes data lives outside the defaults.',
      'Hermes remote transport is not part of this rollout yet.',
    ],
    gatewayNote:
      'Hermes gateway logs detected. Xerg prefers agent.log entries when billable model-call records are present.',
    sessionNote: 'Hermes session transcripts detected. Xerg will extract usage metadata only.',
    noDataError: (commandPrefix: string) =>
      `No Hermes sources were detected. Run \`${commandPrefix} doctor --runtime hermes\` or provide --log-file / --sessions-dir.`,
    defaultPaths: () => ({
      runtime: 'hermes',
      gatewayPattern: getDefaultHermesGatewayPattern(),
      sessionsPattern: getDefaultHermesSessionsPattern(),
    }),
  },
};

interface RuntimeCandidate {
  adapter: RuntimeAdapter;
  sources: DetectedSourceFile[];
  usable: boolean;
}

export function getRuntimeAdapter(runtime: AgentRuntime) {
  return RUNTIME_ADAPTERS[runtime];
}

function hasExplicitLocalPaths(options: AuditOptions) {
  return Boolean(options.logFile || options.sessionsDir);
}

function inferRuntimeFromExplicitPaths(options: AuditOptions): AgentRuntime | null {
  const paths = [options.logFile, options.sessionsDir]
    .filter((path): path is string => Boolean(path))
    .map((path) => path.replace(/\\/g, '/').toLowerCase());

  if (paths.length === 0) {
    return null;
  }

  const hints = new Set<AgentRuntime>();

  for (const path of paths) {
    const name = basename(path).toLowerCase();

    if (
      path.includes('/.openclaw/') ||
      path.includes('/openclaw/') ||
      path.includes('/tmp/openclaw') ||
      name.includes('openclaw')
    ) {
      hints.add('openclaw');
    }

    if (
      path.includes('/.hermes/') ||
      path.includes('/hermes/') ||
      path.includes('/.hermes') ||
      name.includes('hermes') ||
      name === 'gateway.log' ||
      name.startsWith('agent.log')
    ) {
      hints.add('hermes');
    }
  }

  return hints.size === 1 ? Array.from(hints)[0] : null;
}

async function probeRuntimeCandidate(
  adapter: RuntimeAdapter,
  options: AuditOptions,
): Promise<RuntimeCandidate> {
  const sources = await adapter.detectSources(options);
  return {
    adapter,
    sources,
    usable: sources.length > 0,
  };
}

function buildResolvedDoctorNotes(adapter: RuntimeAdapter, sources: DetectedSourceFile[]) {
  if (sources.length === 0) {
    return adapter.noSourceNotes;
  }

  const notes: string[] = [];
  if (sources.some((source) => source.kind === 'gateway')) {
    notes.push(adapter.gatewayNote);
  }
  if (sources.some((source) => source.kind === 'sessions')) {
    notes.push(adapter.sessionNote);
  }

  return notes;
}

function buildResolvedDoctorReport(
  adapter: RuntimeAdapter,
  sources: DetectedSourceFile[],
): DoctorReport {
  return {
    canAudit: sources.length > 0,
    mode: sources.length > 0 ? 'resolved' : 'none',
    runtime: sources.length > 0 ? adapter.runtime : null,
    sources,
    defaults: [adapter.defaultPaths()],
    notes: buildResolvedDoctorNotes(adapter, sources),
  };
}

function buildAutoNoDataDoctorReport(candidates: RuntimeCandidate[]): DoctorReport {
  return {
    canAudit: false,
    mode: 'none',
    runtime: null,
    sources: candidates.flatMap((candidate) => candidate.sources),
    defaults: Object.values(RUNTIME_ADAPTERS).map((adapter) => adapter.defaultPaths()),
    notes: [
      'No supported local runtime sources were detected.',
      'Auto-detection checked both OpenClaw and Hermes local defaults.',
      'Use --runtime openclaw or --runtime hermes with --log-file / --sessions-dir when you want to point Xerg at explicit local paths.',
    ],
  };
}

function buildAutoAmbiguousDoctorReport(candidates: RuntimeCandidate[]): DoctorReport {
  return {
    canAudit: false,
    mode: 'ambiguous',
    runtime: null,
    sources: candidates.flatMap((candidate) => candidate.sources),
    defaults: Object.values(RUNTIME_ADAPTERS).map((adapter) => adapter.defaultPaths()),
    notes: [
      'Both OpenClaw and Hermes local sources were detected.',
      'Re-run doctor with --runtime openclaw or --runtime hermes to choose the local runtime explicitly.',
    ],
  };
}

export function getRuntimeProductName(runtime: AgentRuntime) {
  return getRuntimeAdapter(runtime).productName;
}

export async function resolveRuntimeCandidates(options: AuditOptions) {
  return Promise.all(
    (Object.values(RUNTIME_ADAPTERS) as RuntimeAdapter[]).map((adapter) =>
      probeRuntimeCandidate(adapter, options),
    ),
  );
}

export async function resolveLocalAgentRuntime(options: AuditOptions) {
  const requestedRuntime = options.runtime ?? 'auto';

  if (requestedRuntime !== 'auto') {
    const adapter = getRuntimeAdapter(requestedRuntime);
    const sources = await adapter.detectSources(options);
    return {
      adapter,
      sources,
    };
  }

  const candidates = await resolveRuntimeCandidates(options);
  const usableCandidates = candidates.filter((candidate) => candidate.usable);

  if (hasExplicitLocalPaths(options)) {
    const hintedRuntime = inferRuntimeFromExplicitPaths(options);
    if (hintedRuntime) {
      const hintedCandidate = usableCandidates.find(
        (candidate) => candidate.adapter.runtime === hintedRuntime,
      );
      if (hintedCandidate) {
        return {
          adapter: hintedCandidate.adapter,
          sources: hintedCandidate.sources,
        };
      }
    }

    if (usableCandidates.length === 1) {
      return {
        adapter: usableCandidates[0].adapter,
        sources: usableCandidates[0].sources,
      };
    }

    throw new Error(
      'Could not determine whether the provided local files belong to OpenClaw or Hermes. Re-run with --runtime openclaw or --runtime hermes.',
    );
  }

  if (usableCandidates.length === 0) {
    throw new Error(
      `No supported local runtime sources were detected. Run \`${options.commandPrefix ?? 'xerg'} doctor\`, or use --runtime openclaw / --runtime hermes with --log-file / --sessions-dir.`,
    );
  }

  if (usableCandidates.length > 1) {
    throw new Error(
      'Both OpenClaw and Hermes local sources were detected. Re-run with --runtime openclaw or --runtime hermes.',
    );
  }

  return {
    adapter: usableCandidates[0].adapter,
    sources: usableCandidates[0].sources,
  };
}

export async function doctorAgentRuntime(options: AuditOptions): Promise<DoctorReport> {
  const requestedRuntime = options.runtime ?? 'auto';

  if (requestedRuntime !== 'auto') {
    options.onProgress?.(`Checking local ${getRuntimeProductName(requestedRuntime)} defaults...`);
    const adapter = getRuntimeAdapter(requestedRuntime);
    const sources = await adapter.detectSources(options);
    options.onProgress?.(
      sources.length > 0
        ? `Detected ${sources.length} local source file${sources.length === 1 ? '' : 's'}.`
        : `No local ${adapter.productName} source files were detected.`,
    );
    return buildResolvedDoctorReport(adapter, sources);
  }

  options.onProgress?.('Checking local runtime defaults...');
  const candidates = await resolveRuntimeCandidates(options);
  const usableCandidates = candidates.filter((candidate) => candidate.usable);
  const detectedCount = candidates.reduce((sum, candidate) => sum + candidate.sources.length, 0);
  options.onProgress?.(
    detectedCount > 0
      ? `Detected ${detectedCount} local source file${detectedCount === 1 ? '' : 's'} across supported runtimes.`
      : 'No local runtime source files were detected.',
  );

  if (hasExplicitLocalPaths(options)) {
    const hintedRuntime = inferRuntimeFromExplicitPaths(options);
    if (hintedRuntime) {
      const hintedCandidate = usableCandidates.find(
        (candidate) => candidate.adapter.runtime === hintedRuntime,
      );
      if (hintedCandidate) {
        return buildResolvedDoctorReport(hintedCandidate.adapter, hintedCandidate.sources);
      }
    }

    if (usableCandidates.length === 1) {
      return buildResolvedDoctorReport(usableCandidates[0].adapter, usableCandidates[0].sources);
    }

    return {
      canAudit: false,
      mode: 'ambiguous',
      runtime: null,
      sources: candidates.flatMap((candidate) => candidate.sources),
      defaults: Object.values(RUNTIME_ADAPTERS).map((adapter) => adapter.defaultPaths()),
      notes: [
        'Could not determine whether the provided local files belong to OpenClaw or Hermes.',
        'Re-run doctor with --runtime openclaw or --runtime hermes to choose the local runtime explicitly.',
      ],
    };
  }

  if (usableCandidates.length === 0) {
    return buildAutoNoDataDoctorReport(candidates);
  }

  if (usableCandidates.length > 1) {
    return buildAutoAmbiguousDoctorReport(usableCandidates);
  }

  return buildResolvedDoctorReport(usableCandidates[0].adapter, usableCandidates[0].sources);
}

export function buildRuntimeNoDataError(runtime: AgentRuntime, commandPrefix = 'xerg') {
  return getRuntimeAdapter(runtime).noDataError(commandPrefix);
}
