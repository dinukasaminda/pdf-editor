import { useEffect } from 'react'
import type { PageSize, PlacedSignature } from '../types'

type Page = {
  url: string
  size: PageSize
}

type Props = {
  open: boolean
  pages: Page[]
  signatureUrl: string | null
  placements: PlacedSignature[]
  onClose: () => void
}

export function FullscreenPreview({
  open,
  pages,
  signatureUrl,
  placements,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a2744]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#152038] px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#8fd6be]">
            Preview
          </p>
          <h2 className="text-base font-semibold text-white">
            Signed document
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[#d8efe7]"
        >
          Close
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 pb-10">
          {pages.map((page, index) => {
            const pagePlacements = placements.filter(
              (placement) => placement.pageIndex === index,
            )

            return (
              <section key={`preview-page-${index}`} className="w-full">
                <div
                  className="relative mx-auto w-full overflow-hidden bg-white shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
                  style={{
                    maxWidth: page.size.width,
                    aspectRatio: `${page.size.width} / ${page.size.height}`,
                  }}
                >
                  <img
                    src={page.url}
                    alt={`Preview page ${index + 1}`}
                    className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
                    draggable={false}
                  />

                  {signatureUrl
                    ? pagePlacements.map((placement) => (
                        <img
                          key={placement.id}
                          src={signatureUrl}
                          alt="Placed signature"
                          draggable={false}
                          className="pointer-events-none absolute object-contain"
                          style={{
                            left: `${(placement.x / page.size.width) * 100}%`,
                            top: `${(placement.y / page.size.height) * 100}%`,
                            width: `${(placement.width / page.size.width) * 100}%`,
                            height: `${(placement.height / page.size.height) * 100}%`,
                          }}
                        />
                      ))
                    : null}
                </div>
                <p className="mt-2 text-center text-xs text-white/60">
                  Page {index + 1}
                </p>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
