/**
 * Apply a multi-stop gradient map to an already-rendered canvas.
 *
 * Algorithm:
 *   1. Build a 256×1 off-screen canvas using the browser's own CSS gradient
 *      renderer — this gives a perceptually-correct colour ramp for free.
 *   2. Read back the 256 RGBA pixels as a look-up table.
 *   3. For every pixel in `outputCanvas`, compute the BT.709 luminance and
 *      index into the LUT.  No per-pixel colour interpolation needed.
 *
 * @param {HTMLCanvasElement} outputCanvas  — modified in-place
 * @param {Array<{position:number, color:string}>} stops
 *   Colour stops in any order; must contain at least 2 entries.
 *   position: 0–1 (maps to luminance 0–255)
 *   color: any CSS colour string (#rrggbb, rgb(), etc.)
 */
export function renderGradientMap(outputCanvas, stops) {
  if (!stops || stops.length < 2) return

  const sorted = [...stops].sort((a, b) => a.position - b.position)

  // ── Build 256-entry LUT via a 1-pixel-tall gradient strip ─────────────────
  const strip = document.createElement('canvas')
  strip.width  = 256
  strip.height = 1
  const sCtx = strip.getContext('2d')
  const grad = sCtx.createLinearGradient(0, 0, 255, 0)
  for (const s of sorted) {
    grad.addColorStop(Math.max(0, Math.min(1, s.position)), s.color)
  }
  sCtx.fillStyle = grad
  sCtx.fillRect(0, 0, 256, 1)
  const lut = sCtx.getImageData(0, 0, 256, 1).data   // 256 × 4 bytes

  // ── Map every pixel ────────────────────────────────────────────────────────
  const w   = outputCanvas.width
  const h   = outputCanvas.height
  const ctx = outputCanvas.getContext('2d')
  const img = ctx.getImageData(0, 0, w, h)
  const d   = img.data

  for (let i = 0; i < d.length; i += 4) {
    // BT.709 luminance, rounded to integer index 0-255
    const luma = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) | 0
    const li   = luma * 4
    d[i]     = lut[li]
    d[i + 1] = lut[li + 1]
    d[i + 2] = lut[li + 2]
    // alpha left unchanged
  }

  ctx.putImageData(img, 0, 0)
}
