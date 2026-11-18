interface Point {
  x: number
  y: number
}

interface RockVein {
  points: Point[]
  width: number
  kind: 'main' | 'branch' | 'short'
  phase: number
  startAt: number
  duration: number
  growMode: 'forward' | 'center'
}

interface RockParticle {
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  drag: number
  size: number
  alpha: number
  age: number
  life: number
  kind: 'mist' | 'grain'
  tone: 0 | 1 | 2
  phase: number
}

interface VeinEmitter {
  vein: RockVein
  checkpoints: number[]
  nextIdx: number
}

export interface RockScene {
  /** 推进裂纹生长时散落粉尘的物理状态，返回当前是否仍有未落定粒子。 */
  stepParticles: (dtSeconds: number, progress: number) => boolean
  /** 清空所有在场粉尘，用于直接切入静态终态。 */
  clearParticles: () => void
  /** 按归一化进度 [0, 1] 绘制单主题岩石底纹、裂纹与当前粉尘。 */
  render: (canvas: HTMLCanvasElement, dark: boolean, progress: number) => void
  /** 释放离屏材质、粉尘贴图缓存与粒子列表；静置定格后调用可回收显存。 */
  dispose: () => void
}

type ParticleRgb = readonly [number, number, number]

const ROCK_WIDTH = 1200
const ROCK_HEIGHT = 900
const RELIEF = 0.25
const VEIN_STRENGTH = 0.3
const MAX_CANVAS_PIXELS = 3_000_000
const MAX_MATERIAL_PIXELS = 800_000
const CRACK_EASE_POWER = 2.35
const INITIAL_SAMPLE_CAPACITY = 520
const MAX_LIVE_PARTICLES = 240
const LIGHT_PARTICLE_RGB: readonly [ParticleRgb, ParticleRgb, ParticleRgb] = [
  [104, 100, 88],
  [125, 120, 107],
  [152, 147, 132],
]
const DARK_PARTICLE_RGB: readonly [ParticleRgb, ParticleRgb, ParticleRgb] = [
  [163, 183, 166],
  [133, 153, 138],
  [100, 118, 105],
]

let sampleBufX = new Float64Array(INITIAL_SAMPLE_CAPACITY)
let sampleBufY = new Float64Array(INITIAL_SAMPLE_CAPACITY)
let sampleBufT = new Float64Array(INITIAL_SAMPLE_CAPACITY)

function ensureSampleCapacity(needed: number) {
  if (needed <= sampleBufX.length) return
  const nextSize = Math.max(needed, sampleBufX.length * 2)
  sampleBufX = new Float64Array(nextSize)
  sampleBufY = new Float64Array(nextSize)
  sampleBufT = new Float64Array(nextSize)
}

function easeCrack(u: number): number {
  if (u <= 0) return 0
  if (u >= 1) return 1
  return 1 - (1 - u) ** CRACK_EASE_POWER
}

function invertEaseCrack(y: number): number {
  if (y <= 0) return 0
  if (y >= 1) return 1
  return 1 - (1 - y) ** (1 / CRACK_EASE_POWER)
}

function shuffleSlots(slots: number[], random: () => number): number[] {
  const copy = [...slots]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 144269)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function noise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  let fx = x - ix
  let fy = y - iy
  fx = fx * fx * (3 - 2 * fx)
  fy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy, seed)
  const b = hash(ix + 1, iy, seed)
  const c = hash(ix, iy + 1, seed)
  const d = hash(ix + 1, iy + 1, seed)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

function fracture(start: Point, end: Point, amplitude: number, random: () => number): Point[] {
  const points = [start]
  const split = (a: Point, b: Point, depth: number, spread: number) => {
    if (depth === 0) {
      points.push(b)
      return
    }
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = Math.hypot(dx, dy) || 1
    const fraction = 0.36 + random() * 0.28
    const offset = (random() - 0.5) * spread
    const middle = {
      x: a.x + dx * fraction - (dy / length) * offset,
      y: a.y + dy * fraction + (dx / length) * offset,
    }
    split(a, middle, depth - 1, spread * 0.51)
    split(middle, b, depth - 1, spread * 0.51)
  }
  split(start, end, 8, amplitude)
  return points
}

function createVeins(seed: number): RockVein[] {
  const random = createRandom(seed + 341)
  const veins: RockVein[] = []
  const mirrored = random() < 0.5
  const flip = (point: Point): Point => ({ x: mirrored ? ROCK_WIDTH - point.x : point.x, y: point.y })
  const configurations: [Point, Point, number, number][] = [
    [
      { x: 40 + random() * 170, y: -80 },
      { x: 130 + random() * 200, y: 980 },
      100 + random() * 90,
      1.1 + random() * 1.2,
    ],
    [
      { x: 850 + random() * 180, y: -80 },
      { x: 1080 + random() * 160, y: 980 },
      100 + random() * 110,
      0.8 + random() * 1.3,
    ],
    [
      { x: 1250, y: 130 + random() * 130 },
      { x: 670 + random() * 190, y: 480 + random() * 180 },
      95 + random() * 60,
      0.7 + random() * 0.8,
    ],
  ]

  // 主裂纹按交错起裂窗口展开，分支与末梢严格等父裂纹尖端经过分叉点后再裂开。
  const mainTimings: [number, number][] = [
    [0, 0.72],
    [0.09, 0.7],
    [0.16, 0.6],
  ]

  configurations.forEach(([start, end, amplitude, width], index) => {
    const [mainStart, mainDuration] = mainTimings[index]
    const points = fracture(flip(start), flip(end), amplitude, random)
    veins.push({
      points,
      width,
      kind: 'main',
      phase: random() * 9,
      startAt: mainStart,
      duration: mainDuration,
      growMode: 'forward',
    })
    const count = index === 2 ? 2 : 3
    for (let j = 0; j < count; j++) {
      const at = Math.floor((0.15 + random() * 0.65) * (points.length - 1))
      const branchStart = points[at]
      const direction = random() < 0.5 ? -1 : 1
      const length = 70 + random() * 190
      const branchEnd = { x: branchStart.x + direction * length, y: branchStart.y + 40 + random() * 150 }
      const branch = fracture(branchStart, branchEnd, length * 0.4, random)
      const branchStartAt = mainStart + mainDuration * invertEaseCrack(at / (points.length - 1))
      const branchDuration = 0.3 + ((j + index) % 3) * 0.03
      veins.push({
        points: branch,
        width: width * (0.25 + random() * 0.25),
        kind: 'branch',
        phase: random() * 9,
        startAt: branchStartAt,
        duration: branchDuration,
        growMode: 'forward',
      })
      if (j === 1) {
        const twigStart = branch[110]
        const twigStartAt = branchStartAt + branchDuration * invertEaseCrack(110 / (branch.length - 1))
        veins.push({
          points: fracture(twigStart, { x: twigStart.x - direction * 55, y: twigStart.y + 85 }, 32, random),
          width: 0.23,
          kind: 'branch',
          phase: random() * 9,
          startAt: twigStartAt,
          duration: 0.24,
          growMode: 'forward',
        })
      }
    }
  })

  veins.push({
    points: fracture(
      flip({ x: 420 + (random() - 0.5) * 60, y: -60 }),
      flip({ x: 690 + (random() - 0.5) * 60, y: 960 }),
      65 + random() * 30,
      random,
    ),
    width: 0.35 + random() * 0.2,
    kind: 'main',
    phase: random() * 9,
    startAt: 0.06,
    duration: 0.72,
    growMode: 'forward',
  })

  const extra = createRandom(seed + 7919)
  const timingRandom = createRandom(seed + 4242)
  const columnStarts = [
    shuffleSlots([0.18, 0.36, 0.54], timingRandom),
    shuffleSlots([0.22, 0.42, 0.58], timingRandom),
    shuffleSlots([0.26, 0.46, 0.62], timingRandom),
  ]

  for (let i = 0; i < 9; i++) {
    const cx = 120 + (i % 3) * 400 + extra() * 160
    const cy = 95 + Math.floor(i / 3) * 280 + extra() * 100
    const angle = 0.35 + extra() * 2.45
    const length = 135 + extra() * 145
    const dx = Math.cos(angle) * length * 0.5
    const dy = Math.sin(angle) * length * 0.5
    const startAt = columnStarts[i % 3][Math.floor(i / 3)]
    const duration = Math.min(0.34 + timingRandom() * 0.06, 1 - startAt)
    veins.push({
      points: fracture({ x: cx - dx, y: cy - dy }, { x: cx + dx, y: cy + dy }, 45 + extra() * 55, extra),
      width: 0.65 + extra() * 0.5,
      kind: 'short',
      phase: extra() * 9,
      startAt,
      duration,
      growMode: 'center',
    })
  }
  return veins
}

function getVeinProgress(vein: RockVein, globalProgress: number): number {
  if (globalProgress >= 1) return 1
  if (globalProgress <= vein.startAt) return 0
  return easeCrack((globalProgress - vein.startAt) / vein.duration)
}

function sampleSubPath(points: Point[], startT: number, endT: number): number {
  const n = points.length - 1
  if (n <= 0 || endT - startT <= 1e-5) return 0

  ensureSampleCapacity(points.length + 2)

  if (startT <= 0 && endT >= 1) {
    const count = points.length
    for (let i = 0; i < count; i++) {
      sampleBufX[i] = points[i].x
      sampleBufY[i] = points[i].y
      sampleBufT[i] = i / n
    }
    return count
  }

  const startExact = Math.max(0, startT) * n
  const endExact = Math.min(1, endT) * n
  if (endExact - startExact <= 1e-4) return 0

  const startIdx = Math.min(n - 1, Math.floor(startExact))
  const startFrac = startExact - startIdx
  const p0 = points[startIdx]
  const p1 = points[startIdx + 1]
  let count = 0
  sampleBufX[count] = p0.x + (p1.x - p0.x) * startFrac
  sampleBufY[count] = p0.y + (p1.y - p0.y) * startFrac
  sampleBufT[count] = startT
  count++

  const firstInterior = Math.floor(startExact) + 1
  const lastInterior = Math.ceil(endExact) - 1
  for (let i = firstInterior; i <= lastInterior && count < sampleBufX.length - 1; i++) {
    sampleBufX[count] = points[i].x
    sampleBufY[count] = points[i].y
    sampleBufT[count] = i / n
    count++
  }

  if (endT >= 1) {
    sampleBufX[count] = points[n].x
    sampleBufY[count] = points[n].y
    sampleBufT[count] = 1
    count++
  } else {
    const endIdx = Math.min(n - 1, Math.floor(endExact))
    const endFrac = endExact - endIdx
    const q0 = points[endIdx]
    const q1 = points[endIdx + 1]
    sampleBufX[count] = q0.x + (q1.x - q0.x) * endFrac
    sampleBufY[count] = q0.y + (q1.y - q0.y) * endFrac
    sampleBufT[count] = endT
    count++
  }

  return count
}

function fillVeinPass(
  ctx: CanvasRenderingContext2D,
  vein: RockVein,
  count: number,
  veinProgress: number,
  startT: number,
  endT: number,
  multiplier: number,
  offset: number,
  color: string,
  alpha: number,
) {
  const settling = veinProgress < 1
  const settleBlend = veinProgress <= 0.78 ? 0 : (veinProgress - 0.78) / 0.22
  const tipSpan = vein.growMode === 'center' ? Math.min(0.08, veinProgress * 0.22) : Math.min(0.1, veinProgress * 0.35)
  const openSpan = vein.growMode === 'center' ? 0.16 : 0.18
  const spanDx = sampleBufX[count - 1] - sampleBufX[0]
  const spanDy = sampleBufY[count - 1] - sampleBufY[0]
  const spanLen = Math.hypot(spanDx, spanDy)
  const fallbackNx = spanLen > 1e-6 ? -spanDy / spanLen : 0
  const fallbackNy = spanLen > 1e-6 ? spanDx / spanLen : 1

  ctx.beginPath()
  for (let side = 0; side < 2; side++) {
    for (let j = 0; j < count; j++) {
      const i = side ? count - 1 - j : j
      const prevIdx = Math.max(0, i - 1)
      const nextIdx = Math.min(count - 1, i + 1)
      const dx = sampleBufX[nextIdx] - sampleBufX[prevIdx]
      const dy = sampleBufY[nextIdx] - sampleBufY[prevIdx]
      const length = Math.hypot(dx, dy)
      const nx = length > 1e-6 ? -dy / length : fallbackNx
      const ny = length > 1e-6 ? dx / length : fallbackNy
      const t = sampleBufT[i]
      const taper =
        vein.kind === 'short'
          ? Math.sin(t * Math.PI) ** 0.55
          : vein.kind === 'branch'
            ? (1 - t) ** 0.65
            : 0.7 + 0.3 * Math.sin(t * Math.PI)
      const variation = 0.65 + 0.2 * Math.sin(t * 42 + vein.phase) + 0.15 * Math.sin(t * 137 + vein.phase * 2)

      let growthScale = 1
      if (settling) {
        const distFromTip =
          vein.growMode === 'center' ? Math.max(0, Math.min(t - startT, endT - t)) : Math.max(0, endT - t)
        const rawTip = tipSpan > 0 ? Math.min(1, (distFromTip / tipSpan) ** 0.55) : 1
        const rawOpen = 0.55 + 0.45 * Math.min(1, distFromTip / openSpan)
        const rawScale = rawTip * rawOpen
        growthScale = rawScale + (1 - rawScale) * settleBlend
      }

      const width = vein.width * taper * variation * growthScale * multiplier
      const normal = (side ? -1 : 1) * width
      const x = sampleBufX[i] + nx * normal + offset
      const y = sampleBufY[i] + ny * normal + offset * 0.7
      if (side === 0 && j === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.globalAlpha = alpha * VEIN_STRENGTH
  ctx.fill()
}

function samplePointAt(points: Point[], t: number): { x: number; y: number; nx: number; ny: number } {
  const n = points.length - 1
  const exact = Math.max(0, Math.min(1, t)) * n
  const idx = Math.min(n - 1, Math.floor(exact))
  const frac = exact - idx
  const p0 = points[idx]
  const p1 = points[idx + 1]
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const len = Math.hypot(dx, dy)
  return {
    x: p0.x + dx * frac,
    y: p0.y + dy * frac,
    nx: len > 1e-6 ? -dy / len : 0,
    ny: len > 1e-6 ? dx / len : 1,
  }
}

function createVeinEmitters(veins: RockVein[], seed: number, initialProgress: number): VeinEmitter[] {
  return veins.map((vein, veinIndex) => {
    const rand = createRandom(seed + 9103 + veinIndex * 97)
    const count =
      vein.kind === 'main' ? (vein.width > 0.6 ? 34 : 20) : vein.kind === 'branch' ? (vein.width > 0.3 ? 7 : 4) : 5
    const minP = vein.kind === 'short' ? 0.06 : 0.02
    const maxP = vein.kind === 'short' ? 0.9 : vein.kind === 'branch' ? 0.85 : 0.98
    const checkpoints: number[] = []
    for (let i = 0; i < count; i++) {
      const base = minP + ((i + 0.25 + rand() * 0.5) / count) * (maxP - minP)
      checkpoints.push(Math.min(maxP, Math.max(minP, base)))
    }
    checkpoints.sort((a, b) => a - b)

    const initialVp = getVeinProgress(vein, initialProgress)
    let nextIdx = 0
    while (nextIdx < checkpoints.length && checkpoints[nextIdx] <= initialVp) {
      nextIdx++
    }
    return { vein, checkpoints, nextIdx }
  })
}

function createDustSprite([r, g, b]: ParticleRgb, soft: boolean): HTMLCanvasElement {
  const size = soft ? 24 : 12
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const half = size / 2
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half)
  if (soft) {
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`)
    grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, 0.52)`)
    grad.addColorStop(0.58, `rgba(${r}, ${g}, ${b}, 0.14)`)
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
  } else {
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`)
    grad.addColorStop(0.42, `rgba(${r}, ${g}, ${b}, 0.68)`)
    grad.addColorStop(0.78, `rgba(${r}, ${g}, ${b}, 0.14)`)
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
  }
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return canvas
}

function spawnDustParticle(
  x: number,
  y: number,
  nx: number,
  ny: number,
  xCompress: number,
  kind: 'mist' | 'grain',
  rand: () => number,
): RockParticle {
  const side = rand() < 0.5 ? -1 : 1
  const toneRoll = rand()
  const tone: 0 | 1 | 2 = toneRoll < 0.35 ? 0 : toneRoll < 0.72 ? 1 : 2

  if (kind === 'mist') {
    const outward = side * (8 + rand() * 18) * xCompress
    return {
      x: x + (rand() - 0.5) * 4 * xCompress,
      y: y + (rand() - 0.5) * 4,
      vx: nx * outward + (rand() - 0.5) * 26 * xCompress,
      vy: ny * outward * 0.2 - 8 + rand() * 16,
      gravity: 22 + rand() * 28,
      drag: 3.8,
      size: 2.2 + rand() * 2.4,
      alpha: 0.08 + rand() * 0.08,
      age: 0,
      life: 0.85 + rand() * 0.42,
      kind,
      tone,
      phase: rand() * Math.PI * 2,
    }
  }

  const outward = side * (6 + rand() * 18) * xCompress
  return {
    x: x + (rand() - 0.5) * 3.2 * xCompress,
    y: y + (rand() - 0.5) * 3.2,
    vx: nx * outward + (rand() - 0.5) * 28 * xCompress,
    vy: ny * outward * 0.22 - 10 + rand() * 22,
    gravity: 60 + rand() * 68,
    drag: 2.6,
    size: 0.85 + rand() * 0.9,
    alpha: 0.24 + rand() * 0.22,
    age: 0,
    life: 0.78 + rand() * 0.38,
    kind,
    tone,
    phase: rand() * Math.PI * 2,
  }
}

/**
 * 构建指定尺寸与种子的双主题岩石纹理场景，预计算矿物颗粒并支持按进度逐帧绘制裂纹与落尘粉尘。
 * 尺寸或种子无效时返回 null；调用方在动画结束或卸载时应调用 dispose 释放离屏材质。
 */
export function createRockScene(
  width: number,
  height: number,
  devicePixelRatio: number,
  seed: number,
  initialProgress = 0,
): RockScene | null {
  if (![width, height, devicePixelRatio].every(Number.isFinite) || width <= 0 || height <= 0) return null

  const lightMaterial = document.createElement('canvas')
  const darkMaterial = document.createElement('canvas')
  const lightMatCtx = lightMaterial.getContext('2d')
  const darkMatCtx = darkMaterial.getContext('2d')
  if (!lightMatCtx || !darkMatCtx) return null

  const dpr = Math.min(
    Math.max(1, devicePixelRatio),
    2,
    4096 / width,
    4096 / height,
    Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
  )
  const canvasWidth = Math.max(1, Math.floor(width * dpr))
  const canvasHeight = Math.max(1, Math.floor(height * dpr))
  const resolution = Math.min(1, Math.sqrt(MAX_MATERIAL_PIXELS / (width * height)))
  const sampleWidth = Math.max(1, Math.floor(width * resolution))
  const sampleHeight = Math.max(1, Math.floor(height * resolution))
  lightMaterial.width = darkMaterial.width = sampleWidth
  lightMaterial.height = darkMaterial.height = sampleHeight

  const scale = Math.max(width / ROCK_WIDTH, height / ROCK_HEIGHT)
  const offsetX = (ROCK_WIDTH - width / scale) / 2
  const offsetY = (ROCK_HEIGHT - height / scale) / 2
  const heights = new Float32Array(sampleWidth * sampleHeight)
  const clouds = new Float32Array(sampleWidth * sampleHeight)

  for (let y = 0; y < sampleHeight; y++) {
    const wy = y / resolution / scale + offsetY
    for (let x = 0; x < sampleWidth; x++) {
      const wx = x / resolution / scale + offsetX
      const warp = noise(wx * 0.003, wy * 0.003, seed + 1) * 75
      const u = wx + warp
      const v = wy + warp * 0.36
      const low = noise(u * 0.006, v * 0.007, seed + 2)
      const mid = noise(u * 0.023, v * 0.029, seed + 3)
      const fine = noise(u * 0.095, v * 0.11, seed + 4)
      const micro = noise(u * 0.32, v * 0.36, seed + 5)
      const ridge = Math.abs(noise((u + v * 0.24) * 0.011, v * 0.04, seed + 6) - 0.5)
      const index = y * sampleWidth + x
      clouds[index] = low * 0.65 + mid * 0.25 + ridge * 0.1
      heights[index] = low * 11 + mid * 3.9 + fine * 1.4 + micro * 0.48
    }
  }

  const lightPixels = lightMatCtx.createImageData(sampleWidth, sampleHeight)
  const darkPixels = darkMatCtx.createImageData(sampleWidth, sampleHeight)
  for (let y = 0; y < sampleHeight; y++) {
    for (let x = 0; x < sampleWidth; x++) {
      const index = y * sampleWidth + x
      const left = heights[y * sampleWidth + Math.max(0, x - 1)]
      const right = heights[y * sampleWidth + Math.min(sampleWidth - 1, x + 1)]
      const up = heights[Math.max(0, y - 1) * sampleWidth + x]
      const down = heights[Math.min(sampleHeight - 1, y + 1) * sampleWidth + x]
      const light = ((left - right) * 0.8 + (up - down) * 0.6) * 15 * resolution
      const cloud = (clouds[index] - 0.5) * 16
      const grain = (hash(x, y, seed + 19) - 0.5) * 2
      const pore = hash(x, y, seed + 22) > 0.997 ? -3 * RELIEF : 0
      const edge = 1 - Math.min(1, Math.abs(x / sampleWidth - 0.48) * 1.6)
      const value = ((light + cloud + grain) * RELIEF + pore) * (1 - edge * 0.23)
      const channel = value >= 0 ? 255 : 0
      const pixel = index * 4
      for (let c = 0; c < 3; c++) {
        lightPixels.data[pixel + c] = channel
        darkPixels.data[pixel + c] = channel
      }
      lightPixels.data[pixel + 3] = Math.min(255, (Math.abs(value) / (value >= 0 ? 20 : 235)) * 255)
      darkPixels.data[pixel + 3] = Math.min(255, ((Math.abs(value) * 0.6) / (value >= 0 ? 220 : 35)) * 255)
    }
  }

  lightMatCtx.putImageData(lightPixels, 0, 0)
  darkMatCtx.putImageData(darkPixels, 0, 0)

  const veins = createVeins(seed)
  // 窄屏竖屏下主裂纹会落入居中裁剪区外，按可见宽度向左右边缘收拢，保持线宽与桌面一致。
  const visibleWidth = width / scale
  const visibleHeight = height / scale
  const xCompress = visibleWidth < ROCK_WIDTH - 1 ? Math.min(1, Math.max(0.44, visibleWidth / ROCK_WIDTH)) : 1
  if (xCompress < 1) {
    const centerX = ROCK_WIDTH * 0.5
    for (const vein of veins) {
      for (const point of vein.points) {
        point.x = centerX + (point.x - centerX) * xCompress
      }
    }
  }

  const safeInitialProgress = Number.isFinite(initialProgress) ? Math.max(0, Math.min(1, initialProgress)) : 0
  const emitters = createVeinEmitters(veins, seed, safeInitialProgress)
  const particleRand = createRandom(seed + 13107)
  const particles: RockParticle[] = []
  const lightMistSprites = LIGHT_PARTICLE_RGB.map((rgb) => createDustSprite(rgb, true))
  const lightGrainSprites = LIGHT_PARTICLE_RGB.map((rgb) => createDustSprite(rgb, false))
  const darkMistSprites = DARK_PARTICLE_RGB.map((rgb) => createDustSprite(rgb, true))
  const darkGrainSprites = DARK_PARTICLE_RGB.map((rgb) => createDustSprite(rgb, false))
  let disposed = false

  const isVisiblePoint = (x: number, y: number) =>
    x >= offsetX - 16 && x <= offsetX + visibleWidth + 16 && y >= offsetY - 24 && y <= offsetY + visibleHeight + 16

  const pushParticleAt = (points: Point[], t: number, kind: 'mist' | 'grain') => {
    if (particles.length >= MAX_LIVE_PARTICLES) return
    const pt = samplePointAt(points, t)
    if (!isVisiblePoint(pt.x, pt.y)) return
    particles.push(spawnDustParticle(pt.x, pt.y, pt.nx, pt.ny, xCompress, kind, particleRand))
  }

  return {
    stepParticles(dtSeconds: number, progress: number) {
      if (disposed) return false
      const safeDt = Number.isFinite(dtSeconds) && dtSeconds > 0 ? Math.min(0.1, dtSeconds) : 0
      const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0

      if (safeDt > 0) {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]
          p.age += safeDt
          if (p.age >= p.life) {
            particles.splice(i, 1)
            continue
          }
          const damp = Math.exp(-p.drag * safeDt)
          p.vx *= damp
          p.vy = p.vy * damp + p.gravity * safeDt
          const swayAmp = p.kind === 'mist' ? 8.5 : 4.8
          const sway = Math.sin(p.age * 4.2 + p.phase) * swayAmp * xCompress * safeDt
          p.x += p.vx * safeDt + sway
          p.y += p.vy * safeDt
          if (p.y > offsetY + visibleHeight + 24) {
            particles.splice(i, 1)
          }
        }
      }

      if (safeProgress > 0) {
        for (const emitter of emitters) {
          const { vein, checkpoints } = emitter
          const vp = getVeinProgress(vein, safeProgress)
          while (emitter.nextIdx < checkpoints.length && checkpoints[emitter.nextIdx] <= vp) {
            const cp = checkpoints[emitter.nextIdx]
            emitter.nextIdx++
            if (vein.growMode === 'center') {
              const t = particleRand() < 0.5 ? 0.5 - 0.5 * cp : 0.5 + 0.5 * cp
              pushParticleAt(vein.points, t, 'grain')
              if (particleRand() < 0.28) {
                pushParticleAt(vein.points, t, 'mist')
              }
            } else {
              const isThickMain = vein.kind === 'main' && vein.width > 0.6
              pushParticleAt(vein.points, cp, 'grain')
              if (particleRand() < (isThickMain ? 0.6 : 0.3)) {
                pushParticleAt(vein.points, cp, 'mist')
              }
              if (isThickMain && particleRand() < 0.35) {
                pushParticleAt(vein.points, cp, 'grain')
              }
            }
          }
        }
      }

      return particles.length > 0
    },
    clearParticles() {
      particles.length = 0
    },
    render(canvas: HTMLCanvasElement, dark: boolean, progress: number) {
      if (disposed) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth
        canvas.height = canvasHeight
      }

      const safeProgress = Number.isFinite(progress) ? progress : 0
      const globalProgress = Math.max(0, Math.min(1, safeProgress))
      const surfaceAlpha = globalProgress >= 1 ? 1 : 0.35 + 0.65 * Math.min(1, globalProgress / 0.14)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      if (surfaceAlpha > 0) {
        ctx.globalAlpha = surfaceAlpha
        ctx.drawImage(dark ? darkMaterial : lightMaterial, 0, 0, canvasWidth, canvasHeight)
      }

      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, -offsetX * dpr * scale, -offsetY * dpr * scale)
      const highlightColor = dark ? '#95aa98' : '#fffef7'
      const highlightAlpha = dark ? 0.14 : 0.16
      const creviceColor = dark ? '#101a14' : '#6e6b60'
      const creviceAlpha = dark ? 0.4 : 0.6175

      for (const vein of veins) {
        const veinProgress = getVeinProgress(vein, globalProgress)
        if (veinProgress <= 0) continue

        const startT = veinProgress >= 1 ? 0 : vein.growMode === 'center' ? 0.5 - 0.5 * veinProgress : 0
        const endT = veinProgress >= 1 ? 1 : vein.growMode === 'center' ? 0.5 + 0.5 * veinProgress : veinProgress
        const count = sampleSubPath(vein.points, startT, endT)
        if (count < 2) continue

        fillVeinPass(ctx, vein, count, veinProgress, startT, endT, 0.82, 0.34, highlightColor, highlightAlpha)
        fillVeinPass(ctx, vein, count, veinProgress, startT, endT, 0.62, 0, creviceColor, creviceAlpha)
      }

      if (particles.length > 0 && globalProgress > 0) {
        const mistSprites = dark ? darkMistSprites : lightMistSprites
        const grainSprites = dark ? darkGrainSprites : lightGrainSprites
        const themeScale = dark ? 0.85 : 1
        for (const p of particles) {
          const lr = Math.min(1, p.age / p.life)
          const envelope = Math.min(1, lr / 0.08) * (1 - lr) ** 1.7
          const alpha = p.alpha * envelope * themeScale
          if (alpha <= 0.004) continue

          const sprite = p.kind === 'mist' ? mistSprites[p.tone] : grainSprites[p.tone]
          if (sprite.width <= 0 || sprite.height <= 0) continue

          const radius = p.kind === 'mist' ? p.size * (0.85 + 0.7 * lr) : p.size
          ctx.globalAlpha = alpha
          ctx.drawImage(sprite, p.x - radius, p.y - radius, radius * 2, radius * 2)
        }
      }

      ctx.globalAlpha = 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'destination-out'
      const fade = ctx.createRadialGradient(width * 0.45, height * 0.43, 0, width * 0.45, height * 0.43, width * 0.66)
      fade.addColorStop(0, `rgba(0, 0, 0, ${dark ? 0.2 : 0.24})`)
      fade.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = fade
      ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'
    },
    dispose() {
      if (disposed) return
      disposed = true
      particles.length = 0
      lightMaterial.width = lightMaterial.height = 0
      darkMaterial.width = darkMaterial.height = 0
      for (const sprite of [...lightMistSprites, ...lightGrainSprites, ...darkMistSprites, ...darkGrainSprites]) {
        sprite.width = sprite.height = 0
      }
    },
  }
}

/** 一次性静态绘制第 7 版岩石细纹；明暗共用形状，透明底保留站点底色与文章氛围光。 */
export function paintRockTexture(
  lightCanvas: HTMLCanvasElement,
  darkCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  devicePixelRatio: number,
  seed: number,
): boolean {
  const scene = createRockScene(width, height, devicePixelRatio, seed)
  if (!scene) return false
  try {
    scene.render(lightCanvas, false, 1)
    scene.render(darkCanvas, true, 1)
    return true
  } finally {
    scene.dispose()
  }
}
