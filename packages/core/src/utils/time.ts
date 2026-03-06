export function parseSince(value?: string): number | null {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d+)([mhdw])$/i);
  if (!match) {
    throw new Error(`Invalid --since value "${value}". Use values like 30m, 24h, 7d, 2w.`);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return Date.now() - amount * multipliers[unit];
}

export function isoNow() {
  return new Date().toISOString();
}

export function toIsoOrNow(value: unknown) {
  if (typeof value === 'string') {
    const candidate = new Date(value);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate.toISOString();
    }
  }

  if (typeof value === 'number') {
    const candidate = new Date(value);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate.toISOString();
    }
  }

  return isoNow();
}
