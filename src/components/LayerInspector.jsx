import { useRef, useState } from 'react'

const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'difference', 'lighter']

const PRESETS = [
  { label: '1:1',  w: 1080, h: 1080 },
  { label: '16:9', w: 1920, h: 1080 },
  { label: '9:16', w: 1080, h: 1920 },
  { label: '4:3',  w: 1440, h: 1080 },
]

export default function LayerInspector({
  layers,
  onLayersChange,
  selectedLayerId,
  onSelectLayer,
  canvasSize,
  onCanvasSizeChange,
}) {
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const dragIdRef = useRef(null)

  // Highest zIndex = topmost = first in the visible list
  const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex)

  const updateLayer = (id, updates) =>
    onLayersChange(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))

  // ── HTML5 drag-to-reorder ──────────────────────────────────────────────────

  const handleDragStart = (e, id) => {
    dragIdRef.current = id
    e.dataTransfer.effectAllowed = 'move'
    // Ghost image: tiny transparent pixel so the browser default ghost doesn't show
    const ghost = document.createElement('div')
    ghost.style.cssText = 'position:fixed;top:-999px;width:1px;height:1px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    const dragId = dragIdRef.current
    if (!dragId) { setDragOverIndex(null); return }
    const fromIndex = sorted.findIndex(l => l.id === dragId)
    if (fromIndex === dropIndex) { setDragOverIndex(null); return }

    const reordered = [...sorted]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(dropIndex, 0, moved)

    // First item in reordered = highest zIndex
    const maxZ = reordered.length - 1
    onLayersChange(layers.map(l => {
      const pos = reordered.findIndex(sl => sl.id === l.id)
      return { ...l, zIndex: maxZ - pos }
    }))
    dragIdRef.current = null
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    dragIdRef.current = null
    setDragOverIndex(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5 border-b border-zinc-800/80 shrink-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-600 mb-1.5">
          Design Tool
        </p>
        <h1 className="text-sm font-semibold tracking-tight text-zinc-100">Composition</h1>
      </div>

      {/* ── Canvas Settings ──────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-800/80 shrink-0">
        <div className="px-5 pt-4 pb-2">
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
            Canvas
          </span>
        </div>
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          {PRESETS.map(p => {
            const active = canvasSize.width === p.w && canvasSize.height === p.h
            return (
              <button
                key={p.label}
                onClick={() => onCanvasSizeChange({ width: p.w, height: p.h })}
                className={`
                  px-2.5 py-1 border text-[9px] uppercase tracking-[0.1em]
                  transition-all duration-150
                  ${active
                    ? 'border-zinc-300 bg-zinc-200 text-zinc-900'
                    : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                  }
                `}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        <div className="px-5 pb-4 flex items-center gap-2">
          <input
            type="number"
            min="100"
            value={canvasSize.width}
            onChange={e => onCanvasSizeChange(s => ({ ...s, width: Math.max(100, +e.target.value) }))}
            className="w-[72px] bg-zinc-950 border border-zinc-700 text-zinc-300 text-[10px] px-2 py-1.5 text-center focus:outline-none focus:border-zinc-500"
          />
          <span className="text-zinc-600 text-[10px]">×</span>
          <input
            type="number"
            min="100"
            value={canvasSize.height}
            onChange={e => onCanvasSizeChange(s => ({ ...s, height: Math.max(100, +e.target.value) }))}
            className="w-[72px] bg-zinc-950 border border-zinc-700 text-zinc-300 text-[10px] px-2 py-1.5 text-center focus:outline-none focus:border-zinc-500"
          />
          <span className="text-zinc-600 text-[9px]">px</span>
        </div>
      </div>

      {/* ── Layer list header ────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-zinc-800/80 shrink-0 flex items-center justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          Layers
        </span>
        {layers.length > 0 && (
          <span className="text-[9px] text-zinc-700">{layers.length}</span>
        )}
      </div>

      {/* ── Layer list ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-700 select-none">
              No layers captured
            </span>
          </div>
        ) : (
          sorted.map((layer, index) => {
            const isSelected  = selectedLayerId === layer.id
            const isDragTarget = dragOverIndex === index
            return (
              <div
                key={layer.id}
                draggable
                onDragStart={e => handleDragStart(e, layer.id)}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectLayer(isSelected ? null : layer.id)}
                className={`
                  border-b border-zinc-800/40 transition-colors duration-100 select-none
                  cursor-grab active:cursor-grabbing
                  ${isSelected ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/30'}
                  ${isDragTarget ? 'border-t-[2px] border-t-zinc-400' : ''}
                `}
              >
                {/* ── Thumbnail row ─────────────────────────────────────── */}
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-10 h-7 border border-zinc-700 overflow-hidden shrink-0 bg-zinc-950">
                    <img
                      src={layer.dataURL}
                      alt=""
                      draggable={false}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-zinc-300 block truncate">
                      Layer {layers.length - index}
                    </span>
                    <span className="text-[8px] uppercase tracking-[0.08em] text-zinc-600">
                      {Math.round((layer.width  || 0) * layer.scale)}
                      {' '}×{' '}
                      {Math.round((layer.height || 0) * layer.scale)}
                      {' · '}z{layer.zIndex}
                    </span>
                  </div>
                  {/* drag-handle icon */}
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    className="w-3 h-3 text-zinc-700 shrink-0"
                  >
                    <path d="M3 5h10M3 8h10M3 11h10" />
                  </svg>
                </div>

                {/* ── Expanded controls (only when selected) ────────────── */}
                {isSelected && (
                  <div
                    className="px-4 pb-4 space-y-2.5"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Blend mode */}
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] uppercase tracking-[0.1em] text-zinc-600 w-12 shrink-0">
                        Blend
                      </span>
                      <select
                        value={layer.blendMode}
                        onChange={e => updateLayer(layer.id, { blendMode: e.target.value })}
                        className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-300 text-[10px] px-2 py-1.5 focus:outline-none focus:border-zinc-500"
                      >
                        {BLEND_MODES.map(m => (
                          <option key={m} value={m}>
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Opacity */}
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] uppercase tracking-[0.1em] text-zinc-600 w-12 shrink-0">
                        Opacity
                      </span>
                      <input
                        type="range"
                        min="0" max="1" step="0.01"
                        value={layer.opacity ?? 1}
                        onChange={e => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
                        className="flex-1 accent-zinc-400"
                      />
                      <span className="text-[9px] text-zinc-500 w-7 text-right tabular-nums">
                        {Math.round((layer.opacity ?? 1) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
