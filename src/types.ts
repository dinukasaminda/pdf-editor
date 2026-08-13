export type SignatureAdjustments = {
  color: string
  brightness: number
  contrast: number
  threshold: number
}

export type PlacedSignature = {
  id: string
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
}

export type PageSize = {
  width: number
  height: number
}

export const DEFAULT_ADJUSTMENTS: SignatureAdjustments = {
  color: '#1a4fd6',
  brightness: 0,
  contrast: 0,
  threshold: 235,
}
