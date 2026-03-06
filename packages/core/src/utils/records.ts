export function getNestedValue(input: unknown, paths: string[][]): unknown {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const record = input as Record<string, unknown>;

  for (const path of paths) {
    let current: unknown = record;

    for (const segment of path) {
      if (!current || typeof current !== 'object' || !(segment in current)) {
        current = undefined;
        break;
      }

      current = (current as Record<string, unknown>)[segment];
    }

    if (current !== undefined) {
      return current;
    }
  }

  return null;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

export function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  return null;
}

export function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  return false;
}

export function pickMetadata(input: Record<string, unknown>, keys: string[]) {
  const output: Record<string, string | number | boolean | null> = {};

  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      output[key] = value;
    }
  }

  return output;
}
