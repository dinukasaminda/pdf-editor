import type { SignatureAdjustments } from '../types'

type Props = {
  adjustments: SignatureAdjustments
  previewUrl: string | null
  onChange: (next: SignatureAdjustments) => void
  onUpload: (file: File) => void
}

const PRESET_COLORS = [
  '#1a4fd6',
  '#111111',
  '#0f6e56',
  '#9b1c1c',
  '#6b21a8',
  '#b45309',
]

export function SignatureControls({
  adjustments,
  previewUrl,
  onChange,
  onUpload,
}: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--muted)]">
        Signature
      </h2>

      <label className="inline-flex cursor-pointer items-center rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white transition hover:brightness-110">
        Upload sign
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file)
            e.target.value = ''
          }}
        />
      </label>

      <div className="rounded-lg border border-dashed border-[var(--accent)] bg-[repeating-conic-gradient(#ece8e0_0%_25%,#ffffff_0%_50%)_0_0/14px_14px] p-3">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Signature preview"
            draggable
            title="Drag onto a PDF page"
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-signature', '1')
              e.dataTransfer.effectAllowed = 'copy'
            }}
            className="mx-auto max-h-24 cursor-grab object-contain active:cursor-grabbing"
          />
        ) : (
          <p className="py-6 text-center text-sm text-[var(--muted)]">
            Upload a signature image
          </p>
        )}
      </div>

      <label className="block space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span>Ink color</span>
          <span className="font-mono text-xs text-[var(--muted)]">
            {adjustments.color}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={adjustments.color}
            onChange={(e) => onChange({ ...adjustments, color: e.target.value })}
            className="h-9 w-12 cursor-pointer rounded border border-[var(--line)] bg-white p-1"
          />
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Set ink color ${color}`}
                onClick={() => onChange({ ...adjustments, color })}
                className="h-7 w-7 rounded-full border border-black/10"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </label>

      <Slider
        label="Brightness"
        min={-100}
        max={100}
        value={adjustments.brightness}
        onChange={(brightness) => onChange({ ...adjustments, brightness })}
      />
      <Slider
        label="Contrast"
        min={-100}
        max={100}
        value={adjustments.contrast}
        onChange={(contrast) => onChange({ ...adjustments, contrast })}
      />
      <Slider
        label="Background cut"
        min={180}
        max={250}
        value={adjustments.threshold}
        onChange={(threshold) => onChange({ ...adjustments, threshold })}
      />
    </section>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-xs text-[var(--muted)]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  )
}
