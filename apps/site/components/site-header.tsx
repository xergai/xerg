import Image from 'next/image';

const containerClass = 'mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8';

const linkClass =
  'text-sm text-[color:var(--text-dim)] transition hover:text-[color:var(--text-bright)]';

export function SiteHeader() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[color:var(--border)] bg-[rgba(10,14,20,0.85)] backdrop-blur-xl">
      <div className={`${containerClass} flex items-center justify-between gap-6 py-4`}>
        <a href="/" className="inline-flex items-center" aria-label="Xerg home">
          <Image
            src="/xerg-wordmark.png"
            alt="Xerg"
            width={1048}
            height={317}
            priority
            className="h-7 w-auto sm:h-8"
          />
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <a className={linkClass} href="/#how-it-works">
            How it works
          </a>
          <a className={linkClass} href="/#what-you-see">
            What you see
          </a>
          <a className={linkClass} href="/#pricing">
            Where it goes
          </a>
          <a
            className={linkClass}
            href="https://github.com/xergai/xerg"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <a
            className="rounded-lg border border-[color:var(--accent-dim)] px-4 py-2 text-sm text-[color:var(--accent)] transition hover:bg-[color:var(--accent-glow)]"
            href="/#waitlist"
          >
            Get early access →
          </a>
        </div>
      </div>
    </nav>
  );
}
