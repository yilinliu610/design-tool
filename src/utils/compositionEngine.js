// CSS mix-blend-mode names → canvas globalCompositeOperation names.
// Most are identical; only 'normal' differs.
const BLEND_MAP = {
  normal:     'source-over',
  multiply:   'multiply',
  screen:     'screen',
  overlay:    'overlay',
  difference: 'difference',
  lighter:    'lighter',
}

/**
 * Renders all layers onto `ctx` in ascending zIndex order.
 *
 * Each layer must have: { dataURL, x, y, scale, zIndex, blendMode, opacity,
 *                          width?, height? }
 *
 * `fallbackSize` is used when a layer is missing explicit width/height
 * (e.g. captured before those fields were stored).
 *
 * Returns a Promise that resolves once every layer has been drawn.
 */
export function renderFinalComposition(ctx, layers, fallbackSize = { width: 0, height: 0 }) {
  const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex)

  return Promise.all(
    sorted.map(
      layer => new Promise((resolve, reject) => {
        const img = new Image()
        img.onload  = () => resolve({ img, layer })
        img.onerror = () => reject(new Error(`Failed to load layer ${layer.id}`))
        img.src = layer.dataURL
      })
    )
  ).then(items => {
    items.forEach(({ img, layer }) => {
      const w = (layer.width  || fallbackSize.width  || img.naturalWidth)  * layer.scale
      const h = (layer.height || fallbackSize.height || img.naturalHeight) * layer.scale

      ctx.save()
      ctx.globalAlpha              = layer.opacity ?? 1
      ctx.globalCompositeOperation = BLEND_MAP[layer.blendMode] ?? 'source-over'
      ctx.drawImage(img, layer.x, layer.y, w, h)
      ctx.restore()
    })
  })
}
