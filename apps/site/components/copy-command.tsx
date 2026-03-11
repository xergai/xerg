'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface CopyCommandProps {
  command: string;
  className?: string;
}

export function CopyCommand({ command, className }: CopyCommandProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-[rgba(45,212,168,0.1)] bg-[rgba(45,212,168,0.06)] px-4 py-3',
        className,
      )}
    >
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm text-[color:var(--text-bright)]">
        {command}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[color:var(--border)] bg-[color:var(--bg-card)] px-2.5 py-2 text-xs text-[color:var(--text-dim)] transition hover:border-[color:var(--border-bright)] hover:text-[color:var(--text-bright)]"
        aria-label={copied ? 'Command copied' : 'Copy command'}
        title={copied ? 'Copied' : 'Copy command'}
      >
        {copied ? (
          <Check className="size-3.5 text-[color:var(--accent)]" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  );
}
