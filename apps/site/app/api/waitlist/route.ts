import { track } from '@vercel/analytics/server';
import { NextResponse } from 'next/server';

import {
  consumeRateLimit,
  getRequestIp,
  getWaitlistEmailRateLimitOptions,
  getWaitlistSubmitRateLimitOptions,
} from '@/lib/rate-limit';
import { notifyWaitlistSubmission, sendWaitlistConfirmationEmail } from '@/lib/resend';
import { normalizeWaitlistEmail } from '@/lib/waitlist';
import { waitlistSchema } from '@/lib/waitlist-schema';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = waitlistSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  try {
    const requestIp = getRequestIp(request);
    const ipLimit = consumeRateLimit(
      `waitlist-submit:ip:${requestIp}`,
      getWaitlistSubmitRateLimitOptions(),
    );

    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: `Too many signup attempts. Try again in ${ipLimit.retryAfterSeconds} seconds.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(ipLimit.retryAfterSeconds),
          },
        },
      );
    }

    const normalizedEmail = normalizeWaitlistEmail(parsed.data.email);
    const emailLimit = consumeRateLimit(
      `waitlist-submit:email:${normalizedEmail}`,
      getWaitlistEmailRateLimitOptions(),
    );

    if (!emailLimit.ok) {
      return NextResponse.json(
        {
          error: `That address was just used. Try again in ${emailLimit.retryAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(emailLimit.retryAfterSeconds),
          },
        },
      );
    }

    const origin = new URL(request.url).origin;
    const result = await sendWaitlistConfirmationEmail(
      parsed.data.email,
      parsed.data.source,
      origin,
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.statusCode && result.statusCode >= 400 ? result.statusCode : 502 },
      );
    }

    try {
      await Promise.all([
        notifyWaitlistSubmission(parsed.data.email, parsed.data.source),
        track('Waitlist Confirmation Sent', {
          source: parsed.data.source,
          email_domain: normalizedEmail.split('@')[1] ?? 'unknown',
        }),
      ]);
    } catch (error) {
      console.error('Xerg waitlist side effects failed', error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
