const content = {
  confirmed: {
    eyebrow: 'Email confirmed',
    title: 'You are on the Xerg waitlist.',
    description:
      'Your email has been confirmed. We will send launch updates, early team access, and design partner invites when they are ready.',
  },
  expired: {
    eyebrow: 'Link expired',
    title: 'Your confirmation link expired.',
    description: 'Submit the form again and we will send you a fresh confirmation email.',
  },
  invalid: {
    eyebrow: 'Invalid link',
    title: 'This confirmation link is not valid.',
    description: 'Submit the form again and we will send you a working confirmation email.',
  },
  error: {
    eyebrow: 'Confirmation error',
    title: 'We could not confirm your email.',
    description:
      'Try the waitlist form again. If it still fails, reply to the confirmation email or contact query@xerg.ai.',
  },
} as const;

type Status = keyof typeof content;

export default async function WaitlistConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = (params.status as Status | undefined) ?? 'confirmed';
  const entry = content[status] ?? content.invalid;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--bg)] px-5 py-16 text-[color:var(--text)]">
      <div className="w-full max-w-2xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-8 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--accent)]">
          {entry.eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[color:var(--heading)] sm:text-5xl">
          {entry.title}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[color:var(--text)]">
          {entry.description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)]"
            href="/"
            style={{ color: 'var(--accent-foreground)' }}
          >
            Back to xerg.ai
          </a>
          <a
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-bright)] bg-[color:var(--bg-card)] px-5 py-3 text-sm font-medium text-[color:var(--text)]"
            href="mailto:query@xerg.ai"
          >
            Contact query@xerg.ai
          </a>
        </div>
      </div>
    </main>
  );
}
