import { ArrowUpRight, Mail } from 'lucide-react';
import type { Metadata } from 'next';

import { CopyCommand } from '@/components/copy-command';

export const metadata: Metadata = {
  title: 'Xerg Pilot',
  description: "Pilot invitation for OpenClaw users to test Xerg's local waste audit.",
};

const containerClass = 'mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8';

const steps = [
  {
    number: '01',
    title: 'Install',
    body: "Global install is easiest if you'll run it more than once.",
    command: 'npm install -g @xerg/cli',
  },
  {
    number: '02',
    title: 'Check your data',
    body: 'Confirms Xerg can find your OpenClaw logs. Works on your local machine or over SSH on a VPS.',
    command: 'xerg doctor',
  },
  {
    number: '03',
    title: 'Run the audit',
    body: 'Shows spend, structural waste, top drivers, and first recommended fix.',
    command: 'xerg audit',
  },
  {
    number: '04',
    title: 'Export a report',
    body: 'Markdown is easiest to share. A terminal screenshot also works.',
    command: 'xerg audit --markdown > xerg-audit.md',
  },
  {
    number: '05',
    title: 'Fix one thing and compare',
    body: 'Try one change — trim context, fix a retry, swap a model — then re-run.',
    command: 'xerg audit --compare',
  },
];

export default function PilotPage() {
  return (
    <main>
      <section className="relative overflow-hidden pt-40 pb-24 sm:pt-44 sm:pb-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[38rem] w-[50rem] max-w-full rounded-full bg-[radial-gradient(ellipse,rgba(45,212,168,0.05)_0%,transparent_70%)]" />
        <div className={`${containerClass} relative`}>
          <div className="mx-auto max-w-3xl animate-[fade-up_0.6s_ease-out_both] text-center">
            <h1 className="text-5xl font-semibold leading-[1.03] tracking-[-0.06em] text-[color:var(--heading)] sm:text-6xl">
              Xerg Pilot — OpenClaw waste audit
            </h1>
            <p className="mt-6 text-lg leading-8 text-[color:var(--text)]">
              Install, run one audit, try one fix, share the result. That&apos;s it.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent)] px-6 py-3 font-mono text-sm font-medium text-[color:var(--accent-foreground)] transition hover:-translate-y-0.5 hover:bg-[#3be0b6] hover:shadow-[0_4px_20px_rgba(45,212,168,0.25)]"
                href="#steps"
                style={{ color: 'var(--accent-foreground)' }}
              >
                Start the pilot →
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-bright)] bg-[color:var(--bg-card)] px-6 py-3 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--bg-card-hover)] hover:border-[color:var(--text-dim)]"
                href="https://www.npmjs.com/package/@xerg/cli"
                rel="noreferrer"
                target="_blank"
              >
                View npm package <ArrowUpRight className="size-4" />
              </a>
            </div>
            <p className="mt-4 text-sm text-[color:var(--text-dim)]">
              Free. No account. Works wherever your OpenClaw logs live. ~10 minutes.
            </p>
          </div>
        </div>
      </section>

      <section id="steps" className="border-t border-[color:var(--border)] py-24">
        <div className={`${containerClass} space-y-14`}>
          <div className="space-y-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
              The five steps
            </p>
            <h2 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-[color:var(--heading)] sm:text-5xl">
              Install, audit, compare, send.
            </h2>
          </div>

          <div className="mx-auto max-w-2xl space-y-4">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-7 py-6 transition hover:border-[color:var(--border-bright)]"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-lg font-semibold text-[color:var(--border-bright)]">
                    {step.number}
                  </span>
                  <h3 className="text-lg font-semibold text-[color:var(--heading)]">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-dim)]">{step.body}</p>
                <div className="mt-4">
                  <CopyCommand command={step.command} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="share" className="border-t border-[color:var(--border)] py-24">
        <div className={`${containerClass} mx-auto max-w-2xl`}>
          <h2 className="text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-[color:var(--heading)]">
            Send me the results
          </h2>
          <ul className="mt-6 space-y-3 text-sm leading-6 text-[color:var(--text)]">
            <li className="flex gap-3">
              <span className="mt-1 text-[color:var(--accent)]">•</span>
              The markdown report, a screenshot, or both
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-[color:var(--accent)]">•</span>
              Which workflow you tested and what felt right or off
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-[color:var(--accent)]">•</span>
              If Xerg missed something obvious, that&apos;s especially useful
            </li>
          </ul>
          <div className="mt-6">
            <a
              className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)] transition hover:-translate-y-0.5 hover:bg-[#3be0b6]"
              href="mailto:jason@xerg.ai?subject=Xerg%20pilot%20results"
              style={{ color: 'var(--accent-foreground)' }}
            >
              <Mail className="size-4" />
              Email jason@xerg.ai
            </a>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className={`${containerClass} mx-auto max-w-2xl`}>
          <div className="rounded-2xl border border-[rgba(45,212,168,0.15)] bg-[color:var(--accent-glow)] px-7 py-6 text-center">
            <p className="text-sm leading-6 text-[color:var(--text)]">
              Pilot participants will be credited as founding testers when Xerg goes public.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
