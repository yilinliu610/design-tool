import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import './App.css'
import AsciiControls   from './components/AsciiControls'
import NoiseControls   from './components/NoiseControls'
import SymbolControls  from './components/SymbolControls'
import GlassControls    from './components/GlassControls'
import GradientControls  from './components/GradientControls'
import PseudoTDControls  from './components/PseudoTDControls'
import * as tf          from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-converter'
import * as bodyPix    from '@tensorflow-models/body-pix'
import { renderAscii } from './utils/asciiEngine'
import { applyGrain, applyRowGlitch } from './utils/noiseEngine'
import { processRegions } from './utils/symbolEngine'
import { renderGlass }        from './utils/glassEngine'
import { renderGradientMap }  from './utils/gradientEngine'
import { renderTracking }          from './utils/tdTrackingEngine'
import { renderFinalComposition }  from './utils/compositionEngine'
import CompositionView             from './components/CompositionView'
import LayerInspector              from './components/LayerInspector'
import ChromeControls              from './components/ChromeControls'
import { ChromeRenderer }          from './utils/chromeEngine'

// ─── Data ────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'texturize',
    label: 'Texturize',
    effects: ['Noise', 'ASCII', 'Find Edges'],
  },
  {
    id: 'filter',
    label: 'Filter',
    effects: ['Frosted Glass', 'Gradient Map'],
  },
  {
    id: 'generative',
    label: 'Generative Effect',
    effects: ['Pseudo-TD Tracking', 'Draw to Chrome'],
  },
]

// ─── Shared helpers ───────────────────────────────────────────────────────────

// Composite effect: restore person pixels from the original image.
// personSeg = { data: Uint8Array (0=bg, 1=person), width, height }
function applyPersonMask(ctx, canvas, image, personSeg) {
  const { data: segData, width: sw, height: sh } = personSeg
  const w = canvas.width, h = canvas.height

  // Build grayscale mask canvas at seg resolution
  const maskCv = document.createElement('canvas')
  maskCv.width = sw; maskCv.height = sh
  const mCtx   = maskCv.getContext('2d')
  const raw    = mCtx.createImageData(sw, sh)
  for (let i = 0; i < segData.length; i++) {
    const v = segData[i] === 1 ? 255 : 0
    raw.data[i * 4] = raw.data[i * 4 + 1] = raw.data[i * 4 + 2] = v
    raw.data[i * 4 + 3] = 255
  }
  mCtx.putImageData(raw, 0, 0)

  // Scale to output canvas resolution
  const scaled = document.createElement('canvas')
  scaled.width = w; scaled.height = h
  scaled.getContext('2d').drawImage(maskCv, 0, 0, w, h)
  const scaledD = scaled.getContext('2d').getImageData(0, 0, w, h).data

  // Original pixels
  const origCv = document.createElement('canvas')
  origCv.width = w; origCv.height = h
  origCv.getContext('2d').drawImage(image, 0, 0, w, h)
  const origD = origCv.getContext('2d').getImageData(0, 0, w, h).data

  // Merge: person pixels → original
  const out = ctx.getImageData(0, 0, w, h)
  for (let i = 0; i < w * h; i++) {
    if (scaledD[i * 4] >= 128) {
      out.data[i * 4]     = origD[i * 4]
      out.data[i * 4 + 1] = origD[i * 4 + 1]
      out.data[i * 4 + 2] = origD[i * 4 + 2]
    }
  }
  ctx.putImageData(out, 0, 0)
}

// ─── Sidebar section ─────────────────────────────────────────────────────────

function SidebarSection({ section, isOpen, onToggle, activeEffect, onSelect }) {
  return (
    <div className="border-b border-zinc-800/80">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 group hover:bg-zinc-800/30 transition-colors duration-150"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 group-hover:text-zinc-300 transition-colors duration-150">
          {section.label}
        </span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-all duration-220 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      <div className={`section-body ${isOpen ? 'open' : ''}`}>
        <div>
          <div className="px-5 pt-1 pb-5 flex flex-wrap gap-2">
            {section.effects.map((effect) => {
              const active = activeEffect === effect
              return (
                <button
                  key={effect}
                  onClick={() => onSelect(active ? null : effect)}
                  className={`
                    px-3 py-1.5 border text-[10px] font-medium uppercase tracking-[0.1em]
                    transition-all duration-150 cursor-pointer
                    ${active
                      ? 'border-zinc-300 bg-zinc-200 text-zinc-900'
                      : 'border-zinc-700 bg-transparent text-zinc-500 hover:border-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }
                  `}
                >
                  {effect}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Card header ─────────────────────────────────────────────────────────────

function CardHeader({ label, children }) {
  return (
    <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-zinc-800/80">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      {children ?? (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-zinc-800" />
          <span className="w-1.5 h-1.5 bg-zinc-800" />
          <span className="w-1.5 h-1.5 bg-zinc-800" />
        </div>
      )}
    </div>
  )
}

// ─── Layer Tray ───────────────────────────────────────────────────────────────

function LayerTray({ layers, onRemove }) {
  if (layers.length === 0) return null

  return (
    <div className="shrink-0 border-t border-zinc-800/80 bg-zinc-900">
      <div className="flex items-center px-4 py-2 border-b border-zinc-800/80">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Layer Tray
        </span>
        <span className="ml-2 text-[9px] text-zinc-700">
          {layers.length} layer{layers.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex gap-3 px-4 py-3 overflow-x-auto">
        {layers.map((layer, index) => (
          <div key={layer.id} className="relative shrink-0 group">
            <div
              className="border border-zinc-800 overflow-hidden bg-zinc-950"
              style={{ width: 80, height: 60 }}
            >
              <img
                src={layer.dataURL}
                alt={`Layer ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[8px] text-zinc-600 uppercase tracking-[0.1em]">
                L{index + 1}
              </span>
              <button
                onClick={() => onRemove(layer.id)}
                className="text-zinc-700 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
                aria-label={`Remove layer ${index + 1}`}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-2.5 h-2.5">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message = 'Empty', icon }) {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div className="relative w-10 h-10 border border-zinc-800 flex items-center justify-center">
        {icon ?? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="square"
            className="w-4 h-4 text-zinc-700"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
      </div>
      <span className="relative text-[9px] uppercase tracking-[0.18em] text-zinc-700 select-none">
        {message}
      </span>
    </>
  )
}

// ─── Draw panel ───────────────────────────────────────────────────────────────

function DrawPanel({ drawCanvasRef, strokes, onStrokesChange, brushSize = 10 }) {
  const drawing    = useRef(false)
  const currStroke = useRef([])

  // Size the canvas to its container and fill white on first mount
  useLayoutEffect(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width
    canvas.height = rect.height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [drawCanvasRef])

  // Re-draw all committed strokes whenever the array changes (clear + replay)
  useEffect(() => {
    const canvas = drawCanvasRef.current
    if (!canvas || !canvas.width) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1c1c1c'
    ctx.lineWidth   = brushSize
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    for (const stroke of strokes) {
      if (stroke.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(stroke[0].x, stroke[0].y)
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y)
      ctx.stroke()
    }
  }, [strokes, drawCanvasRef, brushSize])

  const getPoint = (e) => {
    const rect = drawCanvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseDown = (e) => {
    drawing.current = true
    currStroke.current = [getPoint(e)]
  }

  const handleMouseMove = (e) => {
    if (!drawing.current) return
    const pt   = getPoint(e)
    const prev = currStroke.current[currStroke.current.length - 1]
    const ctx  = drawCanvasRef.current.getContext('2d')
    ctx.strokeStyle = '#1c1c1c'
    ctx.lineWidth   = brushSize
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    currStroke.current.push(pt)
  }

  const handleMouseUp = () => {
    if (!drawing.current) return
    drawing.current = false
    const stroke = currStroke.current   // capture before clearing — ref is mutated below
    currStroke.current = []
    if (stroke.length > 1) {
      onStrokesChange(prev => [...prev, stroke])
    }
  }

  return (
    <div className="flex flex-col min-h-0 overflow-hidden">
      <CardHeader label="Draw" />
      <div className="flex-1 relative overflow-hidden" style={{ background: '#ffffff' }}>
        <canvas
          ref={drawCanvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {strokes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1" strokeLinecap="round"
              className="w-6 h-6">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z" />
            </svg>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#bbb', userSelect: 'none' }}>
              Draw outlines here
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Original panel ───────────────────────────────────────────────────────────

function OriginalPanel({ image, onImageLoad }) {
  const inputRef = useRef(null)

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => onImageLoad(img)
    img.src = url
  }, [onImageLoad])

  const handleInputChange = (e) => loadFile(e.target.files?.[0])
  const handleDrop = (e) => { e.preventDefault(); loadFile(e.dataTransfer.files?.[0]) }

  return (
    <div className="flex flex-col min-h-0 overflow-hidden">
      <CardHeader label="Original Image">
        {image && (
          <button
            onClick={() => inputRef.current?.click()}
            className="text-[9px] uppercase tracking-[0.1em] text-zinc-600 hover:text-zinc-400 transition-colors border border-zinc-800 hover:border-zinc-600 px-2 py-0.5"
          >
            Replace
          </button>
        )}
      </CardHeader>

      <div
        className="flex-1 flex flex-col items-center justify-center gap-4 bg-zinc-950 relative overflow-hidden cursor-pointer"
        onClick={() => !image && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={handleInputChange} />
        {image ? (
          <img src={image.src} alt="Original" className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <EmptyState message="Click or drop to upload" />
        )}
      </div>
    </div>
  )
}

// ─── Output panel ─────────────────────────────────────────────────────────────

function OutputPanel({ canvasRef, hasImage, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, crosshair }) {
  return (
    <div className="flex flex-col min-h-0 overflow-hidden">
      <CardHeader label="Output" />
      <div className="flex-1 relative bg-zinc-950 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          className={`absolute inset-0 w-full h-full ${crosshair ? 'cursor-crosshair' : ''}`}
        />
        {!hasImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
            <EmptyState message="No input" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Chrome output panel (WebGL canvas) ──────────────────────────────────────

function ChromeOutputPanel({ canvasRef, hasStrokes }) {
  return (
    <div className="flex flex-col min-h-0 overflow-hidden">
      <CardHeader label="Chrome Output" />
      <div className="flex-1 relative bg-zinc-950 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: 'block' }}
        />
        {!hasStrokes && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <EmptyState message="Draw on the left to generate chrome" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [open, setOpen]               = useState({ texturize: true, filter: false, generative: false })
  const [activeEffect, setActiveEffect] = useState(null)

  // ── Image ──────────────────────────────────────────────────────────────────
  const [image, setImage] = useState(null)

  // ── AI shared service ──────────────────────────────────────────────────────
  const [aiModel,    setAiModel]    = useState(null)
  const [personSeg,  setPersonSeg]  = useState(null)   // { data, width, height } | null
  const [modelStatus, setModelStatus] = useState('loading')

  // ── Effect settings ────────────────────────────────────────────────────────
  const [asciiSettings, setAsciiSettings] = useState({
    density:        50,
    columns:        80,
    rows:           40,
    color:          '#e4e4e7',
    blur:           0,
    grain:          0,
    gamma:          1.0,
    blackPoint:     0,
    whitePoint:     255,
    showOriginalBg: false,
    aiSegmentation: false,
  })

  const [noiseSettings, setNoiseSettings] = useState({
    grain: 0, rowGlitch: 0, flicker: 0, aiSegmentation: false,
  })

  const [symbolSettings, setSymbolSettings] = useState({
    regionCount: 6, cellSize: 16, showBoundaries: true, colorRegions: true, aiSegmentation: false,
  })

  const [glassSettings, setGlassSettings] = useState({
    size: 77, complexity: 29, contrast: 26, shininess: 60, speed: 0,
    enableColorRamp: false, shadowColor: '#000033', peakColor: '#FF00FF',
    showOriginal: false, aiSegmentation: false,
  })

  const [tdTrackers, setTdTrackers] = useState([])
  const [tdSettings, setTdSettings] = useState({
    minRadius: 10, maxRadius: 100, speed: 50, color: '#ffffff', connectionWidth: 1.5, aiSegmentation: false,
  })

  const [gradientSettings, setGradientSettings] = useState({
    stops: [
      { id: 'gs-0', position: 0,    color: '#1a0033' },
      { id: 'gs-1', position: 0.35, color: '#4400aa' },
      { id: 'gs-2', position: 0.65, color: '#ff00ff' },
      { id: 'gs-3', position: 1,    color: '#00ffff' },
    ],
    vibeInput: '',
  })

  const updateSetting          = useCallback((k, v) => setAsciiSettings(p => ({ ...p, [k]: v })),    [])
  const updateNoiseSetting     = useCallback((k, v) => setNoiseSettings(p => ({ ...p, [k]: v })),    [])
  const updateSymbolSetting    = useCallback((k, v) => setSymbolSettings(p => ({ ...p, [k]: v })),   [])
  const updateGlassSetting     = useCallback((k, v) => setGlassSettings(p => ({ ...p, [k]: v })),    [])
  const updateGradientSetting  = useCallback((k, v) => setGradientSettings(p => ({ ...p, [k]: v })), [])
  const updateTdSetting        = useCallback((k, v) => setTdSettings(p => ({ ...p, [k]: v })),       [])

  // ── Canvas refs ────────────────────────────────────────────────────────────
  const outputCanvasRef   = useRef(null)
  const chromeCanvasRef   = useRef(null)   // dedicated WebGL canvas for Draw-to-Chrome
  const chromeRendererRef = useRef(null)   // ChromeRenderer instance
  const [chromeCanvasKey, setChromeCanvasKey] = useState(0)  // bump to re-run render after canvas mounts

  // ── Layers ─────────────────────────────────────────────────────────────────
  const [layers, setLayers] = useState([])
  const [viewMode, setViewMode] = useState('effects')           // 'effects' | 'composition'
  const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1080 })
  const [selectedLayerId, setSelectedLayerId] = useState(null)

  const handleCaptureToLayer = useCallback(() => {
    const canvas = outputCanvasRef.current
    if (!canvas || canvas.width === 0 || canvas.height === 0) return
    try {
      const dataURL = canvas.toDataURL('image/png')
      setLayers(prev => [...prev, {
        id:        `layer-${Date.now()}`,
        dataURL,
        width:     canvas.width,
        height:    canvas.height,
        x:         0,
        y:         0,
        scale:     1,
        zIndex:    prev.length,
        blendMode: 'normal',
        opacity:   1,
      }])
    } catch (err) {
      console.error('[Capture to Layer]', err)
    }
  }, [])

  const handleRemoveLayer = useCallback((id) => {
    setLayers(prev => prev.filter(l => l.id !== id))
  }, [])

  const handleExport = useCallback(() => {
    const canvas = outputCanvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'design-tool-export.png'
    link.href = canvas.toDataURL()
    link.click()
  }, [])

  const handleExportComposition = useCallback(() => {
    if (layers.length === 0) return
    const offscreen = document.createElement('canvas')
    offscreen.width  = canvasSize.width
    offscreen.height = canvasSize.height
    const ctx = offscreen.getContext('2d')
    renderFinalComposition(ctx, layers, canvasSize)
      .then(() => {
        const link = document.createElement('a')
        link.download = 'composition.png'
        link.href = offscreen.toDataURL('image/png')
        link.click()
      })
      .catch(err => console.error('[Export] composition render failed:', err))
  }, [layers, canvasSize])

  // ── Draw-to-Chrome ─────────────────────────────────────────────────────────
  const [drawStrokes, setDrawStrokes] = useState([])
  const [chromeSettings, setChromeSettings] = useState({
    brushSize:  3,
    turbulence: 0.02,
    strength:   40,
    zSpread:    4.0,
    loop:       55,
    seed:       0,
    shininess:  20,
    bgPreset:   'black',
  })
  const drawCanvasRef = useRef(null)

  const updateChromeSetting = useCallback((k, v) => setChromeSettings(p => ({ ...p, [k]: v })), [])
  const handleClearDraw     = useCallback(() => setDrawStrokes([]), [])

  // ── Draw-to-Chrome: create renderer on enter, dispose on leave ────────────
  useEffect(() => {
    if (activeEffect !== 'Draw to Chrome') {
      if (chromeRendererRef.current) {
        chromeRendererRef.current.dispose()
        chromeRendererRef.current = null
      }
      return
    }
    // Renderer is created lazily once the canvas is mounted.
    // The render effect below handles the actual draw call.
  }, [activeEffect])

  // ── Draw-to-Chrome: re-render whenever strokes or settings change ──────────
  useEffect(() => {
    if (activeEffect !== 'Draw to Chrome') return
    const canvas = chromeCanvasRef.current
    if (!canvas) {
      // Canvas not mounted yet — bump key so this effect re-fires after mount
      setChromeCanvasKey(k => k + 1)
      return
    }

    if (!chromeRendererRef.current) {
      chromeRendererRef.current = new ChromeRenderer(canvas)
    }

    chromeRendererRef.current.render(drawStrokes, {
      ...chromeSettings,
      sourceWidth:  drawCanvasRef.current?.width  || canvas.clientWidth,
      sourceHeight: drawCanvasRef.current?.height || canvas.clientHeight,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawStrokes, chromeSettings, activeEffect, chromeCanvasKey])

  // ── Refs for animation loops (avoids stale closures in rAF) ────────────────
  const glassSettingsRef = useRef(glassSettings)
  const personSegRef     = useRef(personSeg)
  const animTimeRef      = useRef(0)
  const animFrameRef     = useRef(null)

  const tdTrackersRef    = useRef(tdTrackers)
  const tdSettingsRef    = useRef(tdSettings)
  const tdAnimFrameRef   = useRef(null)
  const dragStartRef     = useRef(null)   // {x,y} while mouse is held down
  const dragPreviewRef   = useRef(null)   // {x1,y1,x2,y2} during active drag
  const trackerNumRef    = useRef(0)      // monotonic counter for track labels
  const tdAnimTimeRef    = useRef(0)      // accumulated animation time (speed-aware)

  // ── Load Body-Pix once on mount ────────────────────────────────────────────
  useEffect(() => {
    tf.ready()
      .then(() => bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier:   0.75,
        quantBytes:   2,
      }))
      .then(model => { setAiModel(model); setModelStatus('ready') })
      .catch(() => setModelStatus('error'))
  }, [])

  // ── Generate person mask whenever image or model changes ───────────────────
  useEffect(() => {
    if (!aiModel || !image) { setPersonSeg(null); return }
    aiModel.segmentPerson(image, { internalResolution: 'medium', segmentationThreshold: 0.7 })
      .then(seg => setPersonSeg({ data: seg.data, width: seg.width, height: seg.height }))
      .catch(err => { console.error('[App] segmentation failed:', err); setPersonSeg(null) })
  }, [image, aiModel])

  // ── Keep refs in sync so rAF loops always read current values ───────────────
  useEffect(() => { glassSettingsRef.current = glassSettings }, [glassSettings])
  useEffect(() => { personSegRef.current     = personSeg     }, [personSeg])
  useEffect(() => { tdTrackersRef.current    = tdTrackers    }, [tdTrackers])
  useEffect(() => { tdSettingsRef.current    = tdSettings    }, [tdSettings])

  // ── Debounced ASCII render ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeEffect !== 'ASCII' || !image || !outputCanvasRef.current) return
    const canvas = outputCanvasRef.current
    const id = setTimeout(async () => {
      try {
        await renderAscii(image, canvas, { ...asciiSettings, personSegmentation: personSeg })
      } catch (err) {
        console.error('[ASCII render error]', err)
      }
    }, 500)
    return () => clearTimeout(id)
  }, [image, asciiSettings, personSeg, activeEffect])

  // ── Debounced Noise render ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeEffect !== 'Noise' || !image || !outputCanvasRef.current) return
    const canvas = outputCanvasRef.current
    const id = setTimeout(() => {
      const rect = canvas.getBoundingClientRect()
      canvas.width  = rect.width
      canvas.height = rect.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      applyGrain(ctx, canvas.width, canvas.height, noiseSettings.grain)
      applyRowGlitch(ctx, canvas.width, canvas.height, noiseSettings.rowGlitch)
      if (noiseSettings.flicker > 0) {
        const opacity = Math.random() * (noiseSettings.flicker / 100) * 0.6
        ctx.fillStyle = `rgba(0,0,0,${opacity.toFixed(2)})`
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      if (noiseSettings.aiSegmentation && personSeg) {
        applyPersonMask(ctx, canvas, image, personSeg)
      }
    }, 500)
    return () => clearTimeout(id)
  }, [image, noiseSettings, personSeg, activeEffect])

  // ── Debounced Find Edges render ────────────────────────────────────────────
  useEffect(() => {
    if (activeEffect !== 'Find Edges' || !image || !outputCanvasRef.current) return
    const canvas = outputCanvasRef.current
    const id = setTimeout(() => {
      const rect = canvas.getBoundingClientRect()
      canvas.width  = rect.width
      canvas.height = rect.height

      const work = document.createElement('canvas')
      work.width  = canvas.width
      work.height = canvas.height
      work.getContext('2d').drawImage(image, 0, 0, work.width, work.height)

      const { labels, centroids, darkestIndex, width, height } =
        processRegions(work, symbolSettings.regionCount)

      const ctx     = canvas.getContext('2d')
      const imgData = ctx.createImageData(width, height)
      const d       = imgData.data

      for (let i = 0; i < labels.length; i++) {
        const ci = labels[i]
        let r, g, b

        const isBoundary = symbolSettings.showBoundaries && (
          (i % width !== width - 1 && labels[i + 1]       !== ci) ||
          (i + width < labels.length && labels[i + width] !== ci)
        )

        if (isBoundary) {
          r = 255; g = 255; b = 255
        } else if (ci === darkestIndex) {
          r = 0; g = 0; b = 0
        } else {
          r = centroids[ci][0]; g = centroids[ci][1]; b = centroids[ci][2]
        }

        d[i * 4]     = r
        d[i * 4 + 1] = g
        d[i * 4 + 2] = b
        d[i * 4 + 3] = 255
      }

      ctx.putImageData(imgData, 0, 0)

      if (symbolSettings.aiSegmentation && personSeg) {
        applyPersonMask(ctx, canvas, image, personSeg)
      }
    }, 500)
    return () => clearTimeout(id)
  }, [image, symbolSettings, personSeg, activeEffect])

  // ── Frosted Glass: static render (speed = 0) ──────────────────────────────
  useEffect(() => {
    if (activeEffect !== 'Frosted Glass' || !image || !outputCanvasRef.current) return
    if (glassSettings.speed > 0) return
    const canvas = outputCanvasRef.current
    const id = setTimeout(() => {
      const rect = canvas.getBoundingClientRect()
      canvas.width  = rect.width
      canvas.height = rect.height
      renderGlass(image, canvas, {
        ...glassSettings,
        time: animTimeRef.current,
        personSeg: glassSettings.aiSegmentation ? personSeg : null,
      })
    }, 500)
    return () => clearTimeout(id)
  }, [image, glassSettings, personSeg, activeEffect])

  // ── Frosted Glass: animation loop (speed > 0) ──────────────────────────────
  useEffect(() => {
    if (activeEffect !== 'Frosted Glass' || !image || !outputCanvasRef.current) return
    if (glassSettings.speed <= 0) return
    const canvas = outputCanvasRef.current
    const rect   = canvas.getBoundingClientRect()
    canvas.width  = rect.width
    canvas.height = rect.height

    let lastTs = null

    const loop = (ts) => {
      if (lastTs !== null) {
        animTimeRef.current += ((ts - lastTs) / 1000) * glassSettingsRef.current.speed / 30
      }
      lastTs = ts

      const s   = glassSettingsRef.current
      const seg = personSegRef.current
      renderGlass(image, canvas, {
        ...s,
        time: animTimeRef.current,
        personSeg: s.aiSegmentation ? seg : null,
      })

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
  }, [image, activeEffect, glassSettings.speed])

  // ── Debounced Gradient Map render ─────────────────────────────────────────
  useEffect(() => {
    if (activeEffect !== 'Gradient Map' || !image || !outputCanvasRef.current) return
    const canvas = outputCanvasRef.current
    const id = setTimeout(() => {
      const rect = canvas.getBoundingClientRect()
      canvas.width  = rect.width
      canvas.height = rect.height
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      renderGradientMap(canvas, gradientSettings.stops)
    }, 500)
    return () => clearTimeout(id)
  }, [image, gradientSettings, activeEffect])

  // ── Pseudo-TD Tracking: rAF render loop ──────────────────────────────────
  useEffect(() => {
    if (activeEffect !== 'Pseudo-TD Tracking' || !image || !outputCanvasRef.current) return
    const canvas = outputCanvasRef.current
    const rect   = canvas.getBoundingClientRect()
    canvas.width  = rect.width
    canvas.height = rect.height

    let lastTs = null
    const loop = (ts) => {
      if (lastTs !== null) {
        const delta = (ts - lastTs) / 1000
        tdAnimTimeRef.current += delta * (tdSettingsRef.current.speed / 50)
      }
      lastTs = ts

      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      const s = tdSettingsRef.current
      renderTracking(ctx, tdTrackersRef.current, {
        color:           s.color,
        animTime:        tdAnimTimeRef.current,
        connectionWidth: s.connectionWidth,
        personSeg:       s.aiSegmentation ? personSegRef.current : null,
      })
      // Live drag-preview box
      const dp = dragPreviewRef.current
      if (dp) {
        ctx.save()
        ctx.strokeStyle = s.color
        ctx.lineWidth   = 1
        ctx.globalAlpha = 0.5
        ctx.setLineDash([4, 4])
        ctx.strokeRect(dp.x1, dp.y1, dp.x2 - dp.x1, dp.y2 - dp.y1)
        ctx.setLineDash([])
        ctx.restore()
      }
      tdAnimFrameRef.current = requestAnimationFrame(loop)
    }
    tdAnimFrameRef.current = requestAnimationFrame(loop)
    return () => {
      if (tdAnimFrameRef.current) {
        cancelAnimationFrame(tdAnimFrameRef.current)
        tdAnimFrameRef.current = null
      }
    }
  }, [image, activeEffect])

  // ── Pseudo-TD Tracking: mouse handlers ────────────────────────────────────

  const handleMouseDown = useCallback((e) => {
    if (activeEffect !== 'Pseudo-TD Tracking' || !outputCanvasRef.current) return
    const canvas = outputCanvasRef.current
    const rect   = canvas.getBoundingClientRect()
    dragStartRef.current = {
      x: (e.clientX - rect.left) * (canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }, [activeEffect])

  const handleMouseMove = useCallback((e) => {
    if (!dragStartRef.current || activeEffect !== 'Pseudo-TD Tracking') return
    const canvas = outputCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x  = (e.clientX - rect.left) * (canvas.width  / rect.width)
    const y  = (e.clientY - rect.top)  * (canvas.height / rect.height)
    const dx = x - dragStartRef.current.x
    const dy = y - dragStartRef.current.y
    if (Math.sqrt(dx * dx + dy * dy) > 8) {
      dragPreviewRef.current = { x1: dragStartRef.current.x, y1: dragStartRef.current.y, x2: x, y2: y }
    }
  }, [activeEffect])

  const handleMouseUp = useCallback((e) => {
    if (activeEffect !== 'Pseudo-TD Tracking' || !outputCanvasRef.current) return
    const canvas  = outputCanvasRef.current
    const rect    = canvas.getBoundingClientRect()
    const x       = (e.clientX - rect.left) * (canvas.width  / rect.width)
    const y       = (e.clientY - rect.top)  * (canvas.height / rect.height)
    const start   = dragStartRef.current
    const preview = dragPreviewRef.current
    dragStartRef.current   = null
    dragPreviewRef.current = null
    if (!start) return

    const s   = tdSettingsRef.current
    const seg = personSegRef.current

    const inMask = (px, py) => {
      if (!s.aiSegmentation || !seg) return true
      const mx = Math.min(seg.width  - 1, Math.floor((px / canvas.width)  * seg.width))
      const my = Math.min(seg.height - 1, Math.floor((py / canvas.height) * seg.height))
      return seg.data[my * seg.width + mx] === 1
    }

    const isDrag = preview &&
      Math.abs(preview.x2 - preview.x1) > 15 &&
      Math.abs(preview.y2 - preview.y1) > 15

    if (isDrag) {
      const cx = (preview.x1 + preview.x2) / 2
      const cy = (preview.y1 + preview.y2) / 2
      if (!inMask(cx, cy)) return
      const num = ++trackerNumRef.current
      setTdTrackers(prev => [...prev, {
        id:         `t${Date.now()}`,
        type:       'box',
        x1:         Math.min(preview.x1, preview.x2),
        y1:         Math.min(preview.y1, preview.y2),
        x2:         Math.max(preview.x1, preview.x2),
        y2:         Math.max(preview.y1, preview.y2),
        x:          cx,
        y:          cy,
        trackNum:   num,
        confBase:   0.7 + Math.random() * 0.29,
        confSeed:   Math.random() * 100,
        wobbleSeed: Math.random() * 100,
      }])
    } else {
      if (!inMask(x, y)) return
      const { minRadius, maxRadius } = s
      const styles = ['solid', 'dashed', 'dotted']
      const num = ++trackerNumRef.current
      setTdTrackers(prev => [...prev, {
        id:               `t${Date.now()}`,
        type:             'circle',
        x, y,
        radius:           minRadius + Math.random() * Math.max(0, maxRadius - minRadius),
        style:            styles[Math.floor(Math.random() * styles.length)],
        rotation:         Math.random() * Math.PI * 2,
        wobbleSeed:       Math.random() * 100,
        direction:        Math.random() > 0.5 ? 1 : -1,
        showCenterCross:  Math.random() < 0.3,
        showOuterMarkers: Math.random() < 0.4,
        trackNum:         num,
        confBase:         0.7 + Math.random() * 0.29,
        confSeed:         Math.random() * 100,
      }])
    }
  }, [activeEffect])

  const handleMouseLeave = useCallback(() => {
    dragStartRef.current   = null
    dragPreviewRef.current = null
  }, [])

  // ── Find Edges export ──────────────────────────────────────────────────────
  const handleSymbolExport = useCallback(() => {
    const canvas = outputCanvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'find-edges-export.png'
    link.href = canvas.toDataURL()
    link.click()
  }, [])

  const toggleSection  = (id) => setOpen(p => ({ ...p, [id]: !p[id] }))
  const activeSection  = SECTIONS.find(s => s.effects.includes(activeEffect ?? ''))

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">

      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className="w-80 shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800/80">

        {viewMode === 'effects' ? (
          <>
            <div className="px-5 pt-6 pb-5 border-b border-zinc-800/80">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-600 mb-1.5">
                Design Tool
              </p>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
                Effects
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto">
              {SECTIONS.map(section => (
                <SidebarSection
                  key={section.id}
                  section={section}
                  isOpen={open[section.id]}
                  onToggle={() => toggleSection(section.id)}
                  activeEffect={activeEffect}
                  onSelect={setActiveEffect}
                />
              ))}

              {activeEffect === 'ASCII' && (
                <AsciiControls
                  settings={asciiSettings}
                  onSettingChange={updateSetting}
                  modelStatus={modelStatus}
                />
              )}

              {activeEffect === 'Noise' && (
                <NoiseControls
                  settings={noiseSettings}
                  onSettingChange={updateNoiseSetting}
                />
              )}

              {activeEffect === 'Find Edges' && (
                <SymbolControls
                  settings={symbolSettings}
                  onSettingChange={updateSymbolSetting}
                  onExport={handleSymbolExport}
                />
              )}

              {activeEffect === 'Frosted Glass' && (
                <GlassControls
                  settings={glassSettings}
                  onSettingChange={updateGlassSetting}
                  modelStatus={modelStatus}
                />
              )}

              {activeEffect === 'Gradient Map' && (
                <GradientControls
                  settings={gradientSettings}
                  onSettingChange={updateGradientSetting}
                />
              )}

              {activeEffect === 'Pseudo-TD Tracking' && (
                <PseudoTDControls
                  settings={tdSettings}
                  onSettingChange={updateTdSetting}
                  onReset={() => { setTdTrackers([]); trackerNumRef.current = 0 }}
                  modelStatus={modelStatus}
                  trackerCount={tdTrackers.length}
                />
              )}

              {activeEffect === 'Draw to Chrome' && (
                <ChromeControls
                  settings={chromeSettings}
                  onSettingChange={updateChromeSetting}
                  onClear={handleClearDraw}
                  strokeCount={drawStrokes.length}
                />
              )}
            </div>

            {/* Active effect readout */}
            <div className="px-5 py-3 border-t border-zinc-800/80 min-h-[42px] flex items-center">
              {activeEffect ? (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                    {activeSection?.label}
                  </span>
                  <span className="text-[9px] text-zinc-700">·</span>
                  <span className="text-[10px] font-medium text-zinc-300 truncate">{activeEffect}</span>
                  <button
                    onClick={() => setActiveEffect(null)}
                    className="ml-auto text-zinc-600 hover:text-zinc-400 transition-colors"
                    aria-label="Clear selection"
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3 h-3">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>
              ) : (
                <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-700 select-none">
                  No effect selected
                </span>
              )}
            </div>

            {/* Apply button */}
            <div className="px-5 pb-5">
              <button
                disabled={!activeEffect}
                className={`
                  w-full py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em]
                  transition-all duration-150
                  ${activeEffect
                    ? 'bg-zinc-100 text-zinc-900 hover:bg-white cursor-pointer'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  }
                `}
              >
                Apply Effect
              </button>
            </div>
          </>
        ) : (
          <LayerInspector
            layers={layers}
            onLayersChange={setLayers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            canvasSize={canvasSize}
            onCanvasSizeChange={setCanvasSize}
          />
        )}

      </aside>

      {/* ── Main content ──────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <div className="shrink-0 flex items-center justify-between px-6 py-3.5 bg-zinc-900 border-b border-zinc-800/80">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Workspace
            </span>
            <span className="w-px h-3 bg-zinc-800" />
            <span className="text-[10px] text-zinc-600">Untitled</span>
            <span className="w-px h-3 bg-zinc-800" />
            {/* View mode toggle */}
            <div className="flex border border-zinc-800">
              <button
                onClick={() => setViewMode('effects')}
                className={`
                  px-3 py-1 text-[9px] uppercase tracking-[0.1em] transition-all duration-150
                  ${viewMode === 'effects'
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-400'
                  }
                `}
              >
                Effects
              </button>
              <button
                onClick={() => setViewMode('composition')}
                className={`
                  px-3 py-1 text-[9px] uppercase tracking-[0.1em] border-l border-zinc-800 transition-all duration-150
                  ${viewMode === 'composition'
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-400'
                  }
                `}
              >
                Composition
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'effects' && (
              <>
                {modelStatus === 'loading' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">Loading AI Model…</span>
                  </>
                ) : modelStatus === 'error' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-800" />
                    <span className="text-[10px] uppercase tracking-[0.1em] text-zinc-600">AI Unavailable</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                    <span className="text-[10px] uppercase tracking-[0.1em] text-zinc-600">Ready</span>
                  </>
                )}
                <span className="w-px h-3 bg-zinc-800 mx-1" />
                <button
                  disabled={!image}
                  onClick={handleExport}
                  className={`
                    px-3 py-1 border text-[10px] font-medium uppercase tracking-[0.1em] transition-all duration-150
                    ${image
                      ? 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 cursor-pointer'
                      : 'border-zinc-800 text-zinc-700 cursor-not-allowed'
                    }
                  `}
                >
                  Export
                </button>
                <button
                  disabled={!image}
                  onClick={handleCaptureToLayer}
                  className={`
                    px-3 py-1 border text-[10px] font-medium uppercase tracking-[0.1em] transition-all duration-150
                    ${image
                      ? 'border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-white cursor-pointer'
                      : 'border-zinc-800 text-zinc-700 cursor-not-allowed'
                    }
                  `}
                >
                  Capture to Layer
                </button>
              </>
            )}

            {viewMode === 'composition' && (
              <>
                <span className="text-[9px] uppercase tracking-[0.1em] text-zinc-600">
                  {canvasSize.width} × {canvasSize.height}
                </span>
                <span className="w-px h-3 bg-zinc-800 mx-1" />
                <button
                  disabled={layers.length === 0}
                  onClick={handleExportComposition}
                  className={`
                    px-3 py-1 border text-[10px] font-medium uppercase tracking-[0.1em] transition-all duration-150
                    ${layers.length > 0
                      ? 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 cursor-pointer'
                      : 'border-zinc-800 text-zinc-700 cursor-not-allowed'
                    }
                  `}
                >
                  Final Export PNG
                </button>
              </>
            )}
          </div>
        </div>

        {viewMode === 'effects' ? (
          <>
            <div className="flex-1 grid grid-cols-2 divide-x divide-zinc-800/80 overflow-hidden">
              {activeEffect === 'Draw to Chrome'
                ? <DrawPanel drawCanvasRef={drawCanvasRef} strokes={drawStrokes} onStrokesChange={setDrawStrokes} brushSize={chromeSettings.brushSize} />
                : <OriginalPanel image={image} onImageLoad={setImage} />
              }
              {activeEffect === 'Draw to Chrome'
                ? <ChromeOutputPanel canvasRef={chromeCanvasRef} hasStrokes={drawStrokes.length > 0} />
                : <OutputPanel
                    canvasRef={outputCanvasRef}
                    hasImage={!!image}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    crosshair={activeEffect === 'Pseudo-TD Tracking'}
                  />
              }
            </div>
            <LayerTray layers={layers} onRemove={handleRemoveLayer} />
          </>
        ) : (
          <CompositionView
            layers={layers}
            onLayersChange={setLayers}
            canvasSize={canvasSize}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
          />
        )}

      </main>

    </div>
  )
}
