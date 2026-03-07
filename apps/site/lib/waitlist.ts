import { createHmac, timingSafeEqual } from 'node:crypto';

const WAITLIST_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

type WaitlistTokenPayload = {
  email: string;
  source: string;
  expiresAt: number;
};

export function normalizeWaitlistEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeWaitlistSource(source: string) {
  return source.trim().toLowerCase();
}

function getWaitlistSigningSecret() {
  const dedicatedSecret = process.env.WAITLIST_SIGNING_SECRET?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const secret = dedicatedSecret || resendApiKey;
  if (!secret) {
    throw new Error('WAITLIST_SIGNING_SECRET or RESEND_API_KEY must be configured.');
  }

  return secret;
}

function encodePayload(payload: WaitlistTokenPayload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function signPayload(encodedPayload: string) {
  return createHmac('sha256', getWaitlistSigningSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function buildWaitlistConfirmationToken(email: string, source: string) {
  const payload = encodePayload({
    email: normalizeWaitlistEmail(email),
    source: normalizeWaitlistSource(source),
    expiresAt: Math.floor(Date.now() / 1000) + WAITLIST_TOKEN_TTL_SECONDS,
  });

  return `${payload}.${signPayload(payload)}`;
}

export function getSiteUrl(origin?: string) {
  return origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://xerg.ai';
}

export function buildWaitlistConfirmationUrl(email: string, source: string, origin?: string) {
  const baseUrl = getSiteUrl(origin);
  const token = buildWaitlistConfirmationToken(email, source);
  return `${baseUrl}/api/waitlist/confirm?token=${encodeURIComponent(token)}`;
}

export function verifyWaitlistConfirmationToken(token: string) {
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    return { ok: false as const, reason: 'invalid' as const };
  }

  const expectedSignature = signPayload(encodedPayload);
  const providedSignature = Buffer.from(signature, 'utf8');
  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');

  if (
    providedSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(providedSignature, expectedSignatureBuffer)
  ) {
    return { ok: false as const, reason: 'invalid' as const };
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as WaitlistTokenPayload;

    if (!payload.email || !payload.source || !payload.expiresAt) {
      return { ok: false as const, reason: 'invalid' as const };
    }

    if (payload.expiresAt < Math.floor(Date.now() / 1000)) {
      return { ok: false as const, reason: 'expired' as const };
    }

    return {
      ok: true as const,
      email: normalizeWaitlistEmail(payload.email),
      source: normalizeWaitlistSource(payload.source),
    };
  } catch {
    return { ok: false as const, reason: 'invalid' as const };
  }
}
