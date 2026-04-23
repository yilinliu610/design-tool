// ─── Character ramp ──────────────────────────────────────────────────────────
//
// 69-character ramp ordered dense→sparse (darkest perceived → lightest).
// Derived from Paul Bourke's canonical ASCII art set, reversed so index 0 is
// the heaviest glyph and the last index is a plain space.
const FULL_CHARSET = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,.\"^' "

/**
 * Build an n-character subset of FULL_CHARSET by sampling it at even intervals.
 * density 1–100 → 2–69 characters, always preserving both end-points so the
 * full tonal range (darkest char at index 0, space at the last index) is retained.
 */
function getCharset(density) {
  const total = FULL_CHARSET.length                           // 69
  const n     = Math.max(2, Math.round((density / 100) * total))
  if (n >= total) return FULL_CHARSET
  const out = []
  for (let i = 0; i < n; i++) {
    out.push(FULL_CHARSET[Math.round(i * (total - 1) / (n - 1))])
  }
  return out.join('')
}

// ─── Filter helpers (operate directly on a Uint8ClampedArray in RGBA order) ───

/**
 * Levels: remap input range [blackPoint, whitePoint] → [0, 255].
 * Uses a 256-entry LUT so the per-pixel cost is one array lookup per channel.
 */
function applyLevels(data, blackPoint, whitePoint) {
  const bp    = Math.max(0, Math.min(254, blackPoint))
  const wp    = Math.max(bp + 1, Math.min(255, whitePoint))
  const scale = 255 / (wp - bp)
  const lut   = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.min(255, Math.max(0, ((i - bp) * scale) | 0))
  }
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = lut[data[i]]
    data[i + 1] = lut[data[i + 1]]
    data[i + 2] = lut[data[i + 2]]
    // alpha (i+3) untouched
  }
}

/**
 * Gamma: output = input ^ (1 / gamma).
 * LUT-based; O(n) with a single table lookup per channel per pixel.
 */
function applyGamma(data, gamma) {
  if (gamma === 1) return
  const exp = 1 / Math.max(0.01, gamma)
  const lut = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(255 * Math.pow(i / 255, exp))
  }
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = lut[data[i]]
    data[i + 1] = lut[data[i + 1]]
    data[i + 2] = lut[data[i + 2]]
  }
}

/**
 * Box blur: separable two-pass (horizontal → vertical) with a sliding-window
 * accumulator so cost is O(width × height) regardless of radius.
 *
 * Works only on R, G, B channels; alpha is left unchanged.
 *
 * Each cell in the work canvas is SCALE (4) pixels wide/tall, so:
 *   radius = slider value (0–20) → 0–5 cell-widths of softening.
 */
function applyBoxBlur(data, width, height, radius) {
  const r = Math.round(radius)
  if (r < 1) return

  const tmp    = new Uint8ClampedArray(data.length)
  const kernel = 2 * r + 1

  // ── Horizontal pass: data → tmp ──────────────────────────────────────────
  for (let y = 0; y < height; y++) {
    const rowOff = y * width
    for (let ch = 0; ch < 3; ch++) {
      let sum = 0
      // Seed the window for x = 0, clamping left edge.
      for (let k = -r; k <= r; k++) {
        sum += data[(rowOff + Math.max(0, Math.min(width - 1, k))) * 4 + ch]
      }
      for (let x = 0; x < width; x++) {
        tmp[(rowOff + x) * 4 + ch] = (sum / kernel) | 0
        // Slide: remove left sample, add right sample (both edge-clamped).
        sum -= data[(rowOff + Math.max(0,         x - r    )) * 4 + ch]
        sum += data[(rowOff + Math.min(width - 1, x + r + 1)) * 4 + ch]
      }
    }
  }

  // ── Vertical pass: tmp → data ─────────────────────────────────────────────
  for (let x = 0; x < width; x++) {
    for (let ch = 0; ch < 3; ch++) {
      let sum = 0
      for (let k = -r; k <= r; k++) {
        sum += tmp[(Math.max(0, Math.min(height - 1, k)) * width + x) * 4 + ch]
      }
      for (let y = 0; y < height; y++) {
        data[(y * width + x) * 4 + ch] = (sum / kernel) | 0
        sum -= tmp[(Math.max(0,          y - r    ) * width + x) * 4 + ch]
        sum += tmp[(Math.min(height - 1, y + r + 1) * width + x) * 4 + ch]
      }
    }
  }
}

/**
 * Grain: applied at sample resolution (cols × rows) so every unit of noise
 * directly shifts the luminance of exactly one ASCII cell.
 * amount 0-100 → ± 0-76 per channel (luminous range stays visible).
 */
function applyGrain(data, amount) {
  if (amount <= 0) return
  const half = amount * 0.76        // maps 100 → ±76 (~30% of 255)
  for (let i = 0; i < data.length; i += 4) {
    const n    = (Math.random() - 0.5) * 2 * half
    data[i]     = Math.min(255, Math.max(0, data[i]     + n)) | 0
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n)) | 0
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n)) | 0
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Render an ASCII representation of `img` onto `outputCanvas`.
 *
 * @param {HTMLImageElement}   img
 * @param {HTMLCanvasElement}  outputCanvas
 * @param {{
 *   columns:            number,
 *   rows:               number,
 *   color:              string,
 *   density:            number,   // 1–100
 *   blur:               number,   // 0–20
 *   grain:              number,   // 0–100
 *   gamma:              number,   // 0.1–3.0
 *   blackPoint:         number,   // 0–255
 *   whitePoint:         number,   // 0–255
 *   showOriginalBg:     boolean,  // draw original image as base layer
 *   aiSegmentation:     boolean,  // mask ASCII to person pixels only
 *   personSegmentation: {data:Uint8Array,width:number,height:number}|null,
 * }} opts
 */
export async function renderAscii(img, outputCanvas, {
  columns, rows, color,
  density = 50, blur = 0, grain = 0, gamma = 1, blackPoint = 0, whitePoint = 255,
  showOriginalBg = false, aiSegmentation = false, personSegmentation = null,
}) {
  const cols    = Math.max(1, Math.round(columns))
  const numRows = Math.max(1, Math.round(rows))

  // ── 1. Draw to 4× work canvas ─────────────────────────────────────────────
  // Each ASCII cell = SCALE × SCALE pixels — gives blur sub-cell resolution.
  const SCALE  = 4
  const workW  = cols * SCALE
  const workH  = numRows * SCALE

  const work   = document.createElement('canvas')
  work.width   = workW
  work.height  = workH
  const wCtx   = work.getContext('2d', { willReadFrequently: true })
  wCtx.drawImage(img, 0, 0, workW, workH)

  // ── 2. Pixel-level filters on work canvas ImageData ───────────────────────
  const workID = wCtx.getImageData(0, 0, workW, workH)
  const wd     = workID.data

  if (blackPoint !== 0 || whitePoint !== 255) applyLevels(wd, blackPoint, whitePoint)
  if (gamma !== 1)                            applyGamma(wd, gamma)
  if (blur  >  0)                             applyBoxBlur(wd, workW, workH, blur)

  wCtx.putImageData(workID, 0, 0)

  // ── 3. Downsample to grid resolution + grain ──────────────────────────────
  const sample   = document.createElement('canvas')
  sample.width   = cols
  sample.height  = numRows
  const sCtx     = sample.getContext('2d', { willReadFrequently: true })
  sCtx.drawImage(work, 0, 0, cols, numRows)

  const sampleID = sCtx.getImageData(0, 0, cols, numRows)
  const sd       = sampleID.data

  if (grain > 0) applyGrain(sd, grain)

  // ── 4. Size output canvas to its CSS container ────────────────────────────
  const rect = outputCanvas.getBoundingClientRect()
  const cvW  = Math.round(rect.width)  || 800
  const cvH  = Math.round(rect.height) || 600
  // Assigning width/height clears the canvas and resets all context state.
  outputCanvas.width  = cvW
  outputCanvas.height = cvH

  const cellW    = cvW / cols
  const cellH    = cvH / numRows
  const fontSize = Math.max(4, Math.floor(cellH * 0.9))
  const ctx      = outputCanvas.getContext('2d')

  // ── 5. Draw base layer ─────────────────────────────────────────────────────
  // "Show Original (Background)" → paint the source photo first so ASCII chars
  // composite on top.  Off → plain dark fill so chars glow against black.
  if (showOriginalBg) {
    ctx.drawImage(img, 0, 0, cvW, cvH)
  } else {
    ctx.fillStyle = '#09090b'   // zinc-950
    ctx.fillRect(0, 0, cvW, cvH)
  }

  // ── 6. Build AI person mask at grid resolution ────────────────────────────
  let maskData = null

  if (aiSegmentation && personSegmentation) {
    const seg     = personSegmentation
    const rawMask = new ImageData(seg.width, seg.height)
    for (let i = 0; i < seg.data.length; i++) {
      const v = seg.data[i] === 1 ? 255 : 0
      rawMask.data[i * 4]     = v
      rawMask.data[i * 4 + 1] = v
      rawMask.data[i * 4 + 2] = v
      rawMask.data[i * 4 + 3] = 255
    }
    const fullCv    = document.createElement('canvas')
    fullCv.width    = seg.width
    fullCv.height   = seg.height
    fullCv.getContext('2d').putImageData(rawMask, 0, 0)

    const gridCv    = document.createElement('canvas')
    gridCv.width    = cols
    gridCv.height   = numRows
    const mCtx      = gridCv.getContext('2d', { willReadFrequently: true })
    mCtx.drawImage(fullCv, 0, 0, cols, numRows)
    maskData        = mCtx.getImageData(0, 0, cols, numRows).data
  }

  // ── 7. Draw ASCII characters ───────────────────────────────────────────────
  const charset      = getCharset(density)
  const charsetLimit = charset.length - 1

  ctx.font         = `${fontSize}px monospace`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle    = color

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < cols; col++) {
      // When mask is active, skip any cell whose centre falls outside the person.
      // Red channel of the scaled binary mask: ≥128 = person, <128 = background.
      if (maskData !== null) {
        const mi = (row * cols + col) * 4
        if (maskData[mi] < 128) continue
      }

      const i    = (row * cols + col) * 4
      const luma = 0.2126 * sd[i] + 0.7152 * sd[i + 1] + 0.0722 * sd[i + 2]
      const ci   = Math.floor((1 - luma / 255) * charsetLimit)
      ctx.fillText(charset[ci], col * cellW + cellW / 2, row * cellH + cellH / 2)
    }
  }
}
