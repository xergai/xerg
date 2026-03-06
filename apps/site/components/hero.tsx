import { Binary, Gauge, Sparkles, WalletCards } from 'lucide-react';

import { SignupForm } from '@/components/signup-form';
import { Badge } from '@/components/ui/badge';

const valuePoints = [
  {
    icon: WalletCards,
    title: 'See where agent spend goes',
  },
  {
    icon: Gauge,
    title: 'Find high-confidence waste',
  },
  {
    icon: Binary,
    title: 'Work toward cost per outcome',
  },
  {
    icon: Sparkles,
    title: 'Start locally with OpenClaw',
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[40px] border border-[color:var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(106,227,255,0.18),transparent_35%),linear-gradient(180deg,rgba(20,28,42,0.94),rgba(8,11,17,0.96))] px-6 py-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:px-10 sm:py-12 lg:px-14 lg:py-16">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_35%,transparent)]" />
      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <div className="space-y-6">
          <Badge>CLI-first waste intelligence for OpenClaw</Badge>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-7xl">
              Know what your AI agents are worth.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[color:var(--muted-strong)] sm:text-lg">
              Xerg helps teams understand AI agent spend in economic terms, starting with local
              waste intelligence for OpenClaw workflows.
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
        <div className="rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(14,18,28,0.92),rgba(10,12,18,0.9))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            <span>Example audit</span>
            <span>v0.1</span>
          </div>
          <div className="space-y-3 rounded-[22px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.02)] p-5 font-[family-name:var(--font-geist-mono)] text-sm leading-6 text-[color:var(--text)]">
            <p>Total spend: $0.0660</p>
            <p>Observed spend: $0.0660</p>
            <p>Estimated spend: $0.0000</p>
            <p>Runs analyzed: 7</p>
            <p>Model calls: 15</p>
            <div className="mt-3 border-t border-[color:var(--border)] pt-3 text-[color:var(--muted-strong)]">
              <p>High-confidence waste</p>
              <p>Retry waste is consuming measurable spend</p>
              <p>Workflow &quot;policy_reviewer&quot; ran beyond efficient loop bounds</p>
            </div>
            <div className="mt-3 border-t border-[color:var(--border)] pt-3 text-[color:var(--muted-strong)]">
              <p>Opportunities</p>
              <p>Context usage in &quot;daily_summary&quot; is well above its baseline</p>
              <p>Candidate model downgrade opportunity in &quot;heartbeat_monitor&quot;</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
