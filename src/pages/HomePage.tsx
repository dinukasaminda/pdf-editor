import { Link } from 'react-router-dom'

const tools = [
  {
    to: '/pdf',
    title: 'PDF Signature',
    description:
      'Upload a PDF, place your signature, adjust ink color, then export a signed file.',
    accent: 'bg-[var(--ink)]',
    badge: 'PDF',
  },
  {
    to: '/photo-blur',
    title: 'Photo Blur',
    description:
      'Upload a photo, mark private areas, then apply soft blur, motion blur, or B&W noise — download full quality.',
    accent: 'bg-[var(--accent)]',
    badge: 'Photo',
  },
]

export function HomePage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[var(--accent)]">
            SignPDF Tools
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            Choose a tool
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            Pick what you need. Each tool runs in your browser — files stay on
            your device.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="group rounded-2xl border border-[var(--line)] bg-white/90 p-6 shadow-[0_12px_40px_rgba(26,39,68,0.06)] transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_16px_44px_rgba(15,110,86,0.12)]"
            >
              <span
                className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold text-white ${tool.accent}`}
              >
                {tool.badge}
              </span>
              <h2 className="mt-4 text-xl font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
                {tool.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {tool.description}
              </p>
              <p className="mt-5 text-sm font-medium text-[var(--accent)]">
                Open tool →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
