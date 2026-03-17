import { ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';

import { CopyCommand } from '@/components/copy-command';
import { PilotForm } from '@/components/pilot-form';

export const metadata: Metadata = {
  title: 'Xerg Pilot',
  description: 'Pilot invitation for OpenClaw users to test Xerg waste intelligence.',
};

const containerClass = 'mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8';

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
              Install, run one audit, submit the results below. That&apos;s it.
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
              The three steps
            </p>
            <h2 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-[color:var(--heading)] sm:text-5xl">
              Install, audit, submit.
            </h2>
          </div>

          <div className="mx-auto max-w-2xl space-y-4">
            <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-7 py-6 transition hover:border-[color:var(--border-bright)]">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-lg font-semibold text-[color:var(--border-bright)]">
                  01
                </span>
                <h3 className="text-lg font-semibold text-[color:var(--heading)]">
                  Install and check
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-dim)]">
                Install globally, then confirm Xerg can see your OpenClaw logs.
              </p>
              <div className="mt-4 space-y-2">
                <CopyCommand command="npm install -g @xerg/cli" />
                <CopyCommand command="xerg doctor" />
              </div>
            </article>

            <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-7 py-6 transition hover:border-[color:var(--border-bright)]">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-lg font-semibold text-[color:var(--border-bright)]">
                  02
                </span>
                <h3 className="text-lg font-semibold text-[color:var(--heading)]">Run the audit</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-dim)]">
                Shows spend, structural waste, top drivers, and first recommended fix.
              </p>
              <div className="mt-4">
                <CopyCommand command="xerg audit" />
              </div>
            </article>

            <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-7 py-6 transition hover:border-[color:var(--border-bright)]">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-lg font-semibold text-[color:var(--border-bright)]">
                  03
                </span>
                <h3 className="text-lg font-semibold text-[color:var(--heading)]">
                  Submit your results
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-dim)]">
                Export the report and upload it in the form below.
              </p>
              <div className="mt-4">
                <CopyCommand command="xerg audit --markdown > xerg-audit.md" />
              </div>
              <p className="mt-2 text-xs text-[color:var(--text-dim)]">
                JSON works too:{' '}
                <code className="font-mono text-[color:var(--text)]">
                  xerg audit --json &gt; xerg-audit.json
                </code>
              </p>
            </article>

            <p className="text-sm text-[color:var(--text-dim)]">
              Bonus: try one fix and run{' '}
              <code className="font-mono text-[color:var(--text)]">xerg audit --compare</code> to
              see the before/after. Submit that report too if you have it.
            </p>
          </div>
        </div>
      </section>

      <section id="submit" className="border-t border-[color:var(--border)] py-24">
        <div className={`${containerClass} mx-auto max-w-2xl`}>
          <h2 className="text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-[color:var(--heading)]">
            Send your results
          </h2>
          <div className="mt-8">
            <PilotForm />
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
