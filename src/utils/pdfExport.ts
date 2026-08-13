import { PDFDocument } from 'pdf-lib'
import type { PageSize, PlacedSignature } from '../types'

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Embed the processed signature PNG onto each placed location and return a PDF blob.
 * Screen Y is top-left origin; PDF Y is bottom-left origin.
 */
export async function exportSignedPdf(
  originalPdfBytes: ArrayBuffer,
  signaturePngDataUrl: string,
  placements: PlacedSignature[],
  pageSizes: PageSize[],
): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(originalPdfBytes)
  const pages = pdfDoc.getPages()
  const pngBytes = dataUrlToUint8Array(signaturePngDataUrl)
  const pngImage = await pdfDoc.embedPng(pngBytes)

  for (const placement of placements) {
    const page = pages[placement.pageIndex]
    const rendered = pageSizes[placement.pageIndex]
    if (!page || !rendered) continue

    const { width: pdfWidth, height: pdfHeight } = page.getSize()
    const scaleX = pdfWidth / rendered.width
    const scaleY = pdfHeight / rendered.height

    const width = placement.width * scaleX
    const height = placement.height * scaleY
    const x = placement.x * scaleX
    const y = pdfHeight - placement.y * scaleY - height

    page.drawImage(pngImage, { x, y, width, height })
  }

  const saved = await pdfDoc.save()
  return new Blob([saved], { type: 'application/pdf' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
