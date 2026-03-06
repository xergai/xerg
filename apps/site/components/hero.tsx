import { ArrowRightLeft, Gauge, ScanSearch, WalletCards } from 'lucide-react';

import { SignupForm } from '@/components/signup-form';
import { Badge } from '@/components/ui/badge';

const valuePoints = [
  {
    icon: WalletCards,
    title: 'Find where money leaks',
  },
  {
    icon: Gauge,
    title: 'Separate waste from guesses',
  },
  {
    icon: ScanSearch,
    title: 'Turn logs into next actions',
  },
  {
    icon: ArrowRightLeft,
    title: 'Build toward cost per outcome',
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[40px] border border-[color:var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(106,227,255,0.18),transparent_35%),linear-gradient(180deg,rgba(20,28,42,0.94),rgba(8,11,17,0.96))] px-6 py-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:px-10 sm:py-12 lg:px-14 lg:py-16">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_35%,transparent)]" />
      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <div className="space-y-6">
          <Badge>Economic audit for AI agents</Badge>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-7xl">
              Most AI tools show spend. Xerg shows waste.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[color:var(--muted-strong)] sm:text-lg">
              Run a local audit on OpenClaw logs and get the answer engineering and finance both
              want: where money is leaking, what to fix first, and what savings to test next.
            </p>
          </div>
          <SignupForm />
          <div className="grid gap-3 sm:grid-cols-2">
            {valuePoints.map(({ icon: Icon, title }) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] px-4 py-3"
                key={title}
              >
                <div className="rounded-full border border-[color:var(--border)] bg-[color:rgba(106,227,255,0.08)] p-2 text-[color:var(--accent)]">
                  <Icon className="size-4" />
                </div>
                <p className="text-sm text-[color:var(--text)]">{title}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(14,18,28,0.92),rgba(10,12,18,0.9))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            <span>CLI view</span>
            <span>before / after</span>
          </div>
          <div className="space-y-3 rounded-[22px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.02)] p-5 font-[family-name:var(--font-geist-mono)] text-sm leading-6 text-[color:var(--text)]">
            <div className="space-y-2">
              <p className="text-[color:var(--muted)]">Before: generic spend report</p>
              <p>Total spend: $0.0660</p>
              <p>Runs analyzed: 8</p>
              <p>Top workflow: daily_summary</p>
              <p>Top model: anthropic/claude-sonnet-4-5</p>
            </div>
            <div className="border-t border-[color:var(--border)] pt-3" />
            <div className="space-y-2">
              <p className="text-[color:var(--muted)]">After: xerg audit</p>
              <p>Retry waste: $0.0054</p>
              <p>Loop waste: policy_reviewer</p>
              <p>Context outlier: daily_summary</p>
              <p>First savings test: heartbeat_monitor → Haiku</p>
              <p className="text-[color:var(--accent)]">Potential impact identified: $0.0348</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
