import { Resend } from 'resend';

import { buildWaitlistConfirmationUrl, normalizeWaitlistEmail } from '@/lib/waitlist';

type ResendApiError = {
  message: string;
  name?: string;
  statusCode?: number | null;
};

type WaitlistCaptureResult =
  | { ok: true; mode: 'contact' | 'duplicate' | 'notification' }
  | { ok: false; message: string; statusCode?: number | null };

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  return new Resend(apiKey);
}

function getResendFromAddress() {
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const fromName = process.env.RESEND_FROM_NAME?.trim();

  if (!fromEmail) {
    return null;
  }

  return fromName ? `${fromName} <${fromEmail}>` : fromEmail;
}

function getConfirmedWaitlistSegmentId() {
  return process.env.RESEND_CONFIRMED_WAITLIST_SEGMENT_ID?.trim() || null;
}

function isDuplicateContactError(error: ResendApiError) {
  const message = error.message.toLowerCase();
  return message.includes('already') || message.includes('exists');
}

function isRestrictedApiKeyError(error: ResendApiError) {
  const message = error.message.toLowerCase();

  return (
    error.statusCode === 403 ||
    error.name === 'restricted_api_key' ||
    error.name === 'invalid_access' ||
    message.includes('restricted api key') ||
    message.includes('sending access') ||
    message.includes('full access') ||
    message.includes('forbidden') ||
    message.includes('permission')
  );
}

async function sendWaitlistNotification(resend: Resend, email: string) {
  const notifyTarget = process.env.WAITLIST_NOTIFY_EMAIL;
  const from = getResendFromAddress();

  if (!notifyTarget || !from) {
    return {
      ok: false as const,
      message:
        'Waitlist fallback is not configured. Set WAITLIST_NOTIFY_EMAIL and RESEND_FROM_EMAIL.',
    };
  }

  const result = await resend.emails.send({
    from,
    to: notifyTarget,
    subject: `Confirmed Xerg waitlist signup: ${email}`,
    text: `${email} confirmed their Xerg waitlist signup.`,
  });

  if (result.error) {
    return {
      ok: false as const,
      message: result.error.message,
    };
  }

  return { ok: true as const };
}

async function attachConfirmedWaitlistSegment(resend: Resend, email: string) {
  const segmentId = getConfirmedWaitlistSegmentId();

  if (!segmentId) {
    return { ok: true as const };
  }

  const result = await resend.contacts.segments.add({
    email,
    segmentId,
  });

  if (!result.error || isDuplicateContactError(result.error)) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    message: result.error.message,
    statusCode: result.error.statusCode,
  };
}

export async function captureWaitlistSignup(email: string): Promise<WaitlistCaptureResult> {
  const normalizedEmail = normalizeWaitlistEmail(email);
  const resend = getResendClient();
  const result = await resend.contacts.create({
    email: normalizedEmail,
    unsubscribed: false,
    segments: getConfirmedWaitlistSegmentId()
      ? [{ id: getConfirmedWaitlistSegmentId() as string }]
      : undefined,
  });

  if (!result.error) {
    return { ok: true, mode: 'contact' };
  }

  if (isDuplicateContactError(result.error)) {
    const segmentResult = await attachConfirmedWaitlistSegment(resend, normalizedEmail);
    if (!segmentResult.ok) {
      return segmentResult;
    }

    return { ok: true, mode: 'duplicate' };
  }

  if (isRestrictedApiKeyError(result.error)) {
    const notificationResult = await sendWaitlistNotification(resend, normalizedEmail);
    if (notificationResult.ok) {
      return { ok: true, mode: 'notification' };
    }

    return {
      ok: false,
      message: notificationResult.message,
      statusCode: result.error.statusCode,
    };
  }

  return {
    ok: false,
    message: result.error.message,
    statusCode: result.error.statusCode,
  };
}

export async function notifyWaitlistSignup(email: string) {
  const resend = getResendClient();
  return sendWaitlistNotification(resend, normalizeWaitlistEmail(email));
}

export async function sendWaitlistConfirmationEmail(email: string, origin?: string) {
  const from = getResendFromAddress();

  if (!from) {
    return {
      ok: false as const,
      message: 'RESEND_FROM_EMAIL is not configured.',
    };
  }

  const normalizedEmail = normalizeWaitlistEmail(email);
  const confirmationUrl = buildWaitlistConfirmationUrl(normalizedEmail, origin);
  const resend = getResendClient();
  const result = await resend.emails.send({
    from,
    to: normalizedEmail,
    replyTo: process.env.WAITLIST_REPLY_TO?.trim() || 'query@xerg.ai',
    subject: 'Confirm your Xerg waitlist signup',
    text: [
      'Confirm your email to join the Xerg waitlist.',
      '',
      confirmationUrl,
      '',
      'This link expires in 7 days.',
    ].join('\n'),
    html: `
      <div style="margin:0;padding:32px;background:#0a0e14;color:#c8d0dc;font-family:Inter,Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:32px;border:1px solid #1a2030;border-radius:16px;background:#131820;">
          <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#2dd4a8;">Xerg waitlist</p>
          <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;color:#f0f3f7;">Confirm your email</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#c8d0dc;">
            Click the button below to confirm your email and join the Xerg waitlist.
          </p>
          <a href="${confirmationUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2dd4a8;color:#07120f;font-size:15px;font-weight:600;text-decoration:none;">
            Confirm email
          </a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#6b7a8d;">
            This link expires in 7 days. If you did not request this, you can ignore this email.
          </p>
        </div>
      </div>
    `,
  });

  if (result.error) {
    return {
      ok: false as const,
      message: result.error.message,
      statusCode: result.error.statusCode,
    };
  }

  return { ok: true as const };
}
