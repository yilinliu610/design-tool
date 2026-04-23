function SliderInput({ label, min, max, step = 1, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
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
    </div>
  )
}

function ToggleInput({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-2.5 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'}`}>
      <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="appearance-none w-3.5 h-3.5 border border-zinc-700 bg-zinc-950
            checked:bg-zinc-200 checked:border-zinc-200 cursor-pointer transition-colors duration-150
            disabled:cursor-not-allowed"
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
    </label>
  )
}

function ColorInput({ label, value, onChange, id }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 shrink-0 border border-zinc-700" style={{ backgroundColor: value }} />
        <input type="color" value={value} onChange={onChange} className="sr-only" id={id} />
        <label
          htmlFor={id}
          className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-400 text-[10px]
            px-2.5 py-1.5 cursor-pointer hover:border-zinc-600 transition-colors duration-150
            uppercase tracking-[0.08em] truncate"
        >
          {value.toUpperCase()}
        </label>
      </div>
    </div>
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

export default function GlassControls({ settings, onSettingChange, modelStatus }) {
  const handle     = (key) => (e) => onSettingChange(key, Number(e.target.value))
  const handleBool = (key) => (e) => onSettingChange(key, e.target.checked)
  const handleStr  = (key) => (e) => onSettingChange(key, e.target.value)

  const {
    size            = 40,
    complexity      = 30,
    contrast        = 50,
    shininess       = 60,
    speed           = 0,
    enableColorRamp = false,
    shadowColor     = '#000033',
    peakColor       = '#FF00FF',
    showOriginal    = false,
    aiSegmentation  = false,
  } = settings

  const aiLabel = modelStatus === 'loading'
    ? 'AI Person Detection  (loading…)'
    : modelStatus === 'error'
    ? 'AI Person Detection  (unavailable)'
    : 'AI Person Detection'

  return (
    <div className="border-t border-zinc-800/80 bg-zinc-900/60">
      <div className="px-5 py-3 border-b border-zinc-800/50">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Displacement Glass
        </span>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">

        <Divider label="Displacement" />

        <SliderInput label="Size"        min={1}  max={100} value={size}       onChange={handle('size')} />
        <SliderInput label="Complexity"  min={1}  max={100} value={complexity} onChange={handle('complexity')} />

        <Divider label="Specular" />

        <SliderInput label="Contrast"    min={0}  max={100} value={contrast}   onChange={handle('contrast')} />
        <SliderInput label="Shininess"   min={0}  max={100} value={shininess}  onChange={handle('shininess')} />

        <Divider label="Animation" />

        <SliderInput label="Speed"       min={0}  max={100} value={speed}      onChange={handle('speed')} />
        {speed === 0 && (
          <p className="text-[9px] text-zinc-700 -mt-2 leading-relaxed">
            Set speed &gt; 0 to animate
          </p>
        )}

        <Divider label="Colour" />

        <ToggleInput
          label="Enable Color Ramp"
          checked={enableColorRamp}
          onChange={handleBool('enableColorRamp')}
        />

        {enableColorRamp && (
          <>
            <ColorInput label="Shadows"   value={shadowColor} onChange={handleStr('shadowColor')} id="glass-shadow" />
            <ColorInput label="Highlights" value={peakColor}  onChange={handleStr('peakColor')}   id="glass-peak"   />
          </>
        )}

        <Divider label="Compositing" />

        <div className="flex flex-col gap-3">
          <ToggleInput
            label="Show Original Image"
            checked={showOriginal}
            onChange={handleBool('showOriginal')}
          />
          <ToggleInput
            label={aiLabel}
            checked={aiSegmentation}
            onChange={handleBool('aiSegmentation')}
            disabled={modelStatus === 'error'}
          />
        </div>

      </div>
    </div>
  )
}
