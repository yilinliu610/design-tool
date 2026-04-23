import { useRef, useCallback, useLayoutEffect, useState } from 'react'

export default function CompositionView({
  layers,
  onLayersChange,
  canvasSize,
  selectedLayerId,
  onSelectLayer,
}) {
  const wrapperRef = useRef(null)
  const canvasRef  = useRef(null)
  const dragRef    = useRef(null)
  const [fitScale, setFitScale] = useState(1)

  // Recompute fit-scale whenever canvas size or wrapper size changes
  useLayoutEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return
      const { width: ww, height: wh } = wrapperRef.current.getBoundingClientRect()
      const padding = 64
      const scale = Math.min(
        (ww - padding) / canvasSize.width,
        (wh - padding) / canvasSize.height,
        1,
      )
      setFitScale(Math.max(0.05, scale))
    }
    update()
    const ro = new ResizeObserver(update)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [canvasSize])

  // Convert browser client coords → logical canvas coords
  const clientToCanvas = useCallback((clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left) / fitScale,
      y: (clientY - rect.top)  / fitScale,
    }
  }, [fitScale])

  const startDrag = useCallback((e, layer, type) => {
    e.preventDefault()
    e.stopPropagation()
    onSelectLayer(layer.id)
    const { x: mx, y: my } = clientToCanvas(e.clientX, e.clientY)
    dragRef.current = type === 'move'
      ? { type: 'move',   layerId: layer.id, mx0: mx, my0: my, x0: layer.x, y0: layer.y }
      : { type: 'resize', layerId: layer.id, mx0: mx, s0: layer.scale, w0: layer.width || canvasSize.width }
  }, [clientToCanvas, onSelectLayer, canvasSize])

  const handleMouseMove = useCallback((e) => {
    const d = dragRef.current
    if (!d) return
    const { x: mx, y: my } = clientToCanvas(e.clientX, e.clientY)
    if (d.type === 'move') {
      onLayersChange(prev => prev.map(l =>
        l.id === d.layerId
          ? { ...l, x: d.x0 + (mx - d.mx0), y: d.y0 + (my - d.my0) }
          : l
      ))
    } else {
      const newScale = Math.max(0.05, (d.w0 * d.s0 + (mx - d.mx0)) / d.w0)
      onLayersChange(prev => prev.map(l =>
        l.id === d.layerId ? { ...l, scale: newScale } : l
      ))
    }
  }, [clientToCanvas, onLayersChange])

  const stopDrag = useCallback(() => { dragRef.current = null }, [])

  const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex)

  return (
    <div
      ref={wrapperRef}
      className="flex-1 flex items-center justify-center bg-zinc-950 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      {/*
        Two-div trick: the outer div occupies the visual footprint of the scaled
        canvas so flexbox centering keeps it stable. The inner div is the logical
        canvas, scaled from its top-left corner.
      */}
      <div style={{
        width:    canvasSize.width  * fitScale,
        height:   canvasSize.height * fitScale,
        position: 'relative',
        flexShrink: 0,
      }}>
        <div
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width:    canvasSize.width,
            height:   canvasSize.height,
            transform: `scale(${fitScale})`,
            transformOrigin: 'top left',
            // Subtle dark checkerboard to show canvas bounds
            backgroundColor: '#09090b',
            backgroundImage: [
              'linear-gradient(45deg,#18181b 25%,transparent 25%)',
              'linear-gradient(-45deg,#18181b 25%,transparent 25%)',
              'linear-gradient(45deg,transparent 75%,#18181b 75%)',
              'linear-gradient(-45deg,transparent 75%,#18181b 75%)',
            ].join(','),
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0,0 10px,10px -10px,-10px 0',
          }}
          onClick={() => onSelectLayer(null)}
        >
          {sorted.map(layer => {
            const w = (layer.width  || canvasSize.width)  * layer.scale
            const h = (layer.height || canvasSize.height) * layer.scale
            const sel = selectedLayerId === layer.id
            return (
              <div
                key={layer.id}
                style={{
                  position: 'absolute',
                  left:   layer.x,
                  top:    layer.y,
                  width:  w,
                  height: h,
                  zIndex: layer.zIndex + 1,
                  cursor: 'move',
                  outline: sel ? '1px solid rgba(255,255,255,0.55)' : 'none',
                  outlineOffset: '1px',
                }}
                onMouseDown={e => startDrag(e, layer, 'move')}
              >
                <img
                  src={layer.dataURL}
                  alt=""
                  draggable={false}
                  style={{
                    display:       'block',
                    width:         '100%',
                    height:        '100%',
                    mixBlendMode:  layer.blendMode,
                    opacity:       layer.opacity ?? 1,
                    pointerEvents: 'none',
                    userSelect:    'none',
                  }}
                />
                {/* SE resize handle — only visible when layer is selected */}
                {sel && (
                  <div
                    style={{
                      position:  'absolute',
                      bottom: -5, right: -5,
                      width: 10, height: 10,
                      background: '#fff',
                      cursor: 'se-resize',
                      zIndex: 10,
                    }}
                    onMouseDown={e => { e.stopPropagation(); startDrag(e, layer, 'resize') }}
                  />
                )}
              </div>
            )
          })}

          {layers.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <span style={{
                fontSize: 10, textTransform: 'uppercase',
                letterSpacing: '0.18em', color: '#3f3f46', userSelect: 'none',
              }}>
                Capture layers to begin
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
