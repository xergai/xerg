'use client';

import { LoaderCircle } from 'lucide-react';
import { startTransition, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type SubmitState = 'idle' | 'success' | 'error';

export function SignupForm({
  align = 'left',
  buttonClassName,
  className,
  compact = true,
  inputClassName,
  note = 'Join the waitlist for CLI launch news, early team access, and design partner invites.',
  noteClassName,
  submitLabel = 'Get launch updates',
  successClassName,
  errorClassName,
}: {
  align?: 'left' | 'center';
  buttonClassName?: string;
  className?: string;
  compact?: boolean;
  inputClassName?: string;
  note?: string;
  noteClassName?: string;
  submitLabel?: string;
  successClassName?: string;
  errorClassName?: string;
}) {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus('idle');
    setErrorMessage('');

    const payload = { email, company };

    startTransition(async () => {
      try {
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? 'Request failed');
        }

        setStatus('success');
        setEmail('');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Request failed');
        setStatus('error');
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <form
      className={cn('w-full max-w-xl space-y-3', align === 'center' && 'text-center', className)}
      onSubmit={onSubmit}
    >
      <div className={compact ? 'flex flex-col gap-3 sm:flex-row' : 'flex flex-col gap-3'}>
        <Input
          aria-label="Email address"
          autoComplete="email"
          className={cn('h-12 flex-1', inputClassName)}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
          type="email"
          value={email}
        />
        <Input
          aria-hidden="true"
          autoComplete="off"
          className="hidden"
          onChange={(event) => setCompany(event.target.value)}
          tabIndex={-1}
          value={company}
        />
        <Button
          className={cn(compact ? 'sm:w-auto' : 'w-full sm:w-fit', buttonClassName)}
          size="lg"
          type="submit"
          disabled={pending}
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
      <p className={cn('text-sm text-[color:var(--muted)]', noteClassName)}>{note}</p>
      {status === 'success' ? (
        <p className={cn('text-sm text-[color:var(--accent)]', successClassName)}>
          You&apos;re on the list. We&apos;ll send launch updates and early access when it&apos;s
          ready.
        </p>
      ) : null}
      {status === 'error' ? (
        <p className={cn('text-sm text-[color:var(--warning)]', errorClassName)}>
          {errorMessage || 'Signup failed. Check your Resend configuration and try again.'}
        </p>
      ) : null}
    </form>
  );
}
