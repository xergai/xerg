import type { AuditPushPayload } from '@xerg/schemas';

import type { PushConfig } from './config.js';

export interface PushSuccess {
  ok: true;
  auditId: string;
}

export interface PushFailure {
  ok: false;
  status: number;
  message: string;
}

export type PushResult = PushSuccess | PushFailure;

export async function pushAudit(
  payload: AuditPushPayload,
  config: PushConfig,
): Promise<PushResult> {
  const url = `${config.apiUrl}/v1/audits`;
  const body = JSON.stringify(payload);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, status: 0, message: `Failed to reach ${config.apiUrl}: ${message}` };
  }

  if (response.status === 201) {
    const data = (await response.json()) as { id?: string };
    return { ok: true, auditId: data.id ?? payload.summary.auditId };
  }

  let errorMessage: string;
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    errorMessage = data.error || data.message || response.statusText;
  } catch {
    errorMessage = response.statusText || `HTTP ${response.status}`;
  }

  return { ok: false, status: response.status, message: errorMessage };
}
