export function random(seed: string, key: string) {
  let h = 2166136261
  for (const c of seed + '|' + key) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}
export function weighted(weights: number[], r: number) {
  let at = r * weights.reduce((a, b) => a + b, 0)
  return weights.findIndex((w) => (at -= w) < 0)
}
