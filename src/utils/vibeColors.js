export const PRESETS = [
  {
    name: 'Toxic',
    stops: [
      { position: 0,    color: '#000000' },
      { position: 0.45, color: '#003300' },
      { position: 0.75, color: '#00ff00' },
      { position: 1,    color: '#ccff00' },
    ],
  },
  {
    name: 'Synthwave',
    stops: [
      { position: 0,    color: '#1a0033' },
      { position: 0.35, color: '#4400aa' },
      { position: 0.65, color: '#ff00ff' },
      { position: 1,    color: '#00ffff' },
    ],
  },
  {
    name: 'Lava',
    stops: [
      { position: 0,   color: '#000000' },
      { position: 0.3, color: '#330000' },
      { position: 0.6, color: '#ff3300' },
      { position: 1,   color: '#ffcc00' },
    ],
  },
  {
    name: 'Chrome',
    stops: [
      { position: 0,    color: '#000000' },
      { position: 0.25, color: '#000044' },
      { position: 0.5,  color: '#4477cc' },
      { position: 0.75, color: '#ffffff' },
      { position: 1,    color: '#aaccff' },
    ],
  },
  {
    name: 'Acid',
    stops: [
      { position: 0,   color: '#000000' },
      { position: 0.3, color: '#333300' },
      { position: 0.6, color: '#ccff00' },
      { position: 1,   color: '#ffffff' },
    ],
  },
  {
    name: 'Vaporwave',
    stops: [
      { position: 0,    color: '#1a0033' },
      { position: 0.3,  color: '#cc44ff' },
      { position: 0.6,  color: '#ff66cc' },
      { position: 0.85, color: '#ffaaff' },
      { position: 1,    color: '#ffffff' },
    ],
  },
  {
    name: 'Infrared',
    stops: [
      { position: 0,    color: '#000000' },
      { position: 0.25, color: '#0000ff' },
      { position: 0.5,  color: '#ff0000' },
      { position: 0.75, color: '#ffff00' },
      { position: 1,    color: '#ffffff' },
    ],
  },
  {
    name: 'Forest',
    stops: [
      { position: 0,    color: '#000000' },
      { position: 0.35, color: '#003300' },
      { position: 0.65, color: '#1a6600' },
      { position: 1,    color: '#ccff99' },
    ],
  },
  {
    name: 'Sunset',
    stops: [
      { position: 0,    color: '#1a0033' },
      { position: 0.3,  color: '#660022' },
      { position: 0.55, color: '#ff3300' },
      { position: 0.75, color: '#ffaa00' },
      { position: 1,    color: '#ffeecc' },
    ],
  },
  {
    name: 'Neon',
    stops: [
      { position: 0,    color: '#000000' },
      { position: 0.35, color: '#001166' },
      { position: 0.65, color: '#0066ff' },
      { position: 1,    color: '#ff0099' },
    ],
  },
  {
    name: 'Midnight',
    stops: [
      { position: 0,   color: '#000000' },
      { position: 0.4, color: '#000033' },
      { position: 0.7, color: '#000099' },
      { position: 1,   color: '#3366ff' },
    ],
  },
  {
    name: 'Mono',
    stops: [
      { position: 0, color: '#000000' },
      { position: 1, color: '#ffffff' },
    ],
  },
]

// ── Keyword → preset name mapping ─────────────────────────────────────────────

const VIBE_KEYWORDS = {
  Toxic:     ['toxic', 'poison', 'nuclear', 'radioactive', 'slime', 'biohazard', 'sick'],
  Synthwave: ['synthwave', '80s', 'eighties', 'retro', 'miami', 'outrun', 'nostalgic', 'nostalgia'],
  Lava:      ['lava', 'fire', 'hot', 'flame', 'magma', 'molten', 'burn', 'volcano', 'fury'],
  Chrome:    ['chrome', 'metal', 'steel', 'silver', 'metallic', 'industrial', 'machine', 'robot'],
  Acid:      ['acid', 'psychedelic', 'trip', 'hallucinate', 'bright', 'rave', 'high', 'wild'],
  Vaporwave: ['vaporwave', 'aesthetic', 'pastel', 'dreamy', 'soft', 'chill', 'kawaii', 'lofi'],
  Infrared:  ['infrared', 'thermal', 'heatmap', 'heat map', 'scanner', 'predator', 'temperature'],
  Forest:    ['forest', 'nature', 'jungle', 'organic', 'earth', 'plant', 'growth', 'trees'],
  Sunset:    ['sunset', 'dusk', 'golden', 'warm', 'twilight', 'evening', 'golden hour'],
  Neon:      ['neon', 'electric', 'cyber', 'cyberpunk', 'glow', 'digital', 'future', 'arcade'],
  Midnight:  ['midnight', 'night', 'dark', 'deep', 'ocean', 'abyss', 'blue', 'cold'],
  Mono:      ['mono', 'monochrome', 'bw', 'black', 'white', 'minimal', 'grayscale', 'grey', 'gray', 'clean'],
}

/**
 * Find the best matching preset stops for a freeform text input.
 * Always returns stops — unrecognised text is mapped deterministically to
 * a preset so any input produces a visible result.
 */
export function findVibeGradient(input) {
  if (!input || !input.trim()) return null
  const q = input.toLowerCase().trim()

  let bestName  = null
  let bestScore = 0

  for (const [name, keywords] of Object.entries(VIBE_KEYWORDS)) {
    let score = 0
    if (q.includes(name.toLowerCase())) score += 4
    for (const kw of keywords) {
      if (q.includes(kw))    score += 2
      else if (kw.includes(q)) score += 1
    }
    if (score > bestScore) { bestScore = score; bestName = name }
  }

  // Unrecognised input: pick a preset deterministically from the string so
  // the same word always yields the same gradient (feels intentional, not random).
  if (!bestName) {
    let hash = 0
    for (let i = 0; i < q.length; i++) hash = (Math.imul(hash, 31) + q.charCodeAt(i)) | 0
    bestName = PRESETS[Math.abs(hash) % PRESETS.length].name
  }

  return PRESETS.find(p => p.name === bestName)?.stops ?? null
}
