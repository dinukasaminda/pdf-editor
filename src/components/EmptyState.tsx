type Props = {
  hasPdf: boolean
  hasSignature: boolean
  onUploadPdf: (file: File) => void
  onUploadSign: (file: File) => void
}

export function EmptyState({
  hasPdf,
  hasSignature,
  onUploadPdf,
  onUploadSign,
}: Props) {
  return (
    <div className="mx-auto flex h-full min-h-[420px] max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
      <div className="w-full rounded-2xl border border-dashed border-[var(--line)] bg-white/80 px-6 py-12 shadow-[0_12px_40px_rgba(26,39,68,0.06)] sm:px-10">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[var(--accent)]">
          Get started
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Sign your PDF in a few steps
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
          Upload a document and your signature image, adjust the ink, then drag
          the sign onto a page and save.
        </p>

        <ol className="mx-auto mt-8 max-w-md space-y-3 text-left text-sm text-[var(--ink)]">
          <li className="flex gap-3 rounded-lg bg-[var(--paper)] px-3 py-2.5">
            <span className="font-semibold text-[var(--accent)]">1</span>
            <span>
              {hasPdf
                ? 'PDF uploaded'
                : 'Upload your PDF from the Document panel'}
            </span>
          </li>
          <li className="flex gap-3 rounded-lg bg-[var(--paper)] px-3 py-2.5">
            <span className="font-semibold text-[var(--accent)]">2</span>
            <span>
              {hasSignature
                ? 'Signature uploaded — drag it onto a page'
                : 'Upload your signature image (white background works best)'}
            </span>
          </li>
          <li className="flex gap-3 rounded-lg bg-[var(--paper)] px-3 py-2.5">
            <span className="font-semibold text-[var(--accent)]">3</span>
            <span>Tune color, brightness, and contrast if needed</span>
          </li>
          <li className="flex gap-3 rounded-lg bg-[var(--paper)] px-3 py-2.5">
            <span className="font-semibold text-[var(--accent)]">4</span>
            <span>Preview, then save as a new PDF</span>
          </li>
        </ol>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-md bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110">
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
          <label className="inline-flex cursor-pointer items-center rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110">
            Upload sign
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onUploadSign(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
