function SliderInput({ label, min, max, value, onChange }) {
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

function ToggleInput({ label, checked, onChange }) {
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
    </label>
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

export default function NoiseControls({ settings, onSettingChange }) {
  const handle     = (key) => (e) => onSettingChange(key, Number(e.target.value))
  const handleBool = (key) => (e) => onSettingChange(key, e.target.checked)
  const { grain = 0, rowGlitch = 0, flicker = 0, aiSegmentation = false } = settings

  return (
    <div className="border-t border-zinc-800/80 bg-zinc-900/60">
      <div className="px-5 py-3 border-b border-zinc-800/50">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Noise Settings
        </span>
      </div>
      <div className="px-5 py-4 flex flex-col gap-4">
        <Divider label="Effects" />
        <SliderInput label="Grain"      min={0} max={100} value={grain}     onChange={handle('grain')} />
        <SliderInput label="Row Glitch" min={0} max={100} value={rowGlitch} onChange={handle('rowGlitch')} />
        <SliderInput label="Flicker"    min={0} max={100} value={flicker}   onChange={handle('flicker')} />
        <Divider label="Segmentation" />
        <ToggleInput
          label="AI Person Detection"
          checked={aiSegmentation}
          onChange={handleBool('aiSegmentation')}
        />
      </div>
    </div>
  )
}
