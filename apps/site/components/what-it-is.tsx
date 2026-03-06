import { ArrowRightLeft, Radar, ScanSearch } from 'lucide-react';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const items = [
  {
    icon: ScanSearch,
    title: 'What Xerg does now',
    body: 'Audits OpenClaw logs locally and turns spend into waste findings, opportunities, and prioritized next actions.',
  },
  {
    icon: ArrowRightLeft,
    title: 'Why that is different',
    body: 'Most products stop at tokens, traces, or routing. Xerg shows retry waste, loop waste, context bloat, and downgrade tests.',
  },
  {
    icon: Radar,
    title: 'Where it can go later',
    body: 'Once teams trust the audit, Xerg can grow into cost per outcome, trend analysis, and economic governance.',
  },
];

export function WhatItIsSection() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {items.map(({ icon: Icon, title, body }) => (
        <Card key={title} className="min-h-[220px]">
          <CardHeader className="gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:rgba(106,227,255,0.08)] text-[color:var(--accent)]">
              <Icon className="size-5" />
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{body}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </section>
  );
}
