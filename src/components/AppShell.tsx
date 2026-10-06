import { Link, Outlet, useLocation } from 'react-router-dom'
import { SiteFooter } from './SiteFooter'

export function AppShell() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {!isHome ? (
        <header className="shrink-0 border-b border-[var(--line)] bg-white/80 px-4 py-2.5 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <Link
              to="/"
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              ← All tools
            </Link>
            <Link
              to="/"
              className="text-xs font-semibold tracking-[0.16em] uppercase text-[var(--ink)]"
            >
              SignPDF Tools
            </Link>
          </div>
        </header>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>

      <SiteFooter />
    </div>
  )
}
