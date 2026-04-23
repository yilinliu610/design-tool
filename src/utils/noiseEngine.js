export function applyGrain(ctx, width, height, intensity) {
  if (intensity <= 0) return
  const count = Math.min(Math.floor(width * height * intensity * 0.001), 30000)
  for (let i = 0; i < count; i++) {
    const x = (Math.random() * width) | 0
    const y = (Math.random() * height) | 0
    const alpha = (Math.random() * 0.85).toFixed(2)
    ctx.fillStyle = Math.random() > 0.5
      ? `rgba(255,255,255,${alpha})`
      : `rgba(0,0,0,${alpha})`
    ctx.fillRect(x, y, 1, 1)
  }
}

export function applyRowGlitch(ctx, width, height, intensity) {
  if (intensity <= 0) return
  const snap = document.createElement('canvas')
  snap.width = width
  snap.height = height
  snap.getContext('2d').drawImage(ctx.canvas, 0, 0)

  const numStrips = Math.floor(intensity / 8) + 1
  for (let i = 0; i < numStrips; i++) {
    const y = (Math.random() * height) | 0
    const h = ((Math.random() * 8) | 0) + 1
    const shift = Math.round((Math.random() - 0.5) * intensity * 0.5)
    ctx.drawImage(snap, 0, y, width, h, shift, y, width, h)
  }
}
