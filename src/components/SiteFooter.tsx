export function SiteFooter() {
  return (
    <footer className="shrink-0 border-t border-[var(--line)] bg-white/80 px-4 py-2.5 text-center text-xs text-[var(--muted)] backdrop-blur">
      <p>
        © {new Date().getFullYear()}{' '}
        <a
          href="https://github.com/dinukasaminda"
          target="_blank"
          rel="author noopener noreferrer"
          className="font-medium text-[var(--ink)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
        >
          Dinuka Bandara
        </a>
      </p>
    </footer>
  )
}
