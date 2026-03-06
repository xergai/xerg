import { Resend } from 'resend';

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  return new Resend(apiKey);
}

export async function notifyWaitlistSignup(email: string) {
  const notifyTarget = process.env.WAITLIST_NOTIFY_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!notifyTarget || !from) {
    return;
  }

  const resend = getResendClient();
  await resend.emails.send({
    from,
    to: notifyTarget,
    subject: `New Xerg waitlist signup: ${email}`,
    text: `${email} joined the Xerg waitlist.`,
  });
}
