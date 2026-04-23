// ── Internal helpers ──────────────────────────────────────────────────────────

function inMask(x, y, cw, ch, seg) {
  const mx = Math.min(seg.width  - 1, Math.floor((x / cw) * seg.width))
  const my = Math.min(seg.height - 1, Math.floor((y / ch) * seg.height))
  return seg.data[my * seg.width + mx] === 1
}

// ── Pass 1: neural connection lines ──────────────────────────────────────────

function drawConnections(ctx, trackers, color, t, personSeg, connectionWidth) {
  if (trackers.length < 2) return

  const cw   = ctx.canvas.width
  const ch   = ctx.canvas.height
  const diag = Math.sqrt(cw * cw + ch * ch)

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth   = connectionWidth

  // Full mesh: every unique pair gets a line, opacity driven by distance.
  // ~25 % of pairs are flagged as "long-range" via a deterministic per-pair
  // hash — they stay faint regardless of distance, giving the scattered
  // cross-network lines that make it read as a complex graph.
  for (let i = 0; i < trackers.length; i++) {
    for (let j = i + 1; j < trackers.length; j++) {
      const a = trackers[i]
      const b = trackers[j]

      if (personSeg) {
        if (!inMask(a.x, a.y, cw, ch, personSeg)) continue
        if (!inMask(b.x, b.y, cw, ch, personSeg)) continue
      }

      const dx   = b.x - a.x
      const dy   = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Stable per-pair value in [0, 1) — no time term so it never flickers
      const pairHash = ((a.wobbleSeed ?? 0) * 0.0137 + (b.wobbleSeed ?? 0) * 0.0371) % 1

      let alpha
      if (pairHash > 0.75) {
        // Long-range connection: faint flat line regardless of distance
        alpha = 0.20 + (pairHash - 0.75) * 0.40   // 0.20 – 0.30
      } else {
        // Local connection: bright when close, fades exponentially with distance
        alpha = Math.exp(-(dist / diag) * 5.5) * 1.0 * (0.65 + pairHash * 0.35)
      }

      if (alpha < 0.02) continue

      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }

  ctx.globalAlpha = 1
  ctx.restore()
}

// ── Pass 2a: circle tracker ───────────────────────────────────────────────────

function drawCircleTracker(ctx, tracker, color, t) {
  // Wobble uses animTime — stops when speed = 0
  const wobble = Math.sin(t * 5 + (tracker.wobbleSeed ?? 0)) * 2
  const r      = Math.max(4, (tracker.radius ?? 30) + wobble)

  ctx.save()
  ctx.translate(tracker.x, tracker.y)
  ctx.strokeStyle = color
  ctx.fillStyle   = color
  ctx.lineWidth   = 1.5

  // Main circle — dash offset uses animTime directly, so speed slider controls rate
  if (tracker.style === 'dashed') {
    const seg = r * 0.35
    ctx.setLineDash([seg, seg * 0.5])
    ctx.lineDashOffset = 0
  } else if (tracker.style === 'dotted') {
    ctx.setLineDash([2, r * 0.18])
    ctx.lineDashOffset = 0
  } else {
    ctx.setLineDash([])
  }
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // Counter-rotating outer ring (solid only)
  if (tracker.style === 'solid') {
    ctx.lineWidth   = 0.75
    ctx.globalAlpha = 0.4
    const seg = r * 0.25
    ctx.setLineDash([seg, seg * 1.5])
    ctx.lineDashOffset = 0
    ctx.beginPath()
    ctx.arc(0, 0, r + 9, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
    ctx.lineWidth   = 1.5
  }

  // Outer tick marks at cardinal points (conditional)
  if (tracker.showOuterMarkers) {
    const tickLen = Math.max(5, Math.min(10, r * 0.12))
    const gap     = 3
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI * 0.5 + (tracker.rotation ?? 0)
      ctx.save()
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(0, r + gap)
      ctx.lineTo(0, r + gap + tickLen)
      ctx.stroke()
      ctx.restore()
    }
  }

  // 45° arc notches (always shown)
  ctx.globalAlpha = 0.45
  ctx.lineWidth   = 1
  const span = 0.11
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI * 0.5 + Math.PI * 0.25 + (tracker.rotation ?? 0)
    ctx.beginPath()
    ctx.arc(0, 0, r, angle - span, angle + span)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.lineWidth   = 1.5

  // Center crosshair — extends past circle edge (conditional)
  if (tracker.showCenterCross) {
    const cl = r + 8
    ctx.lineWidth   = 1
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.moveTo(-cl, 0); ctx.lineTo(cl, 0)
    ctx.moveTo(0, -cl); ctx.lineTo(0, cl)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.lineWidth   = 1.5
  }

  // Center dot
  ctx.beginPath()
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

// ── Pass 2b: box tracker ──────────────────────────────────────────────────────

function drawBoxTracker(ctx, tracker, color) {
  const { x1, y1, x2, y2 } = tracker
  const w    = x2 - x1
  const h    = y2 - y1
  const bLen = Math.max(8, Math.min(16, w * 0.15, h * 0.15))

  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle   = color

  // Faint full rectangle outline
  ctx.lineWidth   = 1
  ctx.globalAlpha = 0.3
  ctx.strokeRect(x1, y1, w, h)

  // Bold corner brackets
  ctx.lineWidth   = 2
  ctx.globalAlpha = 1
  const corners = [
    [x1, y1,  1,  1],
    [x2, y1, -1,  1],
    [x1, y2,  1, -1],
    [x2, y2, -1, -1],
  ]
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath()
    ctx.moveTo(cx, cy + dy * bLen)
    ctx.lineTo(cx, cy)
    ctx.lineTo(cx + dx * bLen, cy)
    ctx.stroke()
  }

  ctx.restore()
}

// ── Pass 3: data labels ───────────────────────────────────────────────────────

function drawLabel(ctx, tracker, color, t) {
  const isBox  = tracker.type === 'box'
  const num    = String(tracker.trackNum ?? 1).padStart(3, '0')
  const prefix = isBox ? 'BOX' : 'TRK'

  // Multi-frequency oscillation → glitchy "live" readout, driven by animTime
  const cs   = tracker.confSeed ?? 0
  const conf = (tracker.confBase ?? 0.85)
    + Math.sin(t * 1.7  + cs)        * 0.020
    + Math.sin(t * 5.3  + cs * 1.3)  * 0.008
    + Math.sin(t * 17.1 + cs * 0.7)  * 0.003
  const confStr = Math.min(0.99999, Math.max(0, conf)).toFixed(5)

  const lines = isBox
    ? [`${prefix}_${num}`, `VAL:${confStr}`, `[${Math.round(tracker.x1)},${Math.round(tracker.y1)}]`]
    : [`${prefix}_${num}`, `VAL:${confStr}`, `[${Math.round(tracker.x)},${Math.round(tracker.y)}]`]

  const r  = isBox ? 0 : (tracker.radius ?? 30)
  const lx = isBox ? tracker.x1 + 6  : tracker.x + r + 10
  const ly = isBox ? tracker.y1 + 13 : tracker.y - 11

  ctx.save()
  ctx.font        = '10px "Courier New", Courier, monospace'
  ctx.fillStyle   = color
  ctx.globalAlpha = 0.8
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], lx, ly + i * 10)
  }
  ctx.restore()
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Render all FUI tracking overlays.
 *
 * `animTime` must be accumulated by the caller using delta-time × speed so the
 * rotation rate responds correctly to the speed slider without position jumps.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} trackers
 * @param {{ color:string, personSeg:object|null, animTime:number }} settings
 */
export function renderTracking(ctx, trackers, settings) {
  if (!trackers || !trackers.length) return

  const { color = '#00ff88', personSeg = null, animTime = 0, connectionWidth = 1.5 } = settings
  const t = animTime

  drawConnections(ctx, trackers, color, t, personSeg, connectionWidth)

  for (const tracker of trackers) {
    if (tracker.type === 'box') {
      drawBoxTracker(ctx, tracker, color)
    } else {
      drawCircleTracker(ctx, tracker, color, t)
    }
    drawLabel(ctx, tracker, color, t)
  }
}
