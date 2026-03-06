import { NextResponse } from 'next/server';

import { getResendClient, notifyWaitlistSignup } from '@/lib/resend';
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
    const resend = getResendClient();
    const result = await resend.contacts.create({
      email: parsed.data.email,
      unsubscribed: false,
    });

    if (result.error) {
      const errorText = result.error.message.toLowerCase();
      if (errorText.includes('already') || errorText.includes('exists')) {
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ error: result.error.message }, { status: 502 });
    }

    await notifyWaitlistSignup(parsed.data.email);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
