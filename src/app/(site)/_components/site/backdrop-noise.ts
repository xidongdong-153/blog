/** 生成随机 32 位正整数种子；加密随机源不可用时退回 Math.random。 */
export function createBackdropSeed(): number {
  try {
    return window.crypto.getRandomValues(new Uint32Array(1))[0]
  } catch {
    return Math.floor(Math.random() * 4294967296)
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** 基于 Mulberry32 的可复现伪随机数生成器，返回 [0, 1) 浮点序列。 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 二维整数格点哈希，返回 [0, 1] 分布值。 */
export function hash2d(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 144269)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

/** 二维平滑插值噪声，返回 [0, 1]。 */
export function noise2d(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  let fx = x - ix
  let fy = y - iy
  fx = fx * fx * (3 - 2 * fx)
  fy = fy * fy * (3 - 2 * fy)
  const a = hash2d(ix, iy, seed)
  const b = hash2d(ix + 1, iy, seed)
  const c = hash2d(ix, iy + 1, seed)
  const d = hash2d(ix + 1, iy + 1, seed)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

/**
 * 多八度分形布朗运动（fBm），在八度间引入旋转矩阵消除晶格对齐纹理。
 */
export function fbm2d(x: number, y: number, seed: number, octaves = 4): number {
  let sum = 0
  let amp = 0.5
  let norm = 0
  let px = x
  let py = y

  for (let i = 0; i < octaves; i += 1) {
    sum += amp * noise2d(px, py, seed + i * 1013)
    norm += amp
    amp *= 0.5
    const nx = px * 1.6 - py * 1.2 + 13.7
    const ny = px * 1.2 + py * 1.6 + 7.9
    px = nx
    py = ny
  }

  return norm > 0 ? sum / norm : 0
}
