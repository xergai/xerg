import { Resend } from 'resend';

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
  const from = process.env.RESEND_FROM_EMAIL;

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
    subject: `New Xerg waitlist signup: ${email}`,
    text: `${email} joined the Xerg waitlist.`,
  });

  if (result.error) {
    return {
      ok: false as const,
      message: result.error.message,
    };
  }

  return { ok: true as const };
}

export async function captureWaitlistSignup(email: string): Promise<WaitlistCaptureResult> {
  const resend = getResendClient();
  const result = await resend.contacts.create({
    email,
    unsubscribed: false,
    properties: {
      source: 'website',
      product: 'xerg',
    },
  });

  if (!result.error) {
    return { ok: true, mode: 'contact' };
  }

  if (isDuplicateContactError(result.error)) {
    return { ok: true, mode: 'duplicate' };
  }

  if (isRestrictedApiKeyError(result.error)) {
    const notificationResult = await sendWaitlistNotification(resend, email);
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
  return sendWaitlistNotification(resend, email);
}
