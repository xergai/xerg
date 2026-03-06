import { ArrowRightLeft, Radar, ScanSearch } from 'lucide-react';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const items = [
  {
    icon: ScanSearch,
    title: 'Waste intelligence now',
    body: 'Read OpenClaw logs locally and surface measurable waste plus clearly labeled opportunities.',
  },
  {
    icon: ArrowRightLeft,
    title: 'Unit economics next',
    body: 'Move from cost visibility toward cost per outcome once teams are ready to connect business outcomes.',
  },
  {
    icon: Radar,
    title: 'Governance later',
    body: 'Build toward economic discipline only after the trust loop is established with real usage and believable metrics.',
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
