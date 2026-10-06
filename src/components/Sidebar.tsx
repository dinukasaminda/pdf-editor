import { SignatureControls } from './SignatureControls'
import type { SignatureAdjustments } from '../types'

type Props = {
  adjustments: SignatureAdjustments
  previewUrl: string | null
  pageCount: number
  placementCount: number
  loadingPdf: boolean
  saving: boolean
  onAdjustmentsChange: (next: SignatureAdjustments) => void
  onUploadSign: (file: File) => void
  onUploadPdf: (file: File) => void
  onPreview: () => void
  onSave: () => void
  onClearPlacements: () => void
}

export function Sidebar({
  adjustments,
  previewUrl,
  pageCount,
  placementCount,
  loadingPdf,
  saving,
  onAdjustmentsChange,
  onUploadSign,
  onUploadPdf,
  onPreview,
  onSave,
  onClearPlacements,
}: Props) {
  return (
    <aside className="flex h-auto max-h-[42dvh] flex-col gap-4 overflow-hidden border-b border-[var(--line)] bg-[var(--panel)]/95 p-4 backdrop-blur md:h-full md:max-h-none md:border-b-0 md:border-r">
      <div className="shrink-0">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[var(--accent)]">
          PDF Signature
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--ink)]">
          Place your signature
        </h1>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--muted)]">
            Document
          </h2>
          <label className="inline-flex cursor-pointer items-center rounded-md bg-[var(--ink)] px-3 py-2 text-sm font-medium text-white hover:brightness-110">
            Upload PDF
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onUploadPdf(file)
                e.target.value = ''
              }}
            />
          </label>
          <p className="text-xs text-[var(--muted)]">
            {loadingPdf && pageCount === 0
              ? 'Loading PDF…'
              : pageCount > 0
                ? `${pageCount} page${pageCount === 1 ? '' : 's'} loaded${loadingPdf ? ' (rendering…)' : ''} · ${placementCount} signature${placementCount === 1 ? '' : 's'} placed`
                : 'Upload a PDF to get started'}
          </p>
        </section>

        <SignatureControls
          adjustments={adjustments}
          previewUrl={previewUrl}
          onChange={onAdjustmentsChange}
          onUpload={onUploadSign}
        />
      </div>

      <div className="shrink-0 space-y-2 border-t border-[var(--line)] pt-3">
        <button
          type="button"
          disabled={!pageCount}
          onClick={onPreview}
          className="w-full rounded-md border border-[var(--ink)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition enabled:hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Preview
        </button>
        <button
          type="button"
          disabled={!pageCount || !placementCount || saving}
          onClick={onSave}
          className="w-full rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save as PDF'}
        </button>
        <button
          type="button"
          disabled={!placementCount}
          onClick={onClearPlacements}
          className="w-full rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          Clear placements
        </button>
      </div>
    </aside>
  )
}
