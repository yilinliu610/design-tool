const BG_PRESETS = [
  { key: 'teal',        label: 'Teal'   },
  { key: 'navy',        label: 'Navy'   },
  { key: 'black',       label: 'Black'  },
  { key: 'purple',      label: 'Purple' },
  { key: 'transparent', label: 'Alpha'  },
]

function Slider({ label, min, max, step, value, onChange, display }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.12em] text-zinc-500">{label}</span>
        <span className="text-[10px] tabular-nums text-zinc-400">{display ?? value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full h-px appearance-none bg-zinc-700 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
          [&::-webkit-slider-thumb]:bg-zinc-200 [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5
          [&::-moz-range-thumb]:bg-zinc-200 [&::-moz-range-thumb]:border-0"
      />
    </div>
  )
}

export default function ChromeControls({ settings, onSettingChange, onClear, strokeCount }) {
  return (
    <div className="border-t border-zinc-800/80 bg-zinc-900/60">
      <div className="px-5 py-3 border-b border-zinc-800/50">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Draw to Chrome
        </span>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">

        <Slider
          label="Brush"
          min={1} max={50} step={1}
          value={settings.brushSize}
          onChange={v => onSettingChange('brushSize', v)}
        />

        <Slider
          label="Turbulence"
          min={0.001} max={0.1} step={0.001}
          value={settings.turbulence}
          display={settings.turbulence.toFixed(3)}
          onChange={v => onSettingChange('turbulence', v)}
        />

        <Slider
          label="Strength"
          min={0} max={100} step={1}
          value={settings.strength}
          onChange={v => onSettingChange('strength', v)}
        />

        <Slider
          label="Z Spread"
          min={0.1} max={10} step={0.1}
          value={settings.zSpread}
          display={settings.zSpread.toFixed(1)}
          onChange={v => onSettingChange('zSpread', v)}
        />

        <Slider
          label="Shininess"
          min={8} max={512} step={1}
          value={settings.shininess}
          onChange={v => onSettingChange('shininess', v)}
        />

        <Slider
          label="Loop"
          min={0} max={100} step={1}
          value={settings.loop}
          onChange={v => onSettingChange('loop', v)}
        />

        <Slider
          label="Seed"
          min={0} max={1000} step={1}
          value={settings.seed}
          onChange={v => onSettingChange('seed', v)}
        />

        {/* Background */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] uppercase tracking-[0.12em] text-zinc-500">Background</span>
          <div className="flex flex-wrap gap-1.5">
            {BG_PRESETS.map(p => {
              const active = settings.bgPreset === p.key
              const isAlpha = p.key === 'transparent'
              return (
                <button
                  key={p.key}
                  onClick={() => onSettingChange('bgPreset', p.key)}
                  className={`
                    px-2.5 py-1 text-[9px] uppercase tracking-[0.1em]
                    transition-all duration-150
                    ${isAlpha ? 'border border-dashed' : 'border'}
                    ${active
                      ? 'border-zinc-300 bg-zinc-200 text-zinc-900'
                      : isAlpha
                        ? 'border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:text-zinc-300'
                        : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                    }
                  `}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Clear */}
        <div className="pt-1 border-t border-zinc-800/60">
          <button
            onClick={onClear}
            disabled={strokeCount === 0}
            className={`
              w-full py-2 border text-[10px] uppercase tracking-[0.1em]
              transition-all duration-150 mt-3
              ${strokeCount > 0
                ? 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 cursor-pointer'
                : 'border-zinc-800 text-zinc-700 cursor-not-allowed'
              }
            `}
          >
            {strokeCount > 0 ? `Clear  (${strokeCount} stroke${strokeCount !== 1 ? 's' : ''})` : 'Clear Drawing'}
          </button>
        </div>

      </div>
    </div>
  )
}
