import type { LucideIcon } from 'lucide-react';
import {
  BadgeDollarSign,
  Bot,
  ChartColumnIncreasing,
  CircleDollarSign,
  GitCompareArrows,
  RefreshCcw,
  ScanSearch,
  ShieldAlert,
  Waypoints,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { SignupForm } from '@/components/signup-form';
import { cn } from '@/lib/utils';

const containerClass = 'mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8';

const problemCards: {
  title: string;
  body: string;
  exampleLabel: string;
  exampleLines: string[];
  icon: LucideIcon;
  iconClassName: string;
}[] = [
  {
    title: 'Spend dashboards show totals',
    body: `"You spent $4,200 this month on Claude." Great. Was that good? Bad? Where did it go? They can't tell you.`,
    exampleLabel: 'What you see',
    exampleLines: ['Total: $4,200', "(that's it)"],
    icon: BadgeDollarSign,
    iconClassName: 'bg-[color:var(--red-dim)] text-[color:var(--red)]',
  },
  {
    title: 'Routers optimize the wrong thing',
    body: 'Smart routing picks the cheapest model per call. But if the workflow is retrying 6 times, the cheap model is not saving you anything.',
    exampleLabel: 'The reality',
    exampleLines: ['Haiku × 6 retries =', 'more expensive than Sonnet × 1'],
    icon: GitCompareArrows,
    iconClassName: 'bg-[color:var(--amber-dim)] text-[color:var(--amber)]',
  },
  {
    title: 'Observability stops at traces',
    body: 'Langfuse, Arize, and LangSmith show you what happened. Xerg shows you what it was worth. Different question, different altitude.',
    exampleLabel: 'Their layer → our layer',
    exampleLines: ['traces, evals, latency →', 'CPO, waste rate, outcome yield'],
    icon: ScanSearch,
    iconClassName: 'bg-[rgba(96,165,250,0.12)] text-[color:var(--blue)]',
  },
];

const wasteCategories = [
  {
    amount: '$13.40',
    name: 'Retry waste',
    description: 'Calls that failed and were retried. You paid for both.',
    amountClassName: 'text-[color:var(--red)]',
  },
  {
    amount: '$16.28',
    name: 'Context bloat',
    description: 'Input tokens way above workflow norms. Stuffing context that does not help.',
    amountClassName: 'text-[color:var(--amber)]',
  },
  {
    amount: '$5.91',
    name: 'Loop waste',
    description:
      'Reasoning loops that blow past efficient bounds. 15 iterations when 4 is typical.',
    amountClassName: 'text-[#c084fc]',
  },
  {
    amount: '$7.58',
    name: 'Downgrade candidates',
    description: 'Expensive models doing simple tasks. Flagged with a test, not asserted.',
    amountClassName: 'text-[color:var(--blue)]',
  },
  {
    amount: '$3.37',
    name: 'Idle waste',
    description: 'Heartbeats and crons that burn tokens without triggering actions.',
    amountClassName: 'text-[color:var(--text-dim)]',
  },
];

const differentiators: {
  title: string;
  body: ReactNode;
  contrast: string;
  icon: LucideIcon;
}[] = [
  {
    title: 'Dollars, not tokens',
    body: (
      <>
        Every waste category, every recommendation, every comparison is reported in USD. Because
        &quot;you used 2.4M tokens&quot; means nothing to the person approving your AI budget.
        &quot;$148 spent, $43 wasted&quot; does.
      </>
    ),
    contrast: '2.4M input tokens across 1,847 requests — then what?',
    icon: CircleDollarSign,
  },
  {
    title: 'Structural waste taxonomy',
    body: (
      <>
        Xerg classifies waste into five categories with distinct root causes and distinct fixes.
        Retry waste needs error handling. Context bloat needs prompt work. Downgrade candidates need
        tests. Each one is actionable.
      </>
    ),
    contrast: 'Optimization: use a smaller model — for which calls? Based on what?',
    icon: ShieldAlert,
  },
  {
    title: 'Cost per outcome path',
    body: (
      <>
        Start with waste intelligence. Add one line of code and reports evolve from what you wasted
        to what each successful ticket, PR, or query costs. That is unit economics.
      </>
    ),
    contrast: 'Show cost per request. Never connect spend to business outcomes.',
    icon: ChartColumnIncreasing,
  },
  {
    title: 'Local-first, zero friction',
    body: (
      <>
        One command. No account. No API key. No network call. Your logs stay on your machine. The
        audit runs in seconds and works offline. This is how developer tools should start: by
        earning trust, not demanding it.
      </>
    ),
    contrast: 'Sign up, add an API key, configure a proxy, wait for data to populate...',
    icon: Bot,
  },
];

const pricingLadder = [
  {
    level: 'Level 1',
    title: 'Waste Intelligence',
    price: 'Free, forever — CLI + local',
    body: 'Know what your agents waste. No outcome data needed, no account, no cloud. Just cost logs and an honest audit.',
    items: [
      'WR-Structural across all five waste categories',
      'Dollar-denominated reports by workflow',
      'Savings recommendations with A/B test guidance',
      'Before/after comparisons on re-audit',
      'Observed vs. estimated cost labeling',
    ],
  },
  {
    level: 'Level 2',
    title: 'Unit Economics',
    price: 'Team $199/mo · Business $499/mo',
    body: 'Know what your agents are worth. Connect spend to outcomes and track cost per ticket, per PR, per resolved query — over time, across teams.',
    items: [
      'Cost per Outcome (CPO) by workflow and agent',
      'Outcome Yield — ROI per dollar of inference',
      'WR-Outcome — spend on failed vs. successful work',
      'Cost regression detection on deploys',
      'Team dashboard with historical trends',
    ],
    featured: true,
  },
  {
    level: 'Level 3',
    title: 'Economic Governance',
    price: 'Enterprise — custom',
    body: 'Enforce economic discipline. Policy-as-code rules that block wasteful deploys, cap spend per task, and route expensive calls to human review.',
    items: [
      'Policy-as-code with CI/CD and runtime gates',
      'Jira, GitHub, Linear auto-outcome connectors',
      'Chargeback reporting by team and business unit',
      'Spend forecasting and volatility simulation',
      'Compliance audit trail with engine versioning',
    ],
  },
];

const gettingStartedSteps = [
  {
    number: '01',
    title: 'Run the audit',
    body: 'Xerg auto-detects your OpenClaw logs and parses them. Works with OTel GenAI spans too.',
    code: 'npx xerg audit',
  },
  {
    number: '02',
    title: 'Read the report',
    body: 'Total spend, waste rate, top waste drivers by dollar impact, and your first recommended savings test. In your terminal.',
    code: 'Structural waste: $43.17 (29.1%)',
  },
  {
    number: '03',
    title: 'Fix and re-audit',
    body: 'Apply the fix. Re-run. Xerg shows the before/after so you can see exactly what changed and by how much.',
    code: 'xerg audit --compare',
  },
];

function SectionIntro({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
        {label}
      </p>
      <h2 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-[color:var(--heading)] sm:text-5xl">
        {title}
      </h2>
      <p className="max-w-2xl text-base leading-7 text-[color:var(--text)] sm:text-lg">
        {description}
      </p>
    </>
  );
}

function CliPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-raised)] shadow-[0_24px_80px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center gap-2 border-b border-[color:var(--border)] bg-[color:var(--bg-card)] px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#f87171]" />
        <span className="size-2.5 rounded-full bg-[#fbbf24]" />
        <span className="size-2.5 rounded-full bg-[#34d399]" />
        <span className="ml-2 text-xs text-[color:var(--text-dim)]">Terminal — xerg audit</span>
      </div>
      <div className="p-5 font-mono text-[13px] leading-7">
        <div className="mb-4 text-[color:var(--text-dim)]">
          <span className="text-[color:var(--accent)]">$</span> npx xerg audit --week
        </div>

        <div className="space-y-1 text-[color:var(--text-dim)]">
          <div>
            <span className="text-[color:var(--text)]">Period</span>{' '}
            <span className="font-medium text-[color:var(--text-bright)]">
              Feb 24 – Mar 2, 2026
            </span>
          </div>
          <div>
            <span className="text-[color:var(--text)]">Runs analyzed</span>{' '}
            <span className="font-medium text-[color:var(--text-bright)]">1,847</span>
          </div>
          <div>
            <span className="text-[color:var(--text)]">Total spend</span>{' '}
            <span className="font-medium text-[color:var(--text-bright)]">$148.32</span>
          </div>
          <div>
            <span className="text-[color:var(--text)]">Structural waste</span>{' '}
            <span className="font-medium text-[color:var(--red)]">$43.17 (29.1%)</span>
          </div>
        </div>

        <div className="my-4 h-px bg-[color:var(--border)]" />

        <div className="mb-2 font-medium text-[color:var(--text-bright)]">Waste breakdown</div>
        <div className="my-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
          <div className="grow-[31] rounded-full bg-[color:var(--red)]" />
          <div className="grow-[38] rounded-full bg-[color:var(--amber)]" />
          <div className="grow-[14] rounded-full bg-[#c084fc]" />
          <div className="grow-[17] rounded-full bg-[color:var(--blue)]" />
        </div>
        <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[color:var(--text-dim)]">
          {[
            ['Retry $13.40', 'bg-[color:var(--red)]'],
            ['Context $16.28', 'bg-[color:var(--amber)]'],
            ['Loops $5.91', 'bg-[#c084fc]'],
            ['Downgrade $7.58', 'bg-[color:var(--blue)]'],
          ].map(([label, dotClass]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', dotClass)} />
              {label}
            </span>
          ))}
        </div>

        <div className="my-4 h-px bg-[color:var(--border)]" />

        <div className="mb-2 font-medium text-[color:var(--text-bright)]">Top waste drivers</div>
        <div className="space-y-1 text-[color:var(--text-dim)]">
          <div>
            <span className="text-[color:var(--red)]">1.</span> support_triage — context bloat{' '}
            <span className="text-[color:var(--red)]">$9.41/wk</span>
          </div>
          <div>
            <span className="text-[color:var(--red)]">2.</span> code_review — retry storms{' '}
            <span className="text-[color:var(--red)]">$7.20/wk</span>
          </div>
          <div>
            <span className="text-[color:var(--red)]">3.</span> daily_summary — Sonnet on a Haiku
            task <span className="text-[color:var(--red)]">$5.80/wk</span>
          </div>
          <div>
            <span className="text-[color:var(--red)]">4.</span> ticket_router — 12-loop avg
            (typical: 4) <span className="text-[color:var(--red)]">$4.63/wk</span>
          </div>
        </div>

        <div className="my-4 h-px bg-[color:var(--border)]" />

        <div className="rounded-r-md rounded-l-sm border-l-2 border-[color:var(--accent)] bg-[rgba(45,212,168,0.06)] px-3 py-2">
          <div className="text-[color:var(--text-dim)]">
            <span className="text-[color:var(--accent)]">First savings test:</span> downgrade
            daily_summary → Haiku
          </div>
          <div className="text-[color:var(--text-dim)]">
            <span className="text-[color:var(--accent)]">Estimated weekly impact:</span>{' '}
            <span className="text-[color:var(--accent)]">−$5.80</span>
          </div>
          <div className="text-xs text-[color:var(--text-dim)]">
            Cost per Outcome: unlock with outcome tracking →
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[color:var(--border)] bg-[rgba(10,14,20,0.85)] backdrop-blur-xl">
        <div className={`${containerClass} flex items-center justify-between gap-6 py-4`}>
          <a
            href="#top"
            className="font-mono text-lg font-semibold tracking-[-0.03em] text-[color:var(--heading)]"
          >
            xerg<span className="text-[color:var(--accent)]">.</span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            <a
              className="text-sm text-[color:var(--text-dim)] transition hover:text-[color:var(--text-bright)]"
              href="#how-it-works"
            >
              How it works
            </a>
            <a
              className="text-sm text-[color:var(--text-dim)] transition hover:text-[color:var(--text-bright)]"
              href="#what-you-see"
            >
              What you see
            </a>
            <a
              className="text-sm text-[color:var(--text-dim)] transition hover:text-[color:var(--text-bright)]"
              href="#pricing"
            >
              Pricing
            </a>
            <a
              className="text-sm text-[color:var(--text-dim)] transition hover:text-[color:var(--text-bright)]"
              href="https://github.com/xergai"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <a
              className="rounded-lg border border-[color:var(--accent-dim)] px-4 py-2 text-sm text-[color:var(--accent)] transition hover:bg-[color:var(--accent-glow)]"
              href="#waitlist"
            >
              Get early access →
            </a>
          </div>
        </div>
      </nav>

      <section id="top" className="relative overflow-hidden pt-40 pb-24 sm:pt-44 sm:pb-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[38rem] w-[50rem] max-w-full rounded-full bg-[radial-gradient(ellipse,rgba(45,212,168,0.05)_0%,transparent_70%)]" />
        <div className={`${containerClass} relative`}>
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16">
            <div className="animate-[fade-up_0.6s_ease-out_both]">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,168,0.15)] bg-[color:var(--accent-glow)] px-4 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--accent)]">
                <span className="size-1.5 rounded-full bg-[color:var(--accent)]" />
                Economic audit for AI agents
              </div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.03] tracking-[-0.06em] text-[color:var(--heading)] sm:text-6xl lg:text-[4.25rem]">
                Your agents spent $148 this week.{' '}
                <span className="text-[color:var(--accent)]">$43 was waste.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--text)]">
                Xerg reads your agent logs and tells you{' '}
                <strong className="font-semibold text-[color:var(--text-bright)]">
                  exactly where money is leaking
                </strong>{' '}
                — retries, bloated context, expensive models on cheap tasks, runaway loops. In
                dollars, not tokens.{' '}
                <strong className="font-semibold text-[color:var(--text-bright)]">
                  One command. No account.
                </strong>
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent)] px-6 py-3 font-mono text-sm font-medium text-[color:var(--accent-foreground)] transition hover:-translate-y-0.5 hover:bg-[#3be0b6] hover:shadow-[0_4px_20px_rgba(45,212,168,0.25)]"
                  href="#start"
                  style={{ color: 'var(--accent-foreground)' }}
                >
                  npx xerg audit →
                </a>
                <a
                  className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-bright)] bg-[color:var(--bg-card)] px-6 py-3 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--bg-card-hover)] hover:border-[color:var(--text-dim)]"
                  href="#waitlist"
                >
                  Join the team waitlist
                </a>
              </div>
              <p className="mt-3 text-sm text-[color:var(--text-dim)]">
                Runs locally. No config. No network. 30 seconds to first report.
              </p>
            </div>
            <div className="animate-[fade-up_0.6s_ease-out_0.15s_both]">
              <CliPreview />
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24">
        <div className={`${containerClass} space-y-14`}>
          <SectionIntro
            label="The problem"
            title="You can see what you spent. You cannot see what you wasted."
            description="Every tool in the market shows you a spend total. None of them tell you which dollars produced outcomes and which ones burned in retries, bloated prompts, or wrong-model calls."
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {problemCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="group relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] p-8 transition duration-200 hover:border-[color:var(--border-bright)] hover:bg-[color:var(--bg-card-hover)]"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--border-bright),transparent)] opacity-0 transition group-hover:opacity-100" />
                  <div
                    className={cn(
                      'mb-5 flex size-10 items-center justify-center rounded-lg',
                      card.iconClassName,
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-[color:var(--heading)]">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--text-dim)]">{card.body}</p>
                  <div className="mt-5 border-t border-[color:var(--border)] pt-4 font-mono text-xs">
                    <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-dim)]">
                      {card.exampleLabel}
                    </div>
                    <div className="space-y-1">
                      <div className="text-[color:var(--text)]">{card.exampleLines[0]}</div>
                      <div className="text-[color:var(--text-dim)]">{card.exampleLines[1]}</div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="what-you-see" className="border-t border-[color:var(--border)] py-24">
        <div className={`${containerClass} space-y-14`}>
          <SectionIntro
            label="What Xerg finds"
            title="Five types of waste. All in dollars."
            description="Not token counts. Not vague optimization opportunities. Dollar amounts per waste category, per workflow, per week — so you know exactly where to cut first."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {wasteCategories.map((category) => (
              <article
                key={category.name}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-5 py-6 text-center transition hover:-translate-y-0.5 hover:border-[color:var(--border-bright)]"
              >
                <div className={cn('font-mono text-2xl font-semibold', category.amountClassName)}>
                  {category.amount}
                </div>
                <h3 className="mt-2 text-sm font-semibold text-[color:var(--text-bright)]">
                  {category.name}
                </h3>
                <p className="mt-2 text-xs leading-5 text-[color:var(--text-dim)]">
                  {category.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] py-24">
        <div className={`${containerClass} space-y-14`}>
          <SectionIntro
            label="What makes Xerg different"
            title="Not a dashboard. Not a router. An economic audit."
            description="Four things no other tool in the market does today."
          />
          <div className="grid gap-5 lg:grid-cols-2">
            {differentiators.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-8 py-9 transition hover:border-[color:var(--border-bright)]"
                >
                  <h3 className="flex items-center gap-3 text-xl font-semibold text-[color:var(--heading)]">
                    <span className="flex size-8 items-center justify-center rounded-lg border border-[rgba(45,212,168,0.15)] bg-[color:var(--accent-glow)] text-[color:var(--accent)]">
                      <Icon className="size-4" />
                    </span>
                    {item.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[color:var(--text-dim)]">{item.body}</p>
                  <div className="mt-5 rounded-xl border border-[rgba(248,113,113,0.1)] bg-[rgba(248,113,113,0.04)] px-4 py-3 text-sm leading-6 text-[color:var(--text-dim)]">
                    <strong className="font-medium text-[color:var(--red)]">Others:</strong>{' '}
                    {item.contrast}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t border-[color:var(--border)] py-24">
        <div className={`${containerClass} space-y-14`}>
          <SectionIntro
            label="Where it goes"
            title="Start with waste. Graduate to unit economics. Scale to governance."
            description="Every level delivers value on its own. The product gets dramatically more powerful as you climb."
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {pricingLadder.map((plan) => (
              <article
                key={plan.title}
                className={cn(
                  'overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-7 py-9 transition hover:border-[color:var(--border-bright)]',
                  plan.featured &&
                    'border-[rgba(45,212,168,0.25)] bg-[linear-gradient(180deg,rgba(45,212,168,0.04)_0%,var(--bg-card)_40%)]',
                )}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--accent)]">
                  {plan.level}
                </p>
                <h3 className="mt-4 text-[1.75rem] font-semibold tracking-[-0.03em] text-[color:var(--heading)]">
                  {plan.title}
                </h3>
                <p className="mt-2 font-mono text-sm text-[color:var(--text-dim)]">{plan.price}</p>
                <p className="mt-5 text-sm leading-7 text-[color:var(--text)]">{plan.body}</p>
                <ul className="mt-5 space-y-2">
                  {plan.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-sm leading-6 text-[color:var(--text-dim)]"
                    >
                      <Waypoints className="mt-1 size-3.5 shrink-0 text-[color:var(--accent)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="start" className="border-t border-[color:var(--border)] py-24">
        <div className={`${containerClass} space-y-14`}>
          <SectionIntro
            label="Getting started"
            title="30 seconds to your first waste report."
            description="No signup. No config file. No API key. If you have agent logs, you have everything you need."
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {gettingStartedSteps.map((step, index) => {
              const icons = [RefreshCcw, ChartColumnIncreasing, GitCompareArrows] as const;
              const Icon = icons[index];
              return (
                <article
                  key={step.title}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-7 py-8 transition hover:border-[color:var(--border-bright)]"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="font-mono text-[2rem] font-semibold text-[color:var(--border-bright)]">
                      {step.number}
                    </div>
                    <Icon className="size-5 text-[color:var(--accent)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[color:var(--heading)]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--text-dim)]">{step.body}</p>
                  <code className="mt-4 block rounded-lg border border-[rgba(45,212,168,0.1)] bg-[rgba(45,212,168,0.06)] px-3 py-2 font-mono text-xs text-[color:var(--accent)]">
                    {step.code}
                  </code>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="waitlist" className="border-t border-[color:var(--border)] py-24 text-center">
        <div className={`${containerClass} flex flex-col items-center space-y-8`}>
          <SectionIntro
            label="Early access"
            title="The CLI ships first. The dashboard follows."
            description="Join the waitlist for CLI launch news, early team access, and design partner invites where the economic signal is clean."
          />
          <SignupForm
            align="center"
            buttonClassName="rounded-lg px-6 font-mono text-sm"
            className="max-w-[28.75rem]"
            inputClassName="rounded-lg border-[color:var(--border-bright)] bg-[color:var(--bg-card)] px-4 text-[color:var(--text-bright)]"
            note="No spam. Just launch updates and early invites."
            noteClassName="text-[13px] text-[color:var(--text-dim)]"
            submitLabel="Get launch updates →"
          />
        </div>
      </section>

      <footer className="border-t border-[color:var(--border)] py-10">
        <div
          className={`${containerClass} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}
        >
          <p className="text-sm text-[color:var(--text-dim)]">
            Xerg — local-first waste intelligence for AI agent workflows.
          </p>
          <div className="flex flex-wrap items-center gap-6 text-sm text-[color:var(--text-dim)]">
            <a
              className="transition hover:text-[color:var(--text)]"
              href="https://github.com/xergai"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <a className="transition hover:text-[color:var(--text)]" href="mailto:query@xerg.ai">
              query@xerg.ai
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
