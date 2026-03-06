import { Terminal } from 'lucide-react';

import { SignupForm } from '@/components/signup-form';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function HowItStartsSection() {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Audit. Fix. Re-audit.</CardTitle>
          <CardDescription>
            Xerg starts with one job: turn local agent logs into a report that tells you more than a
            spend dashboard can.
          </CardDescription>
        </CardHeader>
        <div className="border-t border-[color:var(--border)] p-6">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">
            <Terminal className="size-4" />
            CLI-first workflow
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <pre className="overflow-x-auto rounded-[22px] border border-[color:var(--border)] bg-[color:rgba(6,8,12,0.9)] p-5 font-[family-name:var(--font-geist-mono)] text-sm leading-7 text-[color:var(--text)]">
              <code>{`# Before
npx audit-tool report

Total spend: $0.0660
Runs analyzed: 8
Top workflow: daily_summary
Top model: Sonnet`}</code>
            </pre>
            <pre className="overflow-x-auto rounded-[22px] border border-[color:var(--border)] bg-[color:rgba(6,8,12,0.9)] p-5 font-[family-name:var(--font-geist-mono)] text-sm leading-7 text-[color:var(--text)]">
              <code>{`# After
npx @xergai/cli audit

Retry waste: $0.0054
Loop waste: policy_reviewer
Downgrade test: heartbeat_monitor
Potential impact: $0.0348`}</code>
            </pre>
          </div>
        </div>
      </Card>
      <Card className="justify-between">
        <CardHeader>
          <CardTitle>Get on the waitlist</CardTitle>
          <CardDescription>
            Join for launch updates, early access to the CLI, and design partner invites for the
            first workflows where economic signal is clean.
          </CardDescription>
        </CardHeader>
        <div className="mt-auto">
          <SignupForm compact />
        </div>
      </Card>
    </section>
  );
}
