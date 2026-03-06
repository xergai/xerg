export function Footer() {
  return (
    <footer className="flex flex-col gap-3 border-t border-[color:var(--border)] pt-8 text-sm text-[color:var(--muted)] sm:flex-row sm:items-center sm:justify-between">
      <p>Xerg is building local-first waste intelligence for AI agent workflows.</p>
      <div className="flex flex-wrap items-center gap-4">
        <a className="transition hover:text-white" href="https://github.com/xergai">
          github.com/xergai
        </a>
        <a className="transition hover:text-white" href="mailto:query@xerg.ai">
          query@xerg.ai
        </a>
      </div>
    </footer>
  );
}
