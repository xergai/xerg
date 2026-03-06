import { Footer } from '@/components/footer';
import { Hero } from '@/components/hero';
import { HowItStartsSection } from '@/components/how-it-starts';
import { ProblemSection } from '@/components/problem';
import { WhatItIsSection } from '@/components/what-it-is';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <Hero />
      <section className="space-y-4 pt-6">
        <p className="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">Why now</p>
        <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Most teams can already see spend. The harder problem is knowing what to fix.
        </h2>
      </section>
      <ProblemSection />
      <section className="space-y-4 pt-8">
        <p className="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">
          What Xerg is
        </p>
        <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          An economic audit for AI agents that starts with local waste intelligence.
        </h2>
      </section>
      <WhatItIsSection />
      <section className="space-y-4 pt-8">
        <p className="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">
          How it starts
        </p>
        <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          OpenClaw first. Local first. Fix the leak before you build the platform.
        </h2>
      </section>
      <HowItStartsSection />
      <Footer />
    </main>
  );
}
