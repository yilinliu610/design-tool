function dist2(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]
  return dr * dr + dg * dg + db * db
}

function kmeansInit(samples, k) {
  const chosen = [samples[Math.floor(Math.random() * samples.length)].slice()]

  while (chosen.length < k) {
    let total = 0
    const dists = samples.map(s => {
      let min = Infinity
      for (const c of chosen) { const d = dist2(s, c); if (d < min) min = d }
      total += min
      return min
    })

    let r = Math.random() * total
    let pick = samples.length - 1
    for (let i = 0; i < samples.length; i++) {
      r -= dists[i]
      if (r <= 0) { pick = i; break }
    }
    chosen.push(samples[pick].slice())
  }

  return chosen
}

// Groups pixels of imageCanvas into `regionCount` color clusters via K-means.
// Returns { labels, centroids, darkestIndex, width, height }.
//   labels       — Uint8Array of centroid index per pixel
//   centroids    — [[r,g,b], ...] rounded integer colors
//   darkestIndex — index of the lowest-luminance centroid
export function processRegions(imageCanvas, regionCount) {
  const w = imageCanvas.width
  const h = imageCanvas.height
  const raw = imageCanvas.getContext('2d').getImageData(0, 0, w, h).data
  const total = w * h

  // Subsample for K-means (~4000 representative pixels)
  const step = Math.max(1, Math.ceil(Math.sqrt(total / 4000)))
  const samples = []
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4
      samples.push([raw[i], raw[i + 1], raw[i + 2]])
    }
  }

  const k = Math.min(regionCount, samples.length)
  let centroids = kmeansInit(samples, k)

  // Iterate up to 15 rounds; stop early when no centroid moves > 0.5
  for (let iter = 0; iter < 15; iter++) {
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]) // r, g, b, count

    for (const s of samples) {
      let best = 0, bestD = Infinity
      for (let c = 0; c < k; c++) {
        const d = dist2(s, centroids[c])
        if (d < bestD) { bestD = d; best = c }
      }
      sums[best][0] += s[0]; sums[best][1] += s[1]
      sums[best][2] += s[2]; sums[best][3]++
    }

    let moved = false
    for (let c = 0; c < k; c++) {
      if (!sums[c][3]) continue
      const n = sums[c][3]
      const nr = sums[c][0] / n, ng = sums[c][1] / n, nb = sums[c][2] / n
      if (Math.abs(nr - centroids[c][0]) > 0.5 ||
          Math.abs(ng - centroids[c][1]) > 0.5 ||
          Math.abs(nb - centroids[c][2]) > 0.5) moved = true
      centroids[c] = [nr, ng, nb]
    }
    if (!moved) break
  }

  centroids = centroids.map(c => [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])])

  // Assign every pixel to its nearest centroid
  const labels = new Uint8Array(total)
  for (let i = 0; i < total; i++) {
    const pi = i * 4
    const r = raw[pi], g = raw[pi + 1], b = raw[pi + 2]
    let best = 0, bestD = Infinity
    for (let c = 0; c < k; c++) {
      const dr = r - centroids[c][0], dg = g - centroids[c][1], db = b - centroids[c][2]
      const d = dr * dr + dg * dg + db * db
      if (d < bestD) { bestD = d; best = c }
    }
    labels[i] = best
  }

  // Identify darkest centroid by luminance
  let darkestIndex = 0, minLuma = Infinity
  for (let c = 0; c < k; c++) {
    const luma = 0.299 * centroids[c][0] + 0.587 * centroids[c][1] + 0.114 * centroids[c][2]
    if (luma < minLuma) { minLuma = luma; darkestIndex = c }
  }

  return { labels, centroids, darkestIndex, width: w, height: h }
}
