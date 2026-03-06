import { Terminal } from 'lucide-react';

import { SignupForm } from '@/components/signup-form';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function HowItStartsSection() {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>How Xerg starts</CardTitle>
          <CardDescription>
            Xerg begins with an OpenClaw-first CLI experience: local logs in, economics report out.
            No account. No hosted telemetry. No dashboard dependency.
          </CardDescription>
        </CardHeader>
        <div className="border-t border-[color:var(--border)] p-6">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">
            <Terminal className="size-4" />
            CLI-first workflow
          </div>
          <pre className="mt-4 overflow-x-auto rounded-[22px] border border-[color:var(--border)] bg-[color:rgba(6,8,12,0.9)] p-5 font-[family-name:var(--font-geist-mono)] text-sm leading-7 text-[color:var(--text)]">
            <code>{`npx @xergai/cli audit

Total spend: $0.0660
High-confidence waste:
- Retry waste is consuming measurable spend
- policy_reviewer ran beyond efficient loop bounds

Opportunities:
- daily_summary context is above baseline
- heartbeat_monitor may not need Opus`}</code>
          </pre>
        </div>
      </Card>
      <Card className="justify-between">
        <CardHeader>
          <CardTitle>Get on the waitlist</CardTitle>
          <CardDescription>
            Join for launch updates, early access to the CLI, and design partner invites for the
            first team workflows.
          </CardDescription>
        </CardHeader>
        <div className="mt-auto">
          <SignupForm compact />
        </div>
      </Card>
    </section>
  );
}
