import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const cards = [
  {
    title: 'Spend dashboards stop at totals',
    body: 'Knowing what you spent is table stakes. It does not tell you which retries, loops, or model choices are leaking money.',
  },
  {
    title: 'Routers optimize price, not workflow economics',
    body: 'Cheaper routing helps, but it still does not tell you whether the workflow was wasteful, brittle, or worth the spend.',
  },
  {
    title: 'Xerg turns cost into decisions',
    body: 'It highlights structural waste, surfaces the next savings tests, and creates a path from raw spend to cost per outcome.',
  },
];

export function ProblemSection() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader>
            <CardTitle>{card.title}</CardTitle>
            <CardDescription>{card.body}</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-[color:var(--border)] pt-5 text-sm text-[color:var(--muted)]">
            Xerg starts locally so the first report is useful before a team has to instrument
            anything else.
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
