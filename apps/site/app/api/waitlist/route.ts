import { track } from '@vercel/analytics/server';
import { NextResponse } from 'next/server';

import { sendWaitlistConfirmationEmail } from '@/lib/resend';
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
    const origin = new URL(request.url).origin;
    const result = await sendWaitlistConfirmationEmail(parsed.data.email, origin);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.statusCode && result.statusCode >= 400 ? result.statusCode : 502 },
      );
    }

    try {
      await track('Waitlist Confirmation Sent', {
        source: 'website',
        email_domain: normalizeWaitlistEmail(parsed.data.email).split('@')[1] ?? 'unknown',
      });
    } catch (error) {
      console.error('Xerg waitlist side effects failed', error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
