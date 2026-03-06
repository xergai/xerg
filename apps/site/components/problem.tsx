import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const cards = [
  {
    title: 'Most teams can see tokens, not economics',
    body: 'Tracing and spend dashboards tell you what happened. They do not tell you whether the work was worth what it cost.',
  },
  {
    title: 'Agent loops hide compounding waste',
    body: 'Retries, loop churn, and oversized context quietly inflate spend. Without local analysis, the waste is easy to miss.',
  },
  {
    title: 'Finance eventually asks a harder question',
    body: 'The real question is not what your models cost. It is what your AI agents produce per dollar and where to improve it.',
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
            Xerg starts by making waste visible locally, before asking teams to wire up anything
            else.
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
