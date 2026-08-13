import type { SignatureAdjustments } from '../types'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const value = Number.parseInt(full, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function applyBrightnessContrast(
  channel: number,
  brightness: number,
  contrast: number,
): number {
  // brightness: -100..100, contrast: -100..100
  const b = (brightness / 100) * 255
  const c = contrast / 100
  const factor = (259 * (c * 255 + 255)) / (255 * (259 - c * 255))
  const adjusted = factor * (channel - 128) + 128 + b
  return Math.max(0, Math.min(255, Math.round(adjusted)))
}

/**
 * Treat the signature as two colors: white/near-white background and ink.
 * Background becomes transparent; ink is recolored with brightness/contrast.
 */
export async function processSignature(
  source: HTMLImageElement | ImageBitmap,
  adjustments: SignatureAdjustments,
): Promise<string> {
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width
  const height =
    'naturalHeight' in source ? source.naturalHeight : source.height

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Could not create canvas context')

  ctx.drawImage(source, 0, 0)
  const imageData = ctx.getImageData(0, 0, width, height)
  const { data } = imageData
  const { r: inkR, g: inkG, b: inkB } = hexToRgb(adjustments.color)
  const threshold = adjustments.threshold

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b

    // Near-white background → transparent
    if (luminance >= threshold) {
      data[i + 3] = 0
      continue
    }

    // Soft edge: fade alpha near the threshold so anti-aliased strokes look clean
    const edgeBand = 28
    const distance = threshold - luminance
    const alpha =
      distance >= edgeBand
        ? 255
        : Math.max(0, Math.min(255, Math.round((distance / edgeBand) * 255)))

    const tintedR = applyBrightnessContrast(
      inkR,
      adjustments.brightness,
      adjustments.contrast,
    )
    const tintedG = applyBrightnessContrast(
      inkG,
      adjustments.brightness,
      adjustments.contrast,
    )
    const tintedB = applyBrightnessContrast(
      inkB,
      adjustments.brightness,
      adjustments.contrast,
    )

    data[i] = tintedR
    data[i + 1] = tintedG
    data[i + 2] = tintedB
    data[i + 3] = alpha
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load signature image'))
    }
    img.src = url
  })
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load signature image'))
    img.src = url
  })
}
