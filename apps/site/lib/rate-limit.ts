type RateLimitOptions = {
  max: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

const rateLimitStore = new Map<string, number[]>();

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function getWaitlistSubmitRateLimitOptions(): RateLimitOptions {
  return {
    max: parsePositiveInteger(process.env.WAITLIST_SUBMIT_RATE_LIMIT_MAX, 5),
    windowMs:
      parsePositiveInteger(process.env.WAITLIST_SUBMIT_RATE_LIMIT_WINDOW_SECONDS, 600) * 1000,
  };
}

export function getWaitlistEmailRateLimitOptions(): RateLimitOptions {
  return {
    max: parsePositiveInteger(process.env.WAITLIST_EMAIL_RATE_LIMIT_MAX, 3),
    windowMs:
      parsePositiveInteger(process.env.WAITLIST_EMAIL_RATE_LIMIT_WINDOW_SECONDS, 600) * 1000,
  };
}

export function getWaitlistConfirmRateLimitOptions(): RateLimitOptions {
  return {
    max: parsePositiveInteger(process.env.WAITLIST_CONFIRM_RATE_LIMIT_MAX, 20),
    windowMs:
      parsePositiveInteger(process.env.WAITLIST_CONFIRM_RATE_LIMIT_WINDOW_SECONDS, 600) * 1000,
  };
}

export function consumeRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  const existing = rateLimitStore.get(key) ?? [];
  const recent = existing.filter((timestamp) => timestamp > windowStart);

  if (recent.length >= options.max) {
    const oldest = recent[0] ?? now;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000)),
    };
  }

  recent.push(now);
  rateLimitStore.set(key, recent);

  if (rateLimitStore.size > 1000) {
    for (const [storedKey, timestamps] of rateLimitStore.entries()) {
      const filtered = timestamps.filter((timestamp) => timestamp > windowStart);
      if (filtered.length === 0) {
        rateLimitStore.delete(storedKey);
      } else {
        rateLimitStore.set(storedKey, filtered);
      }
    }
  }

  return {
    ok: true,
    retryAfterSeconds: 0,
  };
}
