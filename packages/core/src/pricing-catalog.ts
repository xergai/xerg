import type { PricingEntry } from './types.js';

export const PRICING_CATALOG: PricingEntry[] = [
  {
    id: 'anthropic-claude-haiku-4-5-2026-03-01',
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
    effectiveDate: '2026-03-01',
    inputPer1m: 0.8,
    outputPer1m: 4,
  },
  {
    id: 'anthropic-claude-sonnet-4-5-2026-03-01',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    effectiveDate: '2026-03-01',
    inputPer1m: 3,
    outputPer1m: 15,
  },
  {
    id: 'anthropic-claude-opus-4-2026-03-01',
    provider: 'anthropic',
    model: 'claude-opus-4',
    effectiveDate: '2026-03-01',
    inputPer1m: 15,
    outputPer1m: 75,
  },
  {
    id: 'openai-gpt-4o-2026-03-01',
    provider: 'openai',
    model: 'gpt-4o',
    effectiveDate: '2026-03-01',
    inputPer1m: 2.5,
    outputPer1m: 10,
  },
  {
    id: 'openai-gpt-4.1-mini-2026-03-01',
    provider: 'openai',
    model: 'gpt-4.1-mini',
    effectiveDate: '2026-03-01',
    inputPer1m: 0.4,
    outputPer1m: 1.6,
  },
  {
    id: 'google-gemini-2.0-flash-2026-03-01',
    provider: 'google',
    model: 'gemini-2.0-flash',
    effectiveDate: '2026-03-01',
    inputPer1m: 0.35,
    outputPer1m: 1.4,
  },
  {
    id: 'meta-llama-3.3-70b-2026-03-01',
    provider: 'meta',
    model: 'llama-3.3-70b-instruct',
    effectiveDate: '2026-03-01',
    inputPer1m: 0.9,
    outputPer1m: 0.9,
  },
];

export function getPricingEntry(provider: string, model: string): PricingEntry | undefined {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedModel = model.trim().toLowerCase();

  return PRICING_CATALOG.find((entry) => {
    return (
      entry.provider.toLowerCase() === normalizedProvider &&
      entry.model.toLowerCase() === normalizedModel
    );
  });
}

export function estimateCostUsd(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
) {
  const entry = getPricingEntry(provider, model);

  if (!entry) {
    return null;
  }

  const inputCost = (Math.max(inputTokens, 0) / 1_000_000) * entry.inputPer1m;
  const outputCost = (Math.max(outputTokens, 0) / 1_000_000) * entry.outputPer1m;

  return Number((inputCost + outputCost).toFixed(8));
}
