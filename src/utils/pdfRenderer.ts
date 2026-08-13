import * as pdfjsLib from 'pdfjs-dist'
import type { PageSize } from '../types'

// Served from /public so the worker URL is stable in dev and production.
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export type RenderedPage = {
  url: string
  size: PageSize
}

export async function loadPdfDocument(data: ArrayBuffer | Uint8Array) {
  const bytes =
    data instanceof Uint8Array
      ? data.slice()
      : new Uint8Array(data.slice(0))

  return pdfjsLib.getDocument({
    data: bytes,
    useSystemFonts: true,
  }).promise
}

export async function renderPdfPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = 1.15,
): Promise<RenderedPage> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('Could not create canvas context')

  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  await page.render({
    canvasContext: context,
    viewport,
  }).promise

  const url = canvas.toDataURL('image/jpeg', 0.9)

  return {
    url,
    size: { width: canvas.width, height: canvas.height },
  }
}
