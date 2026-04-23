// no local state needed — all settings are controlled from App

// ─── Primitives ───────────────────────────────────────────────────────────────

function ControlRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      {children}
    </div>
  )
}

function SliderInput({ label, min, max, step = 1, value, onChange }) {
  return (
    <ControlRow label={label}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          className="flex-1 h-px appearance-none bg-zinc-700 cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-zinc-200
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-3
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:bg-zinc-200
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer"
        />
        <span className="w-8 text-right text-[10px] tabular-nums text-zinc-400 shrink-0">
          {value}
        </span>
      </div>
    </ControlRow>
  )
}

function NumberInput({ label, min, max, value, onChange }) {
  return (
    <ControlRow label={label}>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-[11px]
          px-2.5 py-1.5 focus:outline-none focus:border-zinc-600
          transition-colors duration-150 tabular-nums"
      />
    </ControlRow>
  )
}

function ColorInput({ label, value, onChange }) {
  return (
    <ControlRow label={label}>
      <div className="flex items-center gap-2.5">
        <div
          className="w-5 h-5 shrink-0 border border-zinc-700"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={onChange}
          className="sr-only"
          id="ascii-color-picker"
        />
        <label
          htmlFor="ascii-color-picker"
          className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-400 text-[10px]
            px-2.5 py-1.5 cursor-pointer hover:border-zinc-600 transition-colors duration-150
            uppercase tracking-[0.08em] truncate"
        >
          {value.toUpperCase()}
        </label>
      </div>
    </ControlRow>
  )
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[8px] uppercase tracking-[0.18em] text-zinc-700">{label}</span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  )
}

function CheckboxInput({ label, checked, onChange, badge }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="appearance-none w-3.5 h-3.5 border border-zinc-700 bg-zinc-950
            checked:bg-zinc-200 checked:border-zinc-200 cursor-pointer transition-colors duration-150"
        />
        {checked && (
          <svg viewBox="0 0 10 10" className="absolute pointer-events-none w-2.5 h-2.5 text-zinc-900">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        )}
      </div>
      <span className="text-[10px] text-zinc-400 group-hover:text-zinc-300 transition-colors duration-150 leading-none">
        {label}
      </span>
      {badge && (
        <span className={`ml-auto text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 border ${badge.style}`}>
          {badge.text}
        </span>
      )}
    </label>
  )
}

// ─── AsciiControls ────────────────────────────────────────────────────────────
//
// Fully controlled — all values live in App's asciiSettings object.
//
// Props:
//   settings        — { density, columns, rows, color, blur, grain, gamma,
//                       blackPoint, whitePoint, showOriginalBg, aiSegmentation }
//   onSettingChange — (key: string, value: number | string | boolean) => void
//   modelStatus     — 'idle' | 'loading' | 'ready' | 'error'

export default function AsciiControls({ settings, onSettingChange, modelStatus = 'idle' }) {
  // Generic handler: parses the value and dispatches to App via onSettingChange.
  const handle = (key) => (e) => {
    const val = e.target.type === 'number' || e.target.type === 'range'
      ? Number(e.target.value)
      : e.target.value
    onSettingChange(key, val)
    console.log(`[ASCII] ${key}:`, val)
  }

  const {
    density        = 50,
    columns        = 80,
    rows           = 40,
    color          = '#e4e4e7',
    blur           = 0,
    grain          = 0,
    gamma          = 1.0,
    blackPoint     = 0,
    whitePoint     = 255,
    showOriginalBg = false,
    aiSegmentation = false,
  } = settings

  // Checkbox handler — dispatches boolean directly (no numeric conversion).
  const handleCheck = (key) => (e) => {
    onSettingChange(key, e.target.checked)
    console.log(`[ASCII] ${key}:`, e.target.checked)
  }

  // Model status badge config
  const modelBadge = {
    loading: { text: 'Loading…', style: 'border-yellow-900/60 text-yellow-600' },
    ready:   { text: 'Ready',    style: 'border-green-900/60  text-green-600'  },
    error:   { text: 'Error',    style: 'border-red-900/60    text-red-600'    },
  }[modelStatus] ?? null

  return (
    <div className="border-t border-zinc-800/80 bg-zinc-900/60">

      {/* Panel header */}
      <div className="px-5 py-3 border-b border-zinc-800/50">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          ASCII Settings
        </span>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">

        <Divider label="Texture" />

        <SliderInput label="Density" min={1} max={100}
          value={density} onChange={handle('density')} />
        <SliderInput label="Blur"    min={0} max={20}
          value={blur}    onChange={handle('blur')} />
        <SliderInput label="Grain"   min={0} max={100}
          value={grain}   onChange={handle('grain')} />

        <Divider label="Tone" />

        <SliderInput label="Gamma"       min={0.1} max={3.0} step={0.05}
          value={gamma}      onChange={handle('gamma')} />
        <SliderInput label="Black Point" min={0}   max={255}
          value={blackPoint} onChange={handle('blackPoint')} />
        <SliderInput label="White Point" min={0}   max={255}
          value={whitePoint} onChange={handle('whitePoint')} />

        <Divider label="Grid" />

        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Columns" min={4} max={400}
            value={columns} onChange={handle('columns')} />
          <NumberInput label="Rows"    min={4} max={300}
            value={rows}    onChange={handle('rows')} />
        </div>

        <Divider label="Color" />

        <ColorInput label="ASCII Color"
          value={color} onChange={handle('color')} />

        <Divider label="Segmentation" />

        <div className="flex flex-col gap-3">
          <CheckboxInput
            label="Show Original (Background)"
            checked={showOriginalBg}
            onChange={handleCheck('showOriginalBg')}
          />
          <CheckboxInput
            label="AI Person Detection"
            checked={aiSegmentation}
            onChange={handleCheck('aiSegmentation')}
            badge={aiSegmentation ? modelBadge : null}
          />
        </div>

        {/* Model loading hint — only shown while model is downloading */}
        {aiSegmentation && modelStatus === 'loading' && (
          <p className="text-[9px] text-yellow-700 leading-relaxed">
            Downloading model (~10 MB). First run may take a moment.
          </p>
        )}

      </div>
    </div>
  )
}
