// ── Hash & value noise ────────────────────────────────────────────────────────

function hash(ix, iy) {
  let n = (Math.imul(ix | 0, 1619) + Math.imul(iy | 0, 31337)) | 0
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b)
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b)
  return (n ^ (n >>> 16)) >>> 0
}

function valueNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix,        fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix,     iy)     / 4294967295
  const b = hash(ix + 1, iy)     / 4294967295
  const c = hash(ix,     iy + 1) / 4294967295
  const d = hash(ix + 1, iy + 1) / 4294967295
  return a + (b - a) * ux + (c - a) * uy + (d - b - c + a) * ux * uy
}

function fractalNoise(x, y, octaves) {
  let v = 0, amp = 1, f = 1, sum = 0
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x * f, y * f) * amp
    sum += amp; amp *= 0.5; f *= 2
  }
  return v / sum
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = (hex || '#000000').replace('#', '')
  return [parseInt(h.slice(0, 2), 16) || 0,
          parseInt(h.slice(2, 4), 16) || 0,
          parseInt(h.slice(4, 6), 16) || 0]
}

// Separable O(W×H) box blur on a Float32 single-channel map.
function blurMaskAlpha(alpha, w, h, radius) {
  const r = Math.round(radius)
  if (r < 1) return alpha
  const tmp = new Float32Array(w * h)
  const out = new Float32Array(w * h)
  const k   = 2 * r + 1

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w
    let sum = 0
    for (let j = -r; j <= r; j++) sum += alpha[row + Math.max(0, Math.min(w - 1, j))]
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / k
      sum -= alpha[row + Math.max(0,     x - r    )]
      sum += alpha[row + Math.min(w - 1, x + r + 1)]
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0
    for (let j = -r; j <= r; j++) sum += tmp[Math.max(0, Math.min(h - 1, j)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / k
      sum -= tmp[Math.max(0,     y - r    ) * w + x]
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x]
    }
  }

  return out
}

// Build a feathered alpha map at canvas resolution from a body-pix segmentation.
// Alpha 1 = person, 0 = background.  Edges are blurred for a smooth transition.
function buildMaskAlpha(personSeg, w, h) {
  const { data: segData, width: sw, height: sh } = personSeg

  // Paint binary mask (0 or 255) to a small canvas at seg resolution
  const maskCv = document.createElement('canvas')
  maskCv.width = sw; maskCv.height = sh
  const mCtx   = maskCv.getContext('2d')
  const rawImg = mCtx.createImageData(sw, sh)
  for (let i = 0; i < segData.length; i++) {
    const v = segData[i] === 1 ? 255 : 0
    rawImg.data[i * 4]     = v
    rawImg.data[i * 4 + 1] = v
    rawImg.data[i * 4 + 2] = v
    rawImg.data[i * 4 + 3] = 255
  }
  mCtx.putImageData(rawImg, 0, 0)

  // Scale up to output canvas size — bilinear drawImage gives free edge softening
  const scaledCv = document.createElement('canvas')
  scaledCv.width = w; scaledCv.height = h
  scaledCv.getContext('2d').drawImage(maskCv, 0, 0, w, h)
  const px = scaledCv.getContext('2d').getImageData(0, 0, w, h).data

  const alphaMap = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) alphaMap[i] = px[i * 4] / 255

  // Additional box-blur feathering for smooth silhouette edges (~6 px radius)
  return blurMaskAlpha(alphaMap, w, h, 6)
}

// ── Height field ──────────────────────────────────────────────────────────────

function sampleH(x, y, t, f) {
  const a = Math.sin(x * f        + y * f * 0.6  + t * 0.7)
  const b = Math.cos(x * f * 0.9  - y * f        + t * 1.1)
  const c = Math.sin((x + y) * f * 0.75 + t * 0.5) * 0.35
  const n = (fractalNoise(x * f * 0.5 + t * 0.012, y * f * 0.5, 2) * 2 - 1) * 0.28
  return (a * b + c + n) * 0.59
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Dynamic displacement-map glass filter.
 *
 * When `aiSegmentation` is true and `personSeg` is provided:
 *   - Person pixels receive the full glass / displacement effect.
 *   - Background pixels are drawn from the undistorted source.
 *   - The mask boundary is feathered so the transition is smooth.
 *
 * `showOriginal` blends the final composite 50/50 with the undistorted source
 * (for person pixels this softens the glass; background stays clean).
 *
 * @param {HTMLImageElement|HTMLCanvasElement} srcImage
 * @param {HTMLCanvasElement} outputCanvas
 * @param {{
 *   size:            number,
 *   complexity:      number,
 *   contrast:        number,
 *   shininess:       number,
 *   enableColorRamp: boolean,
 *   shadowColor:     string,
 *   peakColor:       string,
 *   showOriginal:    boolean,
 *   aiSegmentation:  boolean,
 *   personSeg:       {data:Uint8Array,width:number,height:number}|null,
 *   time:            number,
 * }} settings
 */
export function renderGlass(srcImage, outputCanvas, settings) {
  const {
    size            = 40,
    complexity      = 30,
    contrast        = 50,
    shininess       = 60,
    enableColorRamp = false,
    shadowColor     = '#000033',
    peakColor       = '#FF00FF',
    showOriginal    = false,
    aiSegmentation  = false,
    personSeg       = null,
    time            = 0,
  } = settings

  const w   = outputCanvas.width
  const h   = outputCanvas.height
  const ctx = outputCanvas.getContext('2d')

  // ── Source pixels ──────────────────────────────────────────────────────────
  const srcCv = document.createElement('canvas')
  srcCv.width = w; srcCv.height = h
  srcCv.getContext('2d').drawImage(srcImage, 0, 0, w, h)
  const src = srcCv.getContext('2d').getImageData(0, 0, w, h).data

  // ── Person mask (feathered alpha, 1 = person, 0 = background) ─────────────
  // Built only when AI segmentation is requested and a mask is available.
  const maskAlpha = (aiSegmentation && personSeg)
    ? buildMaskAlpha(personSeg, w, h)
    : null

  // ── Pre-compute height field ───────────────────────────────────────────────
  const freq = complexity * 0.003
  const hmap = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      hmap[y * w + x] = sampleH(x, y, time, freq)
    }
  }

  // ── Colour ramp + displacement constants ───────────────────────────────────
  const shadow    = hexToRgb(shadowColor)
  const peak      = hexToRgb(peakColor)
  const refFreq   = 0.09
  const rawAmp    = size * 2.5 * (refFreq / Math.max(freq, 0.005))
  const finalAmp  = Math.min(rawAmp, size * 4)
  const contMult  = 0.4 + contrast * 0.022
  const hardThresh = 0.9
  const lineWidth  = 0.08 + (1 - shininess / 100) * 0.42

  // ── Render ─────────────────────────────────────────────────────────────────
  const out = new Uint8ClampedArray(w * h * 4)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i  = y * w + x
      const oi = i * 4

      // Gradient via central differences
      const hL = hmap[y * w + Math.max(0,     x - 1)]
      const hR = hmap[y * w + Math.min(w - 1, x + 1)]
      const hU = hmap[Math.max(0,     y - 1) * w + x]
      const hD = hmap[Math.min(h - 1, y + 1) * w + x]
      const gx = (hR - hL) * 0.5
      const gy = (hD - hU) * 0.5

      // Displaced source lookup
      const dx = Math.round(gx * finalAmp)
      const dy = Math.round(gy * finalAmp)
      const sx = Math.max(0, Math.min(w - 1, x + dx))
      const sy = Math.max(0, Math.min(h - 1, y + dy))
      const si = (sy * w + sx) * 4
      let r = src[si], g2 = src[si + 1], b2 = src[si + 2]

      // Optional colour ramp
      if (enableColorRamp) {
        const luma = (r * 0.2126 + g2 * 0.7152 + b2 * 0.0722) / 255
        r  = (shadow[0] + (peak[0] - shadow[0]) * luma) | 0
        g2 = (shadow[1] + (peak[1] - shadow[1]) * luma) | 0
        b2 = (shadow[2] + (peak[2] - shadow[2]) * luma) | 0
      }

      // Hard specular highlights
      const slope    = Math.sqrt(gx * gx + gy * gy)
      const normSlope = (slope / (freq + 0.001)) * contMult
      const t_spec   = Math.max(0, Math.min(1, (normSlope - hardThresh) / lineWidth))
      const specVal  = (t_spec * (shininess / 100) * 255) | 0

      const glassR = Math.min(255, r  + specVal)
      const glassG = Math.min(255, g2 + specVal)
      const glassB = Math.min(255, b2 + specVal)

      if (maskAlpha !== null) {
        // Glass on person, original on background — feathered at the boundary.
        // alpha = 1 → person (full glass), alpha = 0 → background (pure source)
        const a = maskAlpha[i]
        out[oi]     = (glassR * a + src[oi]     * (1 - a)) | 0
        out[oi + 1] = (glassG * a + src[oi + 1] * (1 - a)) | 0
        out[oi + 2] = (glassB * a + src[oi + 2] * (1 - a)) | 0
      } else {
        out[oi]     = glassR
        out[oi + 1] = glassG
        out[oi + 2] = glassB
      }
      out[oi + 3] = 255
    }
  }

  // showOriginal: blend the whole composite 50/50 with the undistorted source.
  // Background stays clean (src blended with src = src); person glass becomes
  // semi-transparent so the subject partially shows through.
  if (showOriginal) {
    for (let i = 0; i < w * h; i++) {
      const oi = i * 4
      out[oi]     = (out[oi]     + src[oi])     >> 1
      out[oi + 1] = (out[oi + 1] + src[oi + 1]) >> 1
      out[oi + 2] = (out[oi + 2] + src[oi + 2]) >> 1
    }
  }

  ctx.putImageData(new ImageData(out, w, h), 0, 0)
}
