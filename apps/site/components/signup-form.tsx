'use client';

import { ArrowRight, LoaderCircle } from 'lucide-react';
import { startTransition, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SubmitState = 'idle' | 'success' | 'error';

export function SignupForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<SubmitState>('idle');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus('idle');

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
          throw new Error('Request failed');
        }

        setStatus('success');
        setEmail('');
      } catch {
        setStatus('error');
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <form className="w-full max-w-xl space-y-3" onSubmit={onSubmit}>
      <div className={compact ? 'flex flex-col gap-3 sm:flex-row' : 'flex flex-col gap-3'}>
        <Input
          aria-label="Email address"
          autoComplete="email"
          className="flex-1"
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
          className={compact ? 'sm:w-auto' : 'w-full sm:w-fit'}
          size="lg"
          type="submit"
          disabled={pending}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          Get launch updates
        </Button>
      </div>
      <p className="text-sm text-[color:var(--muted)]">
        Join the waitlist for CLI launch news, early team access, and design partner invites.
      </p>
      {status === 'success' ? (
        <p className="text-sm text-[color:var(--accent)]">
          You&apos;re on the list. We&apos;ll send launch updates and early access when it&apos;s
          ready.
        </p>
      ) : null}
      {status === 'error' ? (
        <p className="text-sm text-[color:var(--warning)]">
          Signup failed. Check your Resend configuration and try again.
        </p>
      ) : null}
    </form>
  );
}
