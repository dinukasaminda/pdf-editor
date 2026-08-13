import { Rnd } from 'react-rnd'
import type { PlacedSignature } from '../types'

type Props = {
  pageIndex: number
  pageImageUrl: string
  width: number
  height: number
  signatureUrl: string | null
  placements: PlacedSignature[]
  onPlace: (pageIndex: number, x: number, y: number) => void
  onUpdate: (id: string, next: Partial<PlacedSignature>) => void
  onRemove: (id: string) => void
}

export function PdfPageView({
  pageIndex,
  pageImageUrl,
  width,
  height,
  signatureUrl,
  placements,
  onPlace,
  onUpdate,
  onRemove,
}: Props) {
  return (
    <div className="mx-auto w-full overflow-x-auto">
      <div className="relative mx-auto shadow-[0_18px_40px_rgba(26,39,68,0.12)]" style={{ width }}>
        <div
          className="relative bg-white"
          style={{ width, height }}
          onDragOver={(e) => {
            if (!signatureUrl) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
          }}
          onDrop={(e) => {
            if (!signatureUrl) return
            e.preventDefault()
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left - 80
            const y = e.clientY - rect.top - 32
            onPlace(
              pageIndex,
              Math.max(0, Math.min(x, width - 160)),
              Math.max(0, Math.min(y, height - 64)),
            )
          }}
        >
          <img
            src={pageImageUrl}
            alt={`PDF page ${pageIndex + 1}`}
            width={width}
            height={height}
            className="pointer-events-none block select-none"
            draggable={false}
          />

          {placements.map((placement) => (
            <Rnd
              key={placement.id}
              size={{ width: placement.width, height: placement.height }}
              position={{ x: placement.x, y: placement.y }}
              bounds="parent"
              lockAspectRatio
              // Keep scale on bottom-right only so it never covers the delete button.
              enableResizing={{
                top: false,
                right: false,
                bottom: false,
                left: false,
                topRight: false,
                topLeft: false,
                bottomRight: true,
                bottomLeft: false,
              }}
              resizeHandleClasses={{
                bottomRight: 'signature-scale-handle',
              }}
              onDragStop={(_e, data) => {
                onUpdate(placement.id, { x: data.x, y: data.y })
              }}
              onResizeStop={(_e, _dir, ref, _delta, position) => {
                onUpdate(placement.id, {
                  width: ref.offsetWidth,
                  height: ref.offsetHeight,
                  x: position.x,
                  y: position.y,
                })
              }}
              className="signature-handle"
            >
              <div className="relative h-full w-full">
                {signatureUrl ? (
                  <img
                    src={signatureUrl}
                    alt="Placed signature"
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                ) : null}
                <button
                  type="button"
                  aria-label="Remove signature"
                  title="Delete signature"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(placement.id)
                  }}
                  className="absolute -left-3 -top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-[#9b1c1c] text-sm leading-none text-white shadow-md hover:bg-[#7f1d1d]"
                >
                  ×
                </button>
              </div>
            </Rnd>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-[var(--muted)]">
          Page {pageIndex + 1}
        </p>
      </div>
    </div>
  )
}
