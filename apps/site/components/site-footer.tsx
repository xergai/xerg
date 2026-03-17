const containerClass = 'mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8';

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--border)] py-10">
      <div
        className={`${containerClass} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}
      >
        <p className="text-sm text-[color:var(--text)]">
          Xerg — the unit economics engine for AI agents.
        </p>
        <div className="flex flex-wrap items-center gap-6 text-sm text-[color:var(--text)]">
          <a
            className="transition hover:text-[color:var(--text-bright)]"
            href="https://github.com/xergai/xerg"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <a
            className="transition hover:text-[color:var(--text-bright)]"
            href="mailto:query@xerg.ai"
          >
            query@xerg.ai
          </a>
        </div>
      </div>
    </footer>
  );
}
