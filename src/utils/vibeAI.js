const SYSTEM_PROMPT = `You are a color designer specialising in gradient maps for photo editing.

Given a mood, vibe, or descriptive text, respond with ONLY a valid JSON array of 3–5 gradient color stops.
Each stop must have exactly two keys: "position" (number 0.0–1.0) and "color" (hex string e.g. "#1a0033").

Rules:
- First stop must be at position 0, last stop at position 1.
- Assign darker, richer tones to low positions (shadows) and brighter/lighter tones to high positions (highlights), unless the vibe clearly inverts this.
- Choose colors that are emotionally and visually faithful to the input — not generic.
- Output raw JSON only. No markdown fences, no explanation, no extra keys.`

/**
 * Ask Claude Haiku to generate gradient stops for a freeform vibe string.
 * Returns a Promise that resolves to an array of { position, color } objects.
 * Throws on network errors, invalid API key, or unparseable responses.
 */
export async function generateVibeGradient(input, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: input.trim() }],
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error?.message ?? `API ${response.status}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''

  // Tolerate responses wrapped in markdown code fences
  const match = text.match(/\[[\s\S]*?\]/)
  if (!match) throw new Error('No JSON array in response')

  const stops = JSON.parse(match[0])

  if (
    !Array.isArray(stops) ||
    stops.length < 2 ||
    !stops.every(s => typeof s.position === 'number' && typeof s.color === 'string')
  ) {
    throw new Error('Unexpected stop format')
  }

  return stops
}
