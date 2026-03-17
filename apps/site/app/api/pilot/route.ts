import { NextResponse } from 'next/server';

import { getResendClient } from '@/lib/resend';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_EXTENSIONS = new Set(['.md', '.json', '.txt']);
const MAX_FILE_SIZE = 1_048_576;

function getFromAddress() {
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const fromName = 'Xerg Pilot';
  if (!fromEmail) return null;
  return `${fromName} <${fromEmail}>`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const email = formData.get('email');
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'An audit report file is required.' }, { status: 400 });
    }

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: 'File must be .md, .json, or .txt.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be under 1 MB.' }, { status: 400 });
    }

    const notes = formData.get('notes');
    const source = formData.get('source') ?? 'pilot-form';

    const buffer = Buffer.from(await file.arrayBuffer());

    const from = getFromAddress();
    if (!from) {
      return NextResponse.json({ error: 'Email sending is not configured.' }, { status: 500 });
    }

    const resend = getResendClient();
    const result = await resend.emails.send({
      from,
      to: 'jason@xerg.ai',
      subject: `Pilot submission from ${email}`,
      text: [
        `Email: ${email}`,
        `Source: ${String(source)}`,
        '',
        notes ? `Notes:\n${String(notes)}` : '(no notes)',
      ].join('\n'),
      attachments: [{ filename: file.name, content: buffer }],
    });

    if (result.error) {
      console.error('Resend pilot submission error', result.error);
      return NextResponse.json({ error: 'Submission failed.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pilot submission error', error);
    return NextResponse.json({ error: 'Submission failed.' }, { status: 500 });
  }
}
