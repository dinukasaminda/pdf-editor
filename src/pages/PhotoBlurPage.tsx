import { useEffect, useMemo, useRef, useState } from 'react'
import { downloadBlob } from '../utils/pdfExport'
import {
  blurredFilename,
  DEFAULT_EFFECT,
  exportBlurredImage,
  isRectShape,
  paintBlurredPreview,
  rectFromDrag,
  type BlurShape,
  type BlurTool,
  type EffectMode,
  type EffectOptions,
  type Point,
} from '../utils/imageBlur'
import { loadImageFromFile } from '../utils/signatureProcessor'

function createId() {
  return crypto.randomUUID()
}

export function PhotoBlurPage() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [tool, setTool] = useState<BlurTool>('rect')
  const [effect, setEffect] = useState<EffectOptions>(DEFAULT_EFFECT)
  const [brushRadius, setBrushRadius] = useState(28)
  const [shapes, setShapes] = useState<BlurShape[]>([])
  const [draft, setDraft] = useState<BlurShape | null>(null)
  const [selectedRectId, setSelectedRectId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [editMode, setEditMode] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<Point | null>(null)
  const drawingRef = useRef(false)
  const cornerDragRef = useRef<{
    shapeId: string
    cornerIndex: number
  } | null>(null)
  const blurLayerRef = useRef<HTMLCanvasElement | null>(null)
  const blurCacheKeyRef = useRef('')
  const rafRef = useRef<number | null>(null)
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })

  const scale = useMemo(() => {
    if (!image || displaySize.width === 0) return { x: 1, y: 1 }
    return {
      x: displaySize.width / image.naturalWidth,
      y: displaySize.height / image.naturalHeight,
    }
  }, [image, displaySize])

  const rectShapes = useMemo(() => shapes.filter(isRectShape), [shapes])

  const zoomPercent = Math.round(zoom * 100)

  function clampZoom(value: number) {
    return Math.min(3, Math.max(0.5, Math.round(value * 100) / 100))
  }

  function nudgeZoom(delta: number) {
    setZoom((prev) => clampZoom(prev + delta))
  }

  useEffect(() => {
    if (!image || !wrapRef.current) return

    const updateSize = () => {
      const maxW = (wrapRef.current?.clientWidth || 800) - 32
      const maxH = Math.min(window.innerHeight * 0.62, 720)
      const fitScale = Math.min(
        maxW / image.naturalWidth,
        maxH / image.naturalHeight,
        1,
      )
      const nextScale = fitScale * zoom
      setDisplaySize({
        width: Math.max(1, Math.floor(image.naturalWidth * nextScale)),
        height: Math.max(1, Math.floor(image.naturalHeight * nextScale)),
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [image, zoom])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || !image) return

    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      setZoom((prev) =>
        clampZoom(prev + (e.deltaY < 0 ? 0.1 : -0.1)),
      )
    }

    wrap.addEventListener('wheel', onWheel, { passive: false })
    return () => wrap.removeEventListener('wheel', onWheel)
  }, [image])

  useEffect(() => {
    blurLayerRef.current = null
    blurCacheKeyRef.current = ''
  }, [
    image,
    displaySize.width,
    displaySize.height,
    effect.mode,
    effect.amount,
    effect.angle,
    effect.noiseAmount,
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image || displaySize.width === 0) return

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const cacheKey = [
        image.src,
        displaySize.width,
        displaySize.height,
        effect.mode,
        effect.amount,
        effect.angle,
        effect.noiseAmount,
      ].join('|')
      const cached =
        blurCacheKeyRef.current === cacheKey ? blurLayerRef.current : null

      const outlineShapes = editMode
        ? [...shapes, ...(draft ? [draft] : [])]
        : []

      const nextLayer = paintBlurredPreview(
        canvas,
        image,
        shapes,
        effect,
        displaySize.width,
        displaySize.height,
        outlineShapes,
        cached,
      )

      blurLayerRef.current = nextLayer
      blurCacheKeyRef.current = cacheKey
      rafRef.current = null
    })

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [image, displaySize, shapes, draft, effect, editMode])

  function toImagePoint(clientX: number, clientY: number): Point | null {
    const stage = stageRef.current
    if (!stage || !image) return null
    const rect = stage.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * image.naturalWidth
    const y = ((clientY - rect.top) / rect.height) * image.naturalHeight
    return {
      x: Math.max(0, Math.min(image.naturalWidth, x)),
      y: Math.max(0, Math.min(image.naturalHeight, y)),
    }
  }

  async function handleUpload(file: File) {
    try {
      setError(null)
      const loaded = await loadImageFromFile(file)
      setImage(loaded)
      setFileName(file.name)
      setShapes([])
      setDraft(null)
      setSelectedRectId(null)
      setZoom(1)
      setEditMode(true)
      blurLayerRef.current = null
      blurCacheKeyRef.current = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image')
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!image || !editMode) return
    if ((e.target as HTMLElement).closest('.blur-corner-handle')) return

    const point = toImagePoint(e.clientX, e.clientY)
    if (!point) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    dragStartRef.current = point
    setSelectedRectId(null)

    if (tool === 'brush') {
      setDraft({
        id: createId(),
        type: 'brush',
        points: [point],
        radius: brushRadius,
      })
      return
    }

    if (tool === 'rect') {
      setDraft(rectFromDrag(point, point, createId()))
      return
    }

    setDraft({
      id: createId(),
      type: 'ellipse',
      cx: point.x,
      cy: point.y,
      rx: 1,
      ry: 1,
    })
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!editMode) return
    const point = toImagePoint(e.clientX, e.clientY)
    if (!point || !image) return

    if (cornerDragRef.current) {
      const { shapeId, cornerIndex } = cornerDragRef.current
      setShapes((prev) =>
        prev.map((shape) => {
          if (shape.id !== shapeId || shape.type !== 'rect') return shape
          const corners = [...shape.corners] as typeof shape.corners
          corners[cornerIndex] = point
          return { ...shape, corners }
        }),
      )
      return
    }

    if (!drawingRef.current || !dragStartRef.current || !draft) return
    const start = dragStartRef.current

    if (draft.type === 'brush') {
      setDraft({
        ...draft,
        points: [...draft.points, point],
      })
      return
    }

    if (draft.type === 'rect') {
      setDraft(rectFromDrag(start, point, draft.id))
      return
    }

    setDraft({
      ...draft,
      cx: (start.x + point.x) / 2,
      cy: (start.y + point.y) / 2,
      rx: Math.max(1, Math.abs(point.x - start.x) / 2),
      ry: Math.max(1, Math.abs(point.y - start.y) / 2),
    })
  }

  function onPointerUp() {
    if (cornerDragRef.current) {
      cornerDragRef.current = null
      return
    }

    if (!drawingRef.current) return
    drawingRef.current = false
    if (draft) {
      const next = draft
      setShapes((prev) => [...prev, next])
      if (next.type === 'rect') setSelectedRectId(next.id)
      setDraft(null)
    }
    dragStartRef.current = null
  }

  function startCornerDrag(
    e: React.PointerEvent<HTMLButtonElement>,
    shapeId: string,
    cornerIndex: number,
  ) {
    e.stopPropagation()
    e.preventDefault()
    setSelectedRectId(shapeId)
    cornerDragRef.current = { shapeId, cornerIndex }
    stageRef.current?.setPointerCapture(e.pointerId)
  }

  function removeSelectedRect() {
    if (!selectedRectId) return
    setShapes((prev) => prev.filter((s) => s.id !== selectedRectId))
    setSelectedRectId(null)
  }

  async function handleDownload() {
    if (!image || shapes.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const blob = await exportBlurredImage(
        image,
        shapes,
        effect,
        'image/png',
        1,
      )
      downloadBlob(blob, blurredFilename(fileName))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download image')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid h-full grid-rows-[auto_1fr] overflow-hidden md:grid-cols-[320px_1fr] md:grid-rows-none">
      <aside className="flex h-auto max-h-[42dvh] flex-col gap-4 overflow-hidden border-b border-[var(--line)] bg-[var(--panel)]/95 p-4 backdrop-blur md:h-full md:max-h-none md:border-b-0 md:border-r">
        <div className="shrink-0">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[var(--accent)]">
            Photo Blur
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--ink)]">
            Mark & redact areas
          </h1>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <label className="inline-flex cursor-pointer items-center rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:brightness-110">
            Upload photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleUpload(file)
                e.target.value = ''
              }}
            />
          </label>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--ink)]">Shape tool</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['rect', 'Rectangle'],
                  ['ellipse', 'Ellipse'],
                  ['brush', 'Brush'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTool(value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    tool === value
                      ? 'bg-[var(--ink)] text-white'
                      : 'border border-[var(--line)] bg-white text-[var(--ink)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {tool === 'rect' ? (
              <p className="text-xs text-[var(--muted)]">
                After drawing, drag any corner freely to distort the shape.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--ink)]">Effect</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['gaussian', 'Soft blur'],
                  ['motion', 'Motion blur'],
                  ['bw-noise', 'B&W noise'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setEffect((prev) => ({
                      ...prev,
                      mode: value as EffectMode,
                    }))
                  }
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    effect.mode === value
                      ? 'bg-[var(--accent)] text-white'
                      : 'border border-[var(--line)] bg-white text-[var(--ink)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {effect.mode !== 'bw-noise' ? (
            <label className="block space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {effect.mode === 'motion' ? 'Motion strength' : 'Blur strength'}
                </span>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {effect.amount}
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={60}
                value={effect.amount}
                onChange={(e) =>
                  setEffect((prev) => ({
                    ...prev,
                    amount: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
            </label>
          ) : null}

          {effect.mode === 'motion' ? (
            <label className="block space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>Motion angle</span>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {effect.angle}°
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={180}
                value={effect.angle}
                onChange={(e) =>
                  setEffect((prev) => ({
                    ...prev,
                    angle: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
            </label>
          ) : null}

          {effect.mode === 'bw-noise' ? (
            <label className="block space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>Noise grain</span>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {effect.noiseAmount}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={effect.noiseAmount}
                onChange={(e) =>
                  setEffect((prev) => ({
                    ...prev,
                    noiseAmount: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
            </label>
          ) : null}

          {tool === 'brush' ? (
            <label className="block space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>Brush size</span>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {brushRadius}
                </span>
              </div>
              <input
                type="range"
                min={8}
                max={80}
                value={brushRadius}
                onChange={(e) => setBrushRadius(Number(e.target.value))}
                className="w-full"
              />
            </label>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--ink)]">Zoom</span>
              <span className="font-mono text-xs text-[var(--muted)]">
                {zoomPercent}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!image || zoom <= 0.5}
                onClick={() => nudgeZoom(-0.25)}
                className="rounded-md border border-[var(--line)] bg-white px-2.5 py-1 text-sm font-medium disabled:opacity-40"
                aria-label="Zoom out"
              >
                −
              </button>
              <input
                type="range"
                min={50}
                max={300}
                step={5}
                disabled={!image}
                value={zoomPercent}
                onChange={(e) => setZoom(clampZoom(Number(e.target.value) / 100))}
                className="w-full disabled:opacity-40"
              />
              <button
                type="button"
                disabled={!image || zoom >= 3}
                onClick={() => nudgeZoom(0.25)}
                className="rounded-md border border-[var(--line)] bg-white px-2.5 py-1 text-sm font-medium disabled:opacity-40"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={!image || zoom === 1}
              onClick={() => setZoom(1)}
              className="text-xs font-medium text-[var(--accent)] disabled:opacity-40"
            >
              Reset to 100%
            </button>
          </div>

          <p className="text-xs text-[var(--muted)]">
            {shapes.length} area{shapes.length === 1 ? '' : 's'} marked
          </p>
        </div>

        <div className="shrink-0 space-y-2 border-t border-[var(--line)] pt-3">
          <button
            type="button"
            disabled={!image || shapes.length === 0 || saving}
            onClick={() => void handleDownload()}
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white enabled:hover:brightness-110 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Download full quality'}
          </button>
          <button
            type="button"
            disabled={!selectedRectId}
            onClick={removeSelectedRect}
            className="w-full rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Delete selected rectangle
          </button>
          <button
            type="button"
            disabled={shapes.length === 0}
            onClick={() => {
              setShapes([])
              setDraft(null)
              setSelectedRectId(null)
            }}
            className="w-full rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Clear marks
          </button>
        </div>
      </aside>

      <main className="flex min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-[var(--line)] bg-white/70 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--ink)]">
                {editMode ? 'Edit mode' : 'Final preview'}
              </h2>
              <p className="text-sm text-[var(--muted)]">
                {editMode
                  ? 'Mark areas and drag corners. Toggle off to see the download result.'
                  : 'What the download looks like — marks and handles are hidden.'}
              </p>
            </div>
            {image ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={editMode}
                  aria-label={editMode ? 'Switch to final preview' : 'Switch to edit mode'}
                  onClick={() => setEditMode((prev) => !prev)}
                  className="inline-flex cursor-pointer items-center gap-2 select-none"
                >
                  <span
                    className={`text-sm font-medium ${
                      editMode ? 'text-[var(--ink)]' : 'text-[var(--muted)]'
                    }`}
                  >
                    Edit
                  </span>
                  <span
                    className={`preview-toggle ${editMode ? 'is-on' : ''}`}
                    aria-hidden
                  >
                    <span className="preview-toggle-thumb" />
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      !editMode ? 'text-[var(--ink)]' : 'text-[var(--muted)]'
                    }`}
                  >
                    Final
                  </span>
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={zoom <= 0.5}
                    onClick={() => nudgeZoom(-0.25)}
                    className="rounded-md border border-[var(--line)] bg-white px-2.5 py-1 text-sm font-medium disabled:opacity-40"
                    aria-label="Zoom out"
                  >
                    −
                  </button>
                  <span className="min-w-[3.5rem] text-center font-mono text-xs text-[var(--muted)]">
                    {zoomPercent}%
                  </span>
                  <button
                    type="button"
                    disabled={zoom >= 3}
                    onClick={() => nudgeZoom(0.25)}
                    className="rounded-md border border-[var(--line)] bg-white px-2.5 py-1 text-sm font-medium disabled:opacity-40"
                    aria-label="Zoom in"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          {error ? (
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <div ref={wrapRef} className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          {!image ? (
            <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-white/80 px-6 py-20 text-center">
              <p className="text-base font-medium">No photo loaded</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Upload a photo, then mark private areas with rectangle, ellipse,
                or brush.
              </p>
            </div>
          ) : (
            <div
              className="relative mx-auto w-fit rounded-lg bg-white p-2 shadow-[0_18px_40px_rgba(26,39,68,0.12)]"
              style={{ width: displaySize.width + 16 }}
            >
              <div
                ref={stageRef}
                className={`relative touch-none ${editMode ? '' : 'cursor-default'}`}
                style={{ width: displaySize.width, height: displaySize.height }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <canvas
                  ref={canvasRef}
                  className="pointer-events-none block max-w-full"
                  style={{
                    width: displaySize.width,
                    height: displaySize.height,
                  }}
                />

                {editMode
                  ? rectShapes.map((shape) =>
                      shape.corners.map((corner, cornerIndex) => {
                        const selected = selectedRectId === shape.id
                        return (
                          <button
                            key={`${shape.id}-${cornerIndex}`}
                            type="button"
                            aria-label={`Move corner ${cornerIndex + 1}`}
                            className={`blur-corner-handle absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-move ${
                              selected ? 'blur-corner-selected' : ''
                            }`}
                            style={{
                              left: corner.x * scale.x,
                              top: corner.y * scale.y,
                            }}
                            onPointerDown={(e) =>
                              startCornerDrag(e, shape.id, cornerIndex)
                            }
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRectId(shape.id)
                            }}
                          />
                        )
                      }),
                    )
                  : null}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
