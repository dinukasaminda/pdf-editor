import { useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { PdfPageView } from './components/PdfPageView'
import { FullscreenPreview } from './components/FullscreenPreview'
import { EmptyState } from './components/EmptyState'
import { SiteFooter } from './components/SiteFooter'
import {
  DEFAULT_ADJUSTMENTS,
  type PageSize,
  type PlacedSignature,
  type SignatureAdjustments,
} from './types'
import {
  loadImageFromFile,
  processSignature,
} from './utils/signatureProcessor'
import { downloadBlob, exportSignedPdf, signedPdfFilename } from './utils/pdfExport'
import { loadPdfDocument, renderPdfPage } from './utils/pdfRenderer'

type RenderedPageState = {
  url: string
  size: PageSize
}

function createId() {
  return crypto.randomUUID()
}

export default function App() {
  const [adjustments, setAdjustments] =
    useState<SignatureAdjustments>(DEFAULT_ADJUSTMENTS)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [processedSignUrl, setProcessedSignUrl] = useState<string | null>(null)
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null)
  const [pdfName, setPdfName] = useState<string | null>(null)
  const [pages, setPages] = useState<RenderedPageState[]>([])
  const [placements, setPlacements] = useState<PlacedSignature[]>([])
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pdfRequestRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!sourceImage) {
        setProcessedSignUrl(null)
        return
      }
      try {
        const url = await processSignature(sourceImage, adjustments)
        if (!cancelled) setProcessedSignUrl(url)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to process signature',
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sourceImage, adjustments])

  const pageSizes = useMemo(() => pages.map((p) => p.size), [pages])

  async function handleUploadSign(file: File) {
    try {
      setError(null)
      const image = await loadImageFromFile(file)
      setSourceImage(image)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signature')
    }
  }

  async function renderPdfFromBytes(bytes: ArrayBuffer) {
    const requestId = ++pdfRequestRef.current
    setLoadingPdf(true)
    setError(null)
    setPages([])
    setPlacements([])

    try {
      const pdf = await loadPdfDocument(bytes)
      if (requestId !== pdfRequestRef.current) {
        await pdf.destroy()
        return
      }

      const rendered: RenderedPageState[] = []
      for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await renderPdfPage(pdf, i)
        if (requestId !== pdfRequestRef.current) {
          await pdf.destroy()
          return
        }
        rendered.push(page)
        setPages([...rendered])
        setPdfBytes(bytes.slice(0))
      }

      await pdf.destroy()
    } catch (err) {
      if (requestId === pdfRequestRef.current) {
        setPages([])
        setPdfBytes(null)
        setPdfName(null)
        setError(err instanceof Error ? err.message : 'Failed to render PDF')
      }
    } finally {
      if (requestId === pdfRequestRef.current) {
        setLoadingPdf(false)
      }
    }
  }

  async function handleUploadPdf(file: File) {
    setPdfName(file.name)
    const bytes = await file.arrayBuffer()
    await renderPdfFromBytes(bytes)
  }

  function placeSignature(pageIndex: number, x: number, y: number) {
    if (!processedSignUrl || !sourceImage) return
    const naturalW = sourceImage.naturalWidth || 320
    const naturalH = sourceImage.naturalHeight || 120
    const width = 160
    const height = Math.round((width * naturalH) / naturalW)

    setPlacements((prev) => [
      ...prev,
      {
        id: createId(),
        pageIndex,
        x,
        y,
        width,
        height,
      },
    ])
  }

  function updatePlacement(id: string, next: Partial<PlacedSignature>) {
    setPlacements((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...next } : item)),
    )
  }

  function removePlacement(id: string) {
    setPlacements((prev) => prev.filter((item) => item.id !== id))
  }

  async function handleSave() {
    if (!pdfBytes || !processedSignUrl || placements.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const blob = await exportSignedPdf(
        pdfBytes,
        processedSignUrl,
        placements,
        pageSizes,
      )
      downloadBlob(blob, signedPdfFilename(pdfName))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save PDF')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] overflow-hidden md:grid-cols-[320px_1fr] md:grid-rows-none">
        <Sidebar
          adjustments={adjustments}
          previewUrl={processedSignUrl}
          pageCount={pages.length}
          placementCount={placements.length}
          loadingPdf={loadingPdf}
          saving={saving}
          onAdjustmentsChange={setAdjustments}
          onUploadSign={handleUploadSign}
          onUploadPdf={handleUploadPdf}
          onPreview={() => setPreviewOpen(true)}
          onSave={handleSave}
          onClearPlacements={() => setPlacements([])}
        />

        <FullscreenPreview
          open={previewOpen}
          pages={pages}
          signatureUrl={processedSignUrl}
          placements={placements}
          onClose={() => setPreviewOpen(false)}
        />

        <main className="flex min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-[var(--line)] bg-white/70 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--ink)]">
              Document preview
            </h2>
            {pages.length > 0 ? (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="rounded-md border border-[var(--ink)] bg-white px-3 py-1.5 text-sm font-medium hover:bg-[var(--accent-soft)]"
              >
                Preview
              </button>
            ) : null}
          </div>
          {error ? (
            <p className="mx-auto mt-2 max-w-4xl rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loadingPdf && pages.length === 0 ? (
            <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-white/70 px-6 py-20 text-center">
              <p className="text-base font-medium">Rendering PDF…</p>
            </div>
          ) : pages.length === 0 ? (
            <EmptyState
              hasPdf={false}
              hasSignature={Boolean(processedSignUrl)}
              onUploadPdf={handleUploadPdf}
              onUploadSign={handleUploadSign}
            />
          ) : (
            <div className="mx-auto flex max-w-4xl flex-col gap-10 pb-8">
              {!processedSignUrl ? (
                <div className="rounded-lg border border-[var(--line)] bg-white/80 px-4 py-3 text-sm text-[var(--muted)]">
                  PDF loaded. Upload a signature, then drag it onto a page.
                </div>
              ) : null}
              {pages.map((page, index) => (
                <PdfPageView
                  key={`page-${index}`}
                  pageIndex={index}
                  pageImageUrl={page.url}
                  width={page.size.width}
                  height={page.size.height}
                  signatureUrl={processedSignUrl}
                  placements={placements.filter((p) => p.pageIndex === index)}
                  onPlace={placeSignature}
                  onUpdate={updatePlacement}
                  onRemove={removePlacement}
                />
              ))}
              {loadingPdf ? (
                <p className="text-center text-sm text-[var(--muted)]">
                  Rendering remaining pages…
                </p>
              ) : null}
            </div>
          )}
        </div>
      </main>
      </div>
      <SiteFooter />
    </div>
  )
}
