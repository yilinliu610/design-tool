// ── Noise ─────────────────────────────────────────────────────────────────────

function hash(ix, iy) {
  let n = (Math.imul(ix | 0, 1619) + Math.imul(iy | 0, 31337)) | 0
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b)
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b)
  return (n ^ (n >>> 16)) >>> 0
}

function valueNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix,     iy    ) / 4294967295
  const b = hash(ix + 1, iy    ) / 4294967295
  const c = hash(ix,     iy + 1) / 4294967295
  const d = hash(ix + 1, iy + 1) / 4294967295
  return a + (b - a) * ux + (c - a) * uy + (d - b - c + a) * ux * uy
}

// ── Chrome matcap (same visual design, stored as raw pixel bytes) ─────────────

function buildChromeMatcap() {
  const size = 256
  const cv   = document.createElement('canvas')
  cv.width   = cv.height = size
  const ctx  = cv.getContext('2d')
  const cx   = size / 2, cy = size / 2, r = size / 2

  ctx.fillStyle = '#0a0c10'
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

  const band = ctx.createLinearGradient(0, 0, size, 0)
  band.addColorStop(0.00, 'rgba(2,4,7,0)')
  band.addColorStop(0.15, 'rgba(18,26,34,0.8)')
  band.addColorStop(0.30, 'rgba(55,75,90,0.9)')
  band.addColorStop(0.43, 'rgba(130,165,185,1)')
  band.addColorStop(0.50, 'rgba(230,248,255,1)')
  band.addColorStop(0.58, 'rgba(120,155,175,1)')
  band.addColorStop(0.70, 'rgba(30,45,58,0.9)')
  band.addColorStop(0.85, 'rgba(10,16,22,0.8)')
  band.addColorStop(1.00, 'rgba(2,4,7,0)')
  ctx.fillStyle = band
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

  const hs = ctx.createRadialGradient(cx * 0.62, cy * 0.45, 0, cx * 0.62, cy * 0.45, r * 0.55)
  hs.addColorStop(0.00, 'rgba(255,255,255,0.98)')
  hs.addColorStop(0.08, 'rgba(240,250,255,0.90)')
  hs.addColorStop(0.22, 'rgba(200,230,245,0.60)')
  hs.addColorStop(0.50, 'rgba(140,185,210,0.20)')
  hs.addColorStop(1.00, 'rgba(0,0,0,0)')
  ctx.fillStyle = hs
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

  const env = ctx.createRadialGradient(cx, cy * 1.7, 0, cx, cy * 1.4, r * 0.9)
  env.addColorStop(0.00, 'rgba(30,80,110,0.55)')
  env.addColorStop(0.50, 'rgba(10,35,55,0.25)')
  env.addColorStop(1.00, 'rgba(0,0,0,0)')
  ctx.fillStyle = env
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

  const floor = ctx.createLinearGradient(0, size * 0.78, 0, size)
  floor.addColorStop(0.0, 'rgba(0,0,0,0)')
  floor.addColorStop(0.4, 'rgba(45,65,80,0.40)')
  floor.addColorStop(0.7, 'rgba(80,110,130,0.55)')
  floor.addColorStop(1.0, 'rgba(20,35,50,0.30)')
  ctx.fillStyle = floor
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

  const edge = ctx.createRadialGradient(cx, cy, r * 0.60, cx, cy, r)
  edge.addColorStop(0.0, 'rgba(0,0,0,0)')
  edge.addColorStop(0.8, 'rgba(0,0,0,0.25)')
  edge.addColorStop(1.0, 'rgba(0,0,0,0.80)')
  ctx.fillStyle = edge
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

  // Clip to circle. Must use a solid fill here — leaving fillStyle as the
  // vignette gradient (alpha=0 at centre) would zero out the matcap centre
  // via premultiplied alpha, making every front-facing normal return black.
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
  ctx.globalCompositeOperation = 'source-over'

  return ctx.getImageData(0, 0, size, size)
}

// ── Background gradient presets ───────────────────────────────────────────────

const BG = {
  teal:   [[4,21,32],   [5,59,96],  [2,13,24]],
  navy:   [[3,5,16],   [12,18,48],  [2,3,10]],
  black:  [[0,0,0],    [17,17,20],  [0,0,0]],
  purple: [[7,2,15],   [32,8,64],   [4,1,8]],
}

// Returns [r,g,b] for vertical position t ∈ [0,1]
function bgAt(t, preset) {
  const cols = BG[preset] ?? BG.teal
  const [r0,g0,b0] = cols[0]
  const [r1,g1,b1] = cols[1]
  const [r2,g2,b2] = cols[2]
  if (t < 0.4) {
    const s = t / 0.4
    return [r0+(r1-r0)*s, g0+(g1-g0)*s, b0+(b1-b0)*s]
  }
  const s = (t - 0.4) / 0.6
  return [r1+(r2-r1)*s, g1+(g2-g1)*s, b1+(b2-b1)*s]
}

// ── Separable box blur (3 passes ≈ Gaussian) ─────────────────────────────────
// ctx.filter blur is display-only in some browsers and doesn't affect
// getImageData, so we blur the float heightmap in JS instead.

function boxBlur1D(src, dst, W, H, radius, horizontal) {
  const r   = Math.max(1, radius | 0)
  const len = horizontal ? W : H
  const hop = horizontal ? 1 : W

  for (let line = 0; line < (horizontal ? H : W); line++) {
    const base = horizontal ? line * W : line
    let   sum  = 0
    // Prime the window
    for (let i = 0; i < r; i++) sum += src[base + Math.min(i, len - 1) * hop]
    for (let i = 0; i < len; i++) {
      const add = base + Math.min(i + r,     len - 1) * hop
      const sub = base + Math.max(i - r - 1, 0)       * hop
      sum += src[add] - src[sub]
      dst[base + i * hop] = sum / (2 * r + 1)
    }
  }
}

function gaussianBlurHmap(hmap, W, H, sigma) {
  const r   = Math.max(1, Math.round(sigma))
  const tmp = new Float32Array(W * H)
  const out = new Float32Array(W * H)
  // 3 box-blur passes per axis approximates a Gaussian well enough
  let a = hmap, b = tmp
  for (let pass = 0; pass < 3; pass++) {
    boxBlur1D(a, b, W, H, r, true)  // horizontal
    ;[a, b] = [b, a]
  }
  for (let pass = 0; pass < 3; pass++) {
    boxBlur1D(a, b, W, H, r, false) // vertical
    ;[a, b] = [b, a]
  }
  // `a` holds the result after an even number of swaps
  out.set(a)
  return out
}

// ── Heightmap from strokes ────────────────────────────────────────────────────
// Rasterises stroke centrelines to a binary mask, then blurs to create smooth
// Gaussian bump profiles — giving each stroke a rounded, tube-like cross-section.

function buildHeightmap(strokes, W, H, srcW, srcH, brushSize) {
  const scaleX = W / srcW
  const scaleY = H / srcH

  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const c  = cv.getContext('2d')
  c.fillStyle = '#000'
  c.fillRect(0, 0, W, H)
  c.strokeStyle = '#fff'
  c.lineWidth   = 2
  c.lineCap     = 'round'
  c.lineJoin    = 'round'
  for (const stroke of strokes) {
    if (stroke.length < 2) continue
    c.beginPath()
    c.moveTo(stroke[0].x * scaleX, stroke[0].y * scaleY)
    for (let i = 1; i < stroke.length; i++) {
      c.lineTo(stroke[i].x * scaleX, stroke[i].y * scaleY)
    }
    c.stroke()
  }

  const raw  = c.getImageData(0, 0, W, H).data
  const seed = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) seed[i] = raw[i * 4] / 255

  // Sigma ≈ brushSize/2 → visible bump radius ≈ brushSize px
  return gaussianBlurHmap(seed, W, H, Math.max(2, brushSize * 0.5))
}

// ── Bilinear heightmap sample (clamped) ───────────────────────────────────────

function sampleH(hmap, W, H, x, y) {
  x = x < 0 ? 0 : x > W - 1 ? W - 1 : x
  y = y < 0 ? 0 : y > H - 1 ? H - 1 : y
  const x0 = x | 0, y0 = y | 0
  const x1 = x0 < W - 1 ? x0 + 1 : x0
  const y1 = y0 < H - 1 ? y0 + 1 : y0
  const fx = x - x0, fy = y - y0
  const a = hmap[y0 * W + x0]
  const b = hmap[y0 * W + x1]
  const c = hmap[y1 * W + x0]
  const d = hmap[y1 * W + x1]
  return a + (b - a) * fx + (c - a) * fy + (d - b - c + a) * fx * fy
}

// ── Matcap pixel lookup ───────────────────────────────────────────────────────
// nx,ny are surface normal x/y components in [-1,1].
// Standard matcap UV: u=(nx+1)/2, v=1-(ny+1)/2 (flip Y for image coords).

function sampleMatcap(mcData, nx, ny) {
  const u =      (nx + 1) * 0.5
  const v = 1  - (ny + 1) * 0.5
  const px = u < 0 ? 0 : u >= 1 ? 255 : (u * 255.5) | 0
  const py = v < 0 ? 0 : v >= 1 ? 255 : (v * 255.5) | 0
  const i  = (py * 256 + px) * 4
  return [mcData[i], mcData[i + 1], mcData[i + 2]]
}

// ── ChromeRenderer ────────────────────────────────────────────────────────────

export class ChromeRenderer {
  constructor(canvas) {
    this.canvas   = canvas
    this._matcap  = null
  }

  render(strokes, opts = {}) {
    const {
      brushSize   = 10,
      turbulence  = 0.02,
      strength    = 40,
      zSpread     = 4.0,
      loop        = 0,
      seed        = 0,
      shininess   = 120,
      bgPreset    = 'teal',
      sourceWidth,
      sourceHeight,
    } = opts

    if (!this._matcap) this._matcap = buildChromeMatcap()
    const mcData = this._matcap.data

    const canvas = this.canvas
    const W = canvas.clientWidth  || canvas.width  || 800
    const H = canvas.clientHeight || canvas.height || 600
    if (canvas.width  !== W) canvas.width  = W
    if (canvas.height !== H) canvas.height = H

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const srcW = sourceWidth  || W
    const srcH = sourceHeight || H

    const hmap = strokes.length > 0
      ? buildHeightmap(strokes, W, H, srcW, srcH, brushSize)
      : new Float32Array(W * H)

    // Peak height used to normalise the cylindrical-compensation factor.
    let peakH = 0.01
    for (let i = 0; i < hmap.length; i++) if (hmap[i] > peakH) peakH = hmap[i]

    // ── Precompute Blinn-Phong half-vectors (V = (0,0,1) toward camera) ───────
    // Primary light: upper-left, warm white
    const L1x = -0.50, L1y = 0.70, L1z = 0.50
    const PH1x = L1x, PH1y = L1y, PH1z = L1z + 1.0   // H = L + V
    const PH1l = Math.sqrt(PH1x*PH1x + PH1y*PH1y + PH1z*PH1z)
    const H1x = PH1x/PH1l, H1y = PH1y/PH1l, H1z = PH1z/PH1l

    // Secondary light: upper-right, cold blue (softer fill)
    const L2x =  0.55, L2y =  0.35, L2z = 0.75
    const PH2x = L2x, PH2y = L2y, PH2z = L2z + 1.0
    const PH2l = Math.sqrt(PH2x*PH2x + PH2y*PH2y + PH2z*PH2z)
    const H2x = PH2x/PH2l, H2y = PH2y/PH2l, H2z = PH2z/PH2l

    const sec_sh = Math.max(4, shininess * 0.35)

    const transparent = bgPreset === 'transparent'

    const output = ctx.createImageData(W, H)
    const pix    = output.data

    const loopSeed = loop * 0.1 + seed * 0.001
    const T   = turbulence
    const eps = 2.0

    for (let y = 0; y < H; y++) {
      const t = y / H
      // Skip gradient computation entirely in transparent mode (bg has no colour)
      const bgRGB = transparent ? null : bgAt(t, bgPreset)
      const br = bgRGB ? bgRGB[0] : 0
      const bg_ = bgRGB ? bgRGB[1] : 0
      const bb = bgRGB ? bgRGB[2] : 0

      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4

        // ── Domain warp ───────────────────────────────────────────────────────
        const dx = (valueNoise(x * T,       y * T + loopSeed) * 2 - 1) * strength
        const dy = (valueNoise(x * T + 500, y * T + loopSeed) * 2 - 1) * strength
        const sx = x + dx
        const sy = y + dy

        const h0 = sampleH(hmap, W, H, sx, sy)

        if (h0 < 0.015) {
          // Transparent mode: fully clear pixel; opaque mode: solid background
          pix[idx]     = transparent ? 0 : (br | 0)
          pix[idx + 1] = transparent ? 0 : (bg_ | 0)
          pix[idx + 2] = transparent ? 0 : (bb | 0)
          pix[idx + 3] = transparent ? 0 : 255
          continue
        }

        // ── Surface normals with cylindrical-profile compensation ─────────────
        // Raw Gaussian-bump gradients are inherently shallow (~0.05/px).
        // Dividing zSpread by √(h_normalised) converts the Gaussian profile into
        // a near-cylindrical one: edges wrap aggressively, flat tops stay flat.
        const hNorm  = Math.max(0.04, h0 / peakH)
        const zScale = zSpread / Math.sqrt(hNorm)

        const gradX = (sampleH(hmap, W, H, sx+eps, sy) - sampleH(hmap, W, H, sx-eps, sy)) / (2*eps)
        const gradY = (sampleH(hmap, W, H, sx, sy+eps) - sampleH(hmap, W, H, sx, sy-eps)) / (2*eps)

        let nx = -gradX * zScale
        let ny =  gradY * zScale   // +gradY: canvas Y-down → world Y-up flip
        let nz = 1.0
        const nlen = Math.sqrt(nx*nx + ny*ny + nz*nz)
        if (nlen > 1e-6) { nx /= nlen; ny /= nlen; nz /= nlen }

        // ── Matcap (environmental body colour, scaled to leave room for spec) ──
        const [mr, mg, mb] = sampleMatcap(mcData, nx, ny)
        const baseR = mr * 0.62, baseG = mg * 0.62, baseB = mb * 0.62

        // ── Blinn-Phong specular ──────────────────────────────────────────────
        // Primary: sharp warm-white highlight (upper-left light)
        const NdotH1 = Math.max(0, nx*H1x + ny*H1y + nz*H1z)
        const s1 = Math.pow(NdotH1, shininess)

        // Secondary: softer cool-blue fill (upper-right light)
        const NdotH2 = Math.max(0, nx*H2x + ny*H2y + nz*H2z)
        const s2 = Math.pow(NdotH2, sec_sh) * 0.55

        // When NdotH1 = 1 the pixel reaches pure #FFFFFF.
        const chrome_r = Math.min(255, baseR + s1*255 + s2*185)
        const chrome_g = Math.min(255, baseG + s1*255 + s2*225)
        const chrome_b = Math.min(255, baseB + s1*255 + s2*255)

        // ── Composite ────────────────────────────────────────────────────────
        // Transparent: fade edges via alpha, chrome colour unchanged.
        // Opaque: blend chrome over background colour.
        const blend = h0 < 0.06 ? h0 / 0.06 : 1.0
        if (transparent) {
          pix[idx]     = chrome_r | 0
          pix[idx + 1] = chrome_g | 0
          pix[idx + 2] = chrome_b | 0
          pix[idx + 3] = (blend * 255) | 0
        } else {
          pix[idx]     = (br + (chrome_r - br) * blend) | 0
          pix[idx + 1] = (bg_ + (chrome_g - bg_) * blend) | 0
          pix[idx + 2] = (bb + (chrome_b - bb) * blend) | 0
          pix[idx + 3] = 255
        }
      }
    }

    ctx.putImageData(output, 0, 0)
  }

  dispose() {
    this._matcap = null
  }
}
