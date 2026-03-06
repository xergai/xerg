import type * as React from 'react';

import { cn } from '@/lib/utils';

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]',
        className,
      )}
      {...props}
    />
  );
}
