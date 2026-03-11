import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Mail,
  Package,
  ScanSearch,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';
import type { Metadata } from 'next';

import { CopyCommand } from '@/components/copy-command';

export const metadata: Metadata = {
  title: 'Xerg Pilot',
  description:
    'A clear pilot invitation for OpenClaw users to install Xerg, run an audit, and share results.',
};

const containerClass = 'mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8';

const pilotHighlights = [
  'Free pilot for people actively using OpenClaw',
  'Runs locally on your machine. No account, no hosted ingestion, no proxy',
  'Takes about 10 minutes to install, audit, and export something shareable',
];

const steps = [
  {
    number: '01',
    title: 'Install Xerg',
    body: 'Global install is the easiest path if you plan to run doctor, audit, and compare a few times.',
    command: 'npm install -g @xerg/cli',
    note: 'If you would rather avoid a global install, you can use npx for the first run.',
    altCommand: 'npx @xerg/cli audit',
    icon: Package,
  },
  {
    number: '02',
    title: 'Check that Xerg can see your OpenClaw data',
    body: 'This confirms whether your machine has readable OpenClaw gateway logs or session transcripts.',
    command: 'xerg doctor',
    note: 'If doctor says no sources were found, reply to me and I will help you locate the logs.',
    icon: ScanSearch,
  },
  {
    number: '03',
    title: 'Run your first audit',
    body: 'Xerg will show spend, structural waste, top waste drivers, and the first savings test worth trying.',
    command: 'xerg audit',
    note: 'If you only want a recent window, use something like `xerg audit --since 24h`.',
    icon: TerminalSquare,
  },
  {
    number: '04',
    title: 'Export something easy to share',
    body: 'Markdown is the easiest format to forward by email, paste into chat, or attach to a note.',
    command: 'xerg audit --markdown > xerg-audit.md',
    note: 'A terminal screenshot is also fine if that is faster.',
    icon: FileText,
  },
  {
    number: '05',
    title: 'Make one fix and re-run compare',
    body: 'Try one small change: trim context, stop a retry storm, or swap an expensive model on a cheap task.',
    command: 'xerg audit --compare',
    note: 'Compare is the quickest way for me to see whether the audit is actually helping in the real world.',
    icon: Sparkles,
  },
];

const feedbackItems = [
  'Send me the markdown report, a screenshot, or both.',
  'Tell me what workflow you tested and what felt clearly right or clearly wrong.',
  'If Xerg misses something obvious, that is especially useful feedback.',
];

export default function PilotPage() {
  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[color:var(--border)] bg-[rgba(10,14,20,0.85)] backdrop-blur-xl">
        <div className={`${containerClass} flex items-center justify-between gap-6 py-4`}>
          <a
            href="/"
            className="font-mono text-lg font-semibold tracking-[-0.03em] text-[color:var(--heading)]"
          >
            xerg<span className="text-[color:var(--accent)]">.</span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            <a
              className="text-sm text-[color:var(--text-dim)] transition hover:text-[color:var(--text-bright)]"
              href="#steps"
            >
              Setup
            </a>
            <a
              className="text-sm text-[color:var(--text-dim)] transition hover:text-[color:var(--text-bright)]"
              href="#share"
            >
              Share results
            </a>
            <a
              className="text-sm text-[color:var(--text-dim)] transition hover:text-[color:var(--text-bright)]"
              href="https://www.npmjs.com/package/@xerg/cli"
              rel="noreferrer"
              target="_blank"
            >
              npm
            </a>
            <a
              className="rounded-lg border border-[color:var(--accent-dim)] px-4 py-2 text-sm text-[color:var(--accent)] transition hover:bg-[color:var(--accent-glow)]"
              href="mailto:query@xerg.ai?subject=Xerg%20pilot"
            >
              Email results →
            </a>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden pt-40 pb-24 sm:pt-44 sm:pb-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[38rem] w-[50rem] max-w-full rounded-full bg-[radial-gradient(ellipse,rgba(45,212,168,0.05)_0%,transparent_70%)]" />
        <div className={`${containerClass} relative`}>
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
            <div className="animate-[fade-up_0.6s_ease-out_both]">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,168,0.15)] bg-[color:var(--accent-glow)] px-4 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--accent)]">
                <span className="size-1.5 rounded-full bg-[color:var(--accent)]" />
                Xerg pilot for OpenClaw users
              </div>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[1.03] tracking-[-0.06em] text-[color:var(--heading)] sm:text-6xl lg:text-[4.15rem]">
                Run a quick audit on your OpenClaw workflows and send me what Xerg finds.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[color:var(--text)]">
                If you are already using OpenClaw, I would love your help testing Xerg in the real
                world. The pilot is free, local-first, and intentionally lightweight. Install it,
                run one audit, try one fix, then share the result with me so I can improve the
                product quickly.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
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
              <p className="mt-3 text-sm text-[color:var(--text-dim)]">
                One command to start. No account. No cloud setup. No hosted ingestion.
              </p>
            </div>

            <aside className="animate-[fade-up_0.6s_ease-out_0.15s_both] rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,255,255,0.02)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
                Pilot snapshot
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--heading)]">
                What you are agreeing to
              </h2>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-[color:var(--text)]">
                {pilotHighlights.map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-[color:var(--accent)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-xl border border-[rgba(45,212,168,0.12)] bg-[rgba(45,212,168,0.06)] px-4 py-4">
                <p className="text-sm leading-6 text-[color:var(--text)]">
                  In return, I will read the results personally and use them to tighten the parser,
                  findings quality, and real-world usefulness of the CLI.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] py-24">
        <div
          className={`${containerClass} grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]`}
        >
          <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-8 py-9">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
              What to expect
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-[color:var(--heading)]">
              This should feel like a quick product check, not a consulting project.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--text)]">
              You do not need to clean data, instrument new code, or sign up for anything. The goal
              is to see whether Xerg can find believable waste in your actual OpenClaw runs and
              whether the before/after compare is useful after one small change.
            </p>
          </article>
          <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-8 py-9">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
              Best fit
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--text)]">
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-[color:var(--accent)]" />
                You already run OpenClaw locally or on a machine you can access.
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-[color:var(--accent)]" />
                You can spend 10 to 15 minutes running the audit and exporting a report.
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-[color:var(--accent)]" />
                You are willing to send a screenshot, markdown export, or quick note on what felt
                accurate or off.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="steps" className="border-t border-[color:var(--border)] py-24">
        <div className={`${containerClass} space-y-14`}>
          <div className="space-y-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
              Pilot steps
            </p>
            <h2 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-[color:var(--heading)] sm:text-5xl">
              Install, audit, compare, then send me what happened.
            </h2>
            <p className="max-w-2xl text-base leading-7 text-[color:var(--text)] sm:text-lg">
              These are the exact commands I recommend. Copy them directly if that is easiest.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.title}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-7 py-8 transition hover:border-[color:var(--border-bright)]"
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-mono text-[2rem] font-semibold text-[color:var(--border-bright)]">
                        {step.number}
                      </div>
                    </div>
                    <Icon className="size-5 text-[color:var(--accent)]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[color:var(--heading)]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--text)]">{step.body}</p>
                  <div className="mt-5">
                    <CopyCommand command={step.command} />
                  </div>
                  {'altCommand' in step && step.altCommand ? (
                    <div className="mt-3">
                      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[color:var(--text-dim)]">
                        Alternative
                      </p>
                      <CopyCommand
                        command={step.altCommand}
                        className="bg-[rgba(96,165,250,0.06)]"
                      />
                    </div>
                  ) : null}
                  <p className="mt-4 text-sm leading-6 text-[color:var(--text-dim)]">{step.note}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="share" className="border-t border-[color:var(--border)] py-24">
        <div className={`${containerClass} grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]`}>
          <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-8 py-9">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
              What to send me
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-[color:var(--heading)]">
              Keep it simple. I care more about real usage than polished writeups.
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-[color:var(--text)]">
              {feedbackItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-[color:var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)] transition hover:-translate-y-0.5 hover:bg-[#3be0b6]"
                href="mailto:query@xerg.ai?subject=Xerg%20pilot%20results"
                style={{ color: 'var(--accent-foreground)' }}
              >
                <Mail className="size-4" />
                Email query@xerg.ai
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-bright)] bg-[color:var(--bg-card)] px-5 py-3 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--bg-card-hover)] hover:border-[color:var(--text-dim)]"
                href="/"
              >
                Back to xerg.ai
              </a>
            </div>
          </article>

          <aside className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-7 py-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
              Useful links
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <a
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-raised)] px-4 py-3 text-[color:var(--text)] transition hover:border-[color:var(--border-bright)]"
                href="https://www.npmjs.com/package/@xerg/cli"
                rel="noreferrer"
                target="_blank"
              >
                <span>npm package</span>
                <ArrowUpRight className="size-4 text-[color:var(--accent)]" />
              </a>
              <a
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-raised)] px-4 py-3 text-[color:var(--text)] transition hover:border-[color:var(--border-bright)]"
                href="mailto:query@xerg.ai?subject=Xerg%20pilot"
              >
                <span>query@xerg.ai</span>
                <Mail className="size-4 text-[color:var(--accent)]" />
              </a>
              <a
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-raised)] px-4 py-3 text-[color:var(--text)] transition hover:border-[color:var(--border-bright)]"
                href="/"
              >
                <span>Main site</span>
                <ArrowUpRight className="size-4 text-[color:var(--accent)]" />
              </a>
            </div>
          </aside>
        </div>
      </section>

      <footer className="border-t border-[color:var(--border)] py-10">
        <div
          className={`${containerClass} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}
        >
          <p className="text-sm text-[color:var(--text-dim)]">
            Xerg pilot — local-first waste intelligence for OpenClaw workflows.
          </p>
          <div className="flex flex-wrap items-center gap-6 text-sm text-[color:var(--text-dim)]">
            <a
              className="transition hover:text-[color:var(--text)]"
              href="https://www.npmjs.com/package/@xerg/cli"
              rel="noreferrer"
              target="_blank"
            >
              @xerg/cli
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
