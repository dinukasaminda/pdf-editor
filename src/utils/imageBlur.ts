export type Point = { x: number; y: number }

/** Four free corners: TL, TR, BR, BL — can form a distorted quad. */
export type RectShape = {
  id: string
  type: 'rect'
  corners: [Point, Point, Point, Point]
}

export type BlurShape =
  | RectShape
  | {
      id: string
      type: 'ellipse'
      cx: number
      cy: number
      rx: number
      ry: number
    }
  | {
      id: string
      type: 'brush'
      points: Point[]
      radius: number
    }

export type BlurTool = 'rect' | 'ellipse' | 'brush'

export type EffectMode = 'gaussian' | 'motion' | 'bw-noise'

export type EffectOptions = {
  mode: EffectMode
  amount: number
  /** Motion blur angle in degrees (0 = horizontal). */
  angle: number
  /** Grain size for pure B&W noise (0–100); higher = finer speckles. */
  noiseAmount: number
}

export const DEFAULT_EFFECT: EffectOptions = {
  mode: 'gaussian',
  amount: 18,
  angle: 0,
  noiseAmount: 70,
}

export function rectFromDrag(start: Point, end: Point, id: string): RectShape {
  const x1 = Math.min(start.x, end.x)
  const y1 = Math.min(start.y, end.y)
  const x2 = Math.max(start.x, end.x)
  const y2 = Math.max(start.y, end.y)
  return {
    id,
    type: 'rect',
    corners: [
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 },
      { x: x1, y: y2 },
    ],
  }
}

function pathRect(ctx: CanvasRenderingContext2D, shape: RectShape) {
  const [a, b, c, d] = shape.corners
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.lineTo(c.x, c.y)
  ctx.lineTo(d.x, d.y)
  ctx.closePath()
}

function fillShape(ctx: CanvasRenderingContext2D, shape: BlurShape) {
  ctx.beginPath()

  if (shape.type === 'rect') {
    pathRect(ctx, shape)
    ctx.fill()
    return
  }

  if (shape.type === 'ellipse') {
    ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  if (shape.points.length === 0) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = shape.radius * 2
  ctx.moveTo(shape.points[0].x, shape.points[0].y)
  for (let i = 1; i < shape.points.length; i += 1) {
    ctx.lineTo(shape.points[i].x, shape.points[i].y)
  }
  if (shape.points.length === 1) {
    ctx.lineTo(shape.points[0].x + 0.01, shape.points[0].y)
  }
  ctx.stroke()
}

export function drawShapeOutline(
  ctx: CanvasRenderingContext2D,
  shape: BlurShape,
) {
  ctx.save()
  ctx.strokeStyle = 'rgba(15, 110, 86, 0.95)'
  ctx.fillStyle = 'rgba(15, 110, 86, 0.18)'
  ctx.lineWidth = 2

  ctx.beginPath()
  if (shape.type === 'rect') {
    pathRect(ctx, shape)
    ctx.fill()
    ctx.stroke()
  } else if (shape.type === 'ellipse') {
    ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (shape.points.length > 0) {
    ctx.strokeStyle = 'rgba(15, 110, 86, 0.75)'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2, shape.radius * 2)
    ctx.moveTo(shape.points[0].x, shape.points[0].y)
    for (let i = 1; i < shape.points.length; i += 1) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y)
    }
    if (shape.points.length === 1) {
      ctx.lineTo(shape.points[0].x + 0.01, shape.points[0].y)
    }
    ctx.stroke()
  }

  ctx.restore()
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create canvas')
  return { canvas, ctx }
}

/** Blur/motion strength relative to canvas size so full strength hides content. */
function effectStrength(amount: number, width: number, height: number) {
  const t = Math.max(0, Math.min(1, amount / 60))
  const minSide = Math.min(width, height)
  // At max: ~28% of the short side — enough to obliterate detail on large photos.
  return Math.max(2, Math.round(minSide * (0.04 + t * 0.24)))
}

function buildGaussianLayer(
  source: CanvasImageSource,
  width: number,
  height: number,
  amount: number,
): HTMLCanvasElement {
  const radius = effectStrength(amount, width, height)
  const t = amount / 60

  // Heavy downsample + upsample first so large images lose readable detail.
  const crush = Math.max(2, Math.round(4 + t * 28))
  const tinyW = Math.max(1, Math.round(width / crush))
  const tinyH = Math.max(1, Math.round(height / crush))
  const { canvas: tiny, ctx: tinyCtx } = createCanvas(tinyW, tinyH)
  tinyCtx.imageSmoothingEnabled = true
  tinyCtx.drawImage(source, 0, 0, tinyW, tinyH)

  const pad = Math.max(2, Math.ceil(radius * 1.5))
  const { canvas: padded, ctx: paddedCtx } = createCanvas(
    width + pad * 2,
    height + pad * 2,
  )
  paddedCtx.imageSmoothingEnabled = true
  paddedCtx.filter = `blur(${radius}px)`
  paddedCtx.drawImage(tiny, pad, pad, width, height)
  // Second pass for near-max strength.
  if (t > 0.55) {
    paddedCtx.filter = `blur(${Math.round(radius * 0.65)}px)`
    paddedCtx.drawImage(padded, 0, 0)
  }
  paddedCtx.filter = 'none'

  const { canvas, ctx } = createCanvas(width, height)
  ctx.drawImage(padded, pad, pad, width, height, 0, 0, width, height)
  return canvas
}

function buildMotionLayer(
  source: CanvasImageSource,
  width: number,
  height: number,
  amount: number,
  angleDeg: number,
): HTMLCanvasElement {
  const distance = effectStrength(amount, width, height)
  const steps = Math.max(8, Math.min(36, Math.round(distance / 4) + 8))
  const angle = (angleDeg * Math.PI) / 180
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const pad = Math.ceil(distance) + 2
  const t = amount / 60

  // Crush detail first so streaks don't preserve readable content.
  const crush = Math.max(2, Math.round(3 + t * 18))
  const tinyW = Math.max(1, Math.round(width / crush))
  const tinyH = Math.max(1, Math.round(height / crush))
  const { canvas: tiny, ctx: tinyCtx } = createCanvas(tinyW, tinyH)
  tinyCtx.drawImage(source, 0, 0, tinyW, tinyH)

  const { canvas: padded, ctx: paddedCtx } = createCanvas(
    width + pad * 2,
    height + pad * 2,
  )
  paddedCtx.imageSmoothingEnabled = true
  paddedCtx.drawImage(tiny, pad, pad, width, height)

  const { canvas, ctx } = createCanvas(width, height)
  ctx.clearRect(0, 0, width, height)
  ctx.globalAlpha = 1 / steps

  for (let i = 0; i < steps; i += 1) {
    const u = steps === 1 ? 0 : i / (steps - 1)
    const offset = (u - 0.5) * 2 * distance
    ctx.drawImage(
      padded,
      pad + offset * dx,
      pad + offset * dy,
      width,
      height,
      0,
      0,
      width,
      height,
    )
  }

  ctx.globalAlpha = 1
  return canvas
}

/**
 * Pure random black/white noise — never samples the source image,
 * so marked regions reveal no original content.
 */
function buildBwNoiseLayer(
  width: number,
  height: number,
  noiseAmount: number,
): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(width, height)
  const imageData = ctx.createImageData(width, height)
  const data = imageData.data

  // Higher amount → finer speckles; lower → larger random blocks.
  const t = Math.max(0, Math.min(1, noiseAmount / 100))
  const block = Math.max(1, Math.round(12 - t * 10))

  for (let y = 0; y < height; y += block) {
    for (let x = 0; x < width; x += block) {
      // Mostly hard B/W; occasional mid gray for texture.
      const roll = Math.random()
      const value = roll < 0.08 ? 128 : roll < 0.54 ? 0 : 255
      const maxY = Math.min(height, y + block)
      const maxX = Math.min(width, x + block)
      for (let py = y; py < maxY; py += 1) {
        let i = (py * width + x) * 4
        for (let px = x; px < maxX; px += 1) {
          data[i] = value
          data[i + 1] = value
          data[i + 2] = value
          data[i + 3] = 255
          i += 4
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

function buildEffectLayer(
  source: CanvasImageSource,
  width: number,
  height: number,
  effect: EffectOptions,
): HTMLCanvasElement {
  if (effect.mode === 'motion') {
    return buildMotionLayer(
      source,
      width,
      height,
      effect.amount,
      effect.angle,
    )
  }

  if (effect.mode === 'bw-noise') {
    return buildBwNoiseLayer(width, height, effect.noiseAmount)
  }

  return buildGaussianLayer(source, width, height, effect.amount)
}

function compositeMaskedEffect(
  baseCtx: CanvasRenderingContext2D,
  effectLayer: HTMLCanvasElement,
  shapes: BlurShape[],
  width: number,
  height: number,
) {
  if (shapes.length === 0) return

  const { canvas: mask, ctx: maskCtx } = createCanvas(width, height)
  maskCtx.clearRect(0, 0, width, height)
  maskCtx.fillStyle = '#ffffff'
  maskCtx.strokeStyle = '#ffffff'
  for (const shape of shapes) fillShape(maskCtx, shape)

  const { canvas: region, ctx: regionCtx } = createCanvas(width, height)
  regionCtx.drawImage(effectLayer, 0, 0)
  regionCtx.globalCompositeOperation = 'destination-in'
  regionCtx.drawImage(mask, 0, 0)
  regionCtx.globalCompositeOperation = 'source-over'
  baseCtx.drawImage(region, 0, 0)
}

/**
 * Paint a flicker-free preview at display size.
 */
export function paintBlurredPreview(
  target: HTMLCanvasElement,
  source: HTMLImageElement,
  shapes: BlurShape[],
  effect: EffectOptions,
  displayWidth: number,
  displayHeight: number,
  outlineShapes: BlurShape[] = [],
  effectLayerCache?: HTMLCanvasElement | null,
): HTMLCanvasElement {
  const scaleX = displayWidth / source.naturalWidth
  const scaleY = displayHeight / source.naturalHeight
  const displayShapes = shapes.map((shape) =>
    scaleShape(shape, scaleX, scaleY),
  )

  if (target.width !== displayWidth) target.width = displayWidth
  if (target.height !== displayHeight) target.height = displayHeight

  const { canvas: buffer, ctx: bufferCtx } = createCanvas(
    displayWidth,
    displayHeight,
  )
  bufferCtx.drawImage(source, 0, 0, displayWidth, displayHeight)

  let effectLayer = effectLayerCache
  const needsLayer =
    !effectLayer ||
    effectLayer.width !== displayWidth ||
    effectLayer.height !== displayHeight

  if (needsLayer) {
    effectLayer = buildEffectLayer(
      source,
      displayWidth,
      displayHeight,
      effect,
    )
  }

  if (displayShapes.length > 0 && effectLayer) {
    compositeMaskedEffect(
      bufferCtx,
      effectLayer,
      displayShapes,
      displayWidth,
      displayHeight,
    )
  }

  for (const shape of outlineShapes) {
    drawShapeOutline(bufferCtx, scaleShape(shape, scaleX, scaleY))
  }

  const targetCtx = target.getContext('2d')
  if (targetCtx) {
    targetCtx.clearRect(0, 0, displayWidth, displayHeight)
    targetCtx.drawImage(buffer, 0, 0)
  }

  return effectLayer ?? document.createElement('canvas')
}

function scaleShape(
  shape: BlurShape,
  scaleX: number,
  scaleY: number,
): BlurShape {
  if (shape.type === 'rect') {
    return {
      ...shape,
      corners: shape.corners.map((p) => ({
        x: p.x * scaleX,
        y: p.y * scaleY,
      })) as RectShape['corners'],
    }
  }
  if (shape.type === 'ellipse') {
    return {
      ...shape,
      cx: shape.cx * scaleX,
      cy: shape.cy * scaleY,
      rx: shape.rx * scaleX,
      ry: shape.ry * scaleY,
    }
  }
  return {
    ...shape,
    radius: shape.radius * ((scaleX + scaleY) / 2),
    points: shape.points.map((p) => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
    })),
  }
}

/**
 * Build a full-resolution image with effect applied only inside marked shapes.
 */
export async function exportBlurredImage(
  source: HTMLImageElement,
  shapes: BlurShape[],
  effect: EffectOptions,
  mimeType: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 1,
): Promise<Blob> {
  const width = source.naturalWidth
  const height = source.naturalHeight

  const { canvas: output, ctx: outputCtx } = createCanvas(width, height)
  outputCtx.drawImage(source, 0, 0)

  if (shapes.length === 0) {
    return canvasToBlob(output, mimeType, quality)
  }

  const effectLayer = buildEffectLayer(source, width, height, effect)
  compositeMaskedEffect(outputCtx, effectLayer, shapes, width, height)
  return canvasToBlob(output, mimeType, quality)
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: 'image/png' | 'image/jpeg',
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to export image'))
      },
      mimeType,
      quality,
    )
  })
}

export function blurredFilename(originalName?: string | null) {
  const name = originalName?.trim() || 'photo.png'
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  return `${base}-blurred.png`
}

export function isRectShape(shape: BlurShape): shape is RectShape {
  return shape.type === 'rect'
}
