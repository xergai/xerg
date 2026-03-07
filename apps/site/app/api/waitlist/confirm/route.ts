import { track } from '@vercel/analytics/server';
import { NextResponse } from 'next/server';

import { captureWaitlistSignup, notifyWaitlistSignup } from '@/lib/resend';
import { verifyWaitlistConfirmationToken } from '@/lib/waitlist';

function redirectToStatus(
  requestUrl: string,
  status: 'confirmed' | 'expired' | 'invalid' | 'error',
) {
  return NextResponse.redirect(new URL(`/waitlist/confirmed?status=${status}`, requestUrl));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return redirectToStatus(request.url, 'invalid');
  }

  const verification = verifyWaitlistConfirmationToken(token);

  if (!verification.ok) {
    return redirectToStatus(request.url, verification.reason === 'expired' ? 'expired' : 'invalid');
  }

  try {
    const result = await captureWaitlistSignup(verification.email);

    if (!result.ok) {
      return redirectToStatus(request.url, 'error');
    }

    try {
      const sideEffects = [];

      if (result.mode === 'contact') {
        sideEffects.push(notifyWaitlistSignup(verification.email));
      }

      if (result.mode !== 'duplicate') {
        sideEffects.push(
          track('Waitlist Signup Confirmed', {
            source: 'website',
            mode: result.mode,
          }),
        );
      }

      await Promise.all(sideEffects);
    } catch (error) {
      console.error('Xerg waitlist confirmation side effects failed', error);
    }

    return redirectToStatus(request.url, 'confirmed');
  } catch (error) {
    console.error('Xerg waitlist confirmation failed', error);
    return redirectToStatus(request.url, 'error');
  }
}
