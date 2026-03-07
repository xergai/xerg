import { track } from '@vercel/analytics/server';
import { NextResponse } from 'next/server';

import { captureWaitlistSignup, notifyWaitlistSignup } from '@/lib/resend';
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
    const result = await captureWaitlistSignup(parsed.data.email);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.statusCode && result.statusCode >= 400 ? result.statusCode : 502 },
      );
    }

    try {
      const sideEffects = [];

      if (result.mode === 'contact') {
        sideEffects.push(notifyWaitlistSignup(parsed.data.email));
      }

      if (result.mode !== 'duplicate') {
        sideEffects.push(
          track('Waitlist Signup', {
            source: 'website',
            mode: result.mode,
          }),
        );
      }

      await Promise.all(sideEffects);
    } catch (error) {
      console.error('Xerg waitlist side effects failed', error);
    }

    return NextResponse.json({ ok: true, mode: result.mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
