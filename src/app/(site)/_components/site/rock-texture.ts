interface Point {
  x: number
  y: number
}

type CurveProfile =
  | { kind: 'power'; power: number }
  | { kind: 'sigmoid'; a: number; b: number }
  | {
      kind: 'stick-slip'
      power: number
      n1: number
      amp1: number
      phase1: number
      n2: number
      amp2: number
      phase2: number
    }

interface RockVein {
  points: Point[]
  cumLengths: Float64Array
  totalLength: number
  midArcRatio: number
  width: number
  kind: 'main' | 'branch' | 'short'
  phase: number
  startMs: number
  durationMs: number
  leftDurationMs: number
  rightDurationMs: number
  curve: CurveProfile
  leftCurve: CurveProfile
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
  leftCheckpoints: number[]
  rightCheckpoints: number[]
  leftNextIdx: number
  rightNextIdx: number
}

export interface RockScene {
  /** 本次裂纹入场生长的动态总时长（毫秒），随种子与各条裂纹速度随机变化。 */
  readonly totalDurationMs: number
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
const MIN_SCENE_DURATION_MS = 750
const MAX_SCENE_DURATION_MS = 3600
const SURFACE_FADE_MS = 220
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function logUniform(random: () => number, min: number, max: number): number {
  return min * (max / min) ** random()
}

function divergeBias(bias: number, peerBias: number, min: number, max: number, ratio = 1.24): number {
  if (Math.abs(bias - peerBias) / peerBias >= 0.18) return bias
  const up = peerBias * ratio
  const down = peerBias / ratio
  if (bias >= peerBias) {
    return up <= max ? up : Math.max(min, down)
  }
  return down >= min ? down : Math.min(max, up)
}

function evalCrackCurve(u: number, profile: CurveProfile): number {
  if (!Number.isFinite(u)) return u === Infinity ? 1 : 0
  if (u <= 0) return 0
  if (u >= 1) return 1

  if (profile.kind === 'power') {
    return 1 - (1 - u) ** profile.power
  }

  if (profile.kind === 'sigmoid') {
    const ua = u ** profile.a
    const vb = (1 - u) ** profile.b
    const denom = ua + vb
    return denom > 0 ? ua / denom : u
  }

  const h =
    u +
    profile.amp1 * (Math.sin(2 * Math.PI * profile.n1 * u + profile.phase1) - Math.sin(profile.phase1)) +
    profile.amp2 * (Math.sin(2 * Math.PI * profile.n2 * u + profile.phase2) - Math.sin(profile.phase2))
  const clampedH = clamp(h, 0, 1)
  return 1 - (1 - clampedH) ** profile.power
}

function invertCrackCurve(target: number, profile: CurveProfile): number {
  if (!Number.isFinite(target)) return target === Infinity ? 1 : 0
  if (target <= 0) return 0
  if (target >= 1) return 1
  if (profile.kind === 'power') {
    const exact = 1 - (1 - target) ** (1 / profile.power)
    return evalCrackCurve(exact, profile) >= target ? exact : Math.min(1, exact + 1e-9)
  }
  let lo = 0
  let hi = 1
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) * 0.5
    if (evalCrackCurve(mid, profile) < target) lo = mid
    else hi = mid
  }
  return hi
}

type CurveWeights = readonly [number, number, number, number]

function pickCurveProfile(random: () => number, [wImpact, wSteady, wCreep, wStickSlip]: CurveWeights): CurveProfile {
  const total = wImpact + wSteady + wCreep + wStickSlip
  let roll = random() * total
  if (roll < wImpact) {
    return { kind: 'power', power: 1.8 + random() * 1.3 }
  }
  roll -= wImpact
  if (roll < wSteady) {
    return { kind: 'power', power: 1.05 + random() * 0.4 }
  }
  roll -= wSteady
  if (roll < wCreep) {
    return { kind: 'sigmoid', a: 1.35 + random() * 0.85, b: 1.4 + random() * 1.1 }
  }
  const n1 = random() < 0.5 ? 2 : 3
  const n2 = n1 + 1
  const budget = 0.52 + random() * 0.16
  const split = 0.55 + random() * 0.25
  return {
    kind: 'stick-slip',
    power: 1.15 + random() * 0.65,
    n1,
    amp1: (budget * split) / (2 * Math.PI * n1),
    phase1: random() * Math.PI * 2,
    n2,
    amp2: (budget * (1 - split)) / (2 * Math.PI * n2),
    phase2: random() * Math.PI * 2,
  }
}

function computeArcLengths(points: Point[]): { cumLengths: Float64Array; totalLength: number; midArcRatio: number } {
  const cumLengths = new Float64Array(points.length)
  let total = 0
  cumLengths[0] = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    cumLengths[i] = total
  }
  const totalLength = Math.max(1e-3, total)
  const midIdx = Math.floor((points.length - 1) / 2)
  const midArcRatio = clamp(cumLengths[midIdx] / totalLength, 0.05, 0.95)
  return { cumLengths, totalLength, midArcRatio }
}

function arcRatioToIndexT(cumLengths: Float64Array, totalLength: number, s: number): number {
  if (s <= 0) return 0
  if (s >= 1) return 1
  const lastIdx = cumLengths.length - 1
  if (lastIdx <= 0) return s
  const target = s * totalLength
  let lo = 0
  let hi = lastIdx
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (cumLengths[mid] < target) lo = mid
    else hi = mid
  }
  const segLen = cumLengths[hi] - cumLengths[lo]
  const frac = segLen > 1e-6 ? clamp((target - cumLengths[lo]) / segLen, 0, 1) : 0
  return (lo + frac) / lastIdx
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

function createVeins(seed: number): { veins: RockVein[]; totalDurationMs: number } {
  const random = createRandom(seed + 341)
  const speedRand = createRandom(seed + 6151)
  const veins: RockVein[] = []
  const mirrored = random() < 0.5
  const flip = (point: Point): Point => ({ x: mirrored ? ROCK_WIDTH - point.x : point.x, y: point.y })

  // 每次打开抽样一次整体节奏基调（疾裂 / 衡裂 / 漫渗），避免 24 条裂纹独立均值回归。
  const paceRoll = speedRand()
  const sessionPace =
    paceRoll < 0.3 ? 1.65 + speedRand() * 0.65 : paceRoll < 0.7 ? 0.95 + speedRand() * 0.45 : 0.45 + speedRand() * 0.35

  const paceDelayDiv = sessionPace ** 0.6
  const rankStarts = [0, 0, 0, 0]
  rankStarts[1] = (40 + speedRand() * 140) / paceDelayDiv
  rankStarts[2] = rankStarts[1] + (60 + speedRand() * 160) / paceDelayDiv
  rankStarts[3] = rankStarts[2] + (50 + speedRand() * 150) / paceDelayDiv
  const mainRankOrder = shuffleSlots([0, 1, 2, 3], speedRand)

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

  const mainSpecs: readonly {
    baseSpeed: number
    minBias: number
    maxBias: number
    minMult: number
    maxMult: number
    weights: CurveWeights
  }[] = [
    { baseSpeed: 1150, minBias: 0.65, maxBias: 1.5, minMult: 0.42, maxMult: 3, weights: [0.45, 0, 0.2, 0.35] },
    { baseSpeed: 1100, minBias: 0.65, maxBias: 1.55, minMult: 0.42, maxMult: 3, weights: [0.4, 0.3, 0, 0.3] },
    { baseSpeed: 780, minBias: 0.58, maxBias: 1.68, minMult: 0.4, maxMult: 3, weights: [0.35, 0.35, 0.3, 0] },
  ]

  let m0Bias = 1
  let mainPhaseEndMs = 0

  configurations.forEach(([start, end, amplitude, width], index) => {
    const spec = mainSpecs[index]
    let localBias = logUniform(speedRand, spec.minBias, spec.maxBias)
    if (index === 0) m0Bias = localBias
    else if (index === 1) localBias = divergeBias(localBias, m0Bias, spec.minBias, spec.maxBias)

    const points = fracture(flip(start), flip(end), amplitude, random)
    const { cumLengths, totalLength, midArcRatio } = computeArcLengths(points)
    const effectiveMult = clamp(sessionPace * localBias, spec.minMult, spec.maxMult)
    const mainStartMs = rankStarts[mainRankOrder[index]]
    const mainDurationMs = (totalLength / (spec.baseSpeed * effectiveMult)) * 1000
    const mainCurve = pickCurveProfile(speedRand, spec.weights)
    mainPhaseEndMs = Math.max(mainPhaseEndMs, mainStartMs + mainDurationMs)

    veins.push({
      points,
      cumLengths,
      totalLength,
      midArcRatio,
      width,
      kind: 'main',
      phase: random() * 9,
      startMs: mainStartMs,
      durationMs: mainDurationMs,
      leftDurationMs: mainDurationMs,
      rightDurationMs: mainDurationMs,
      curve: mainCurve,
      leftCurve: mainCurve,
      growMode: 'forward',
    })

    const count = index === 2 ? 2 : 3
    let firstBranchBias = 1
    for (let j = 0; j < count; j++) {
      const at = Math.floor((0.15 + random() * 0.65) * (points.length - 1))
      const branchStart = points[at]
      const direction = random() < 0.5 ? -1 : 1
      const length = 70 + random() * 190
      const branchEnd = { x: branchStart.x + direction * length, y: branchStart.y + 40 + random() * 150 }
      const branch = fracture(branchStart, branchEnd, length * 0.4, random)
      const branchGeom = computeArcLengths(branch)
      const forkArcRatio = cumLengths[at] / totalLength
      const forkU = invertCrackCurve(forkArcRatio, mainCurve)
      const branchDelayMs = speedRand() < 0.65 ? 0 : 15 + speedRand() * 30
      const branchStartMs = mainStartMs + mainDurationMs * forkU + branchDelayMs

      let branchBias: number
      if (j === 1) {
        branchBias = logUniform(speedRand, 0.65, 1.5)
      } else {
        branchBias = speedRand() < 0.45 ? logUniform(speedRand, 1.15, 1.65) : logUniform(speedRand, 0.52, 0.98)
        if (j === 0) firstBranchBias = branchBias
        else branchBias = divergeBias(branchBias, firstBranchBias, 0.52, 1.65, 1.2)
      }

      const branchDurationMs = clamp((branchGeom.totalLength / (620 * branchBias * sessionPace)) * 1000, 140, 1350)
      const branchCurve = pickCurveProfile(speedRand, j === 1 ? [0.45, 0.35, 0.2, 0] : [0.5, 0.25, 0.25, 0])

      veins.push({
        points: branch,
        cumLengths: branchGeom.cumLengths,
        totalLength: branchGeom.totalLength,
        midArcRatio: branchGeom.midArcRatio,
        width: width * (0.25 + random() * 0.25),
        kind: 'branch',
        phase: random() * 9,
        startMs: branchStartMs,
        durationMs: branchDurationMs,
        leftDurationMs: branchDurationMs,
        rightDurationMs: branchDurationMs,
        curve: branchCurve,
        leftCurve: branchCurve,
        growMode: 'forward',
      })

      if (j === 1) {
        const twigIdx = Math.min(110, branch.length - 1)
        const twigStart = branch[twigIdx]
        const twigPoints = fracture(twigStart, { x: twigStart.x - direction * 55, y: twigStart.y + 85 }, 32, random)
        const twigGeom = computeArcLengths(twigPoints)
        const twigForkArcRatio = branchGeom.cumLengths[twigIdx] / branchGeom.totalLength
        const twigForkU = invertCrackCurve(twigForkArcRatio, branchCurve)
        const twigDelayMs = speedRand() < 0.6 ? 0 : 10 + speedRand() * 25
        const twigStartMs = branchStartMs + branchDurationMs * twigForkU + twigDelayMs
        const twigBias = logUniform(speedRand, 0.55, 1.75)
        const twigDurationMs = clamp((twigGeom.totalLength / (420 * twigBias * sessionPace)) * 1000, 130, 750)
        const twigCurve = pickCurveProfile(speedRand, [0.65, 0.35, 0, 0])

        veins.push({
          points: twigPoints,
          cumLengths: twigGeom.cumLengths,
          totalLength: twigGeom.totalLength,
          midArcRatio: twigGeom.midArcRatio,
          width: 0.23,
          kind: 'branch',
          phase: random() * 9,
          startMs: twigStartMs,
          durationMs: twigDurationMs,
          leftDurationMs: twigDurationMs,
          rightDurationMs: twigDurationMs,
          curve: twigCurve,
          leftCurve: twigCurve,
          growMode: 'forward',
        })
      }
    }
  })

  // 第 4 条主裂纹（中路细脉）
  const m3Points = fracture(
    flip({ x: 420 + (random() - 0.5) * 60, y: -60 }),
    flip({ x: 690 + (random() - 0.5) * 60, y: 960 }),
    65 + random() * 30,
    random,
  )
  const m3Geom = computeArcLengths(m3Points)
  const m3Bias = logUniform(speedRand, 0.52, 1.6)
  const m3Mult = clamp(sessionPace * m3Bias, 0.38, 2.8)
  const m3StartMs = rankStarts[mainRankOrder[3]]
  const m3DurationMs = (m3Geom.totalLength / (880 * m3Mult)) * 1000
  const m3Curve = pickCurveProfile(speedRand, [0, 0.25, 0.45, 0.3])
  mainPhaseEndMs = Math.max(mainPhaseEndMs, m3StartMs + m3DurationMs)

  veins.push({
    points: m3Points,
    cumLengths: m3Geom.cumLengths,
    totalLength: m3Geom.totalLength,
    midArcRatio: m3Geom.midArcRatio,
    width: 0.35 + random() * 0.2,
    kind: 'main',
    phase: random() * 9,
    startMs: m3StartMs,
    durationMs: m3DurationMs,
    leftDurationMs: m3DurationMs,
    rightDurationMs: m3DurationMs,
    curve: m3Curve,
    leftCurve: m3Curve,
    growMode: 'forward',
  })

  // 9 条短裂纹：拉丁方格错开早/中/尾波次，各条独立抽速并附带两翼微非对称速度。
  const extra = createRandom(seed + 7919)
  const rowPerm = shuffleSlots([0, 1, 2], speedRand)
  const colPerm = shuffleSlots([0, 1, 2], speedRand)
  const waveRanges: readonly [number, number][] = [
    [0.12, 0.32],
    [0.32, 0.56],
    [0.52, 0.74],
  ]
  const shortCellSpecs: Record<
    'center' | 'midCol' | 'midRow' | 'corner',
    { baseSpeed: number; minBias: number; maxBias: number; weights: CurveWeights }
  > = {
    center: { baseSpeed: 265, minBias: 0.45, maxBias: 1.75, weights: [0, 0.25, 0.5, 0.25] },
    midCol: { baseSpeed: 275, minBias: 0.48, maxBias: 1.8, weights: [0.2, 0.35, 0.45, 0] },
    midRow: { baseSpeed: 300, minBias: 0.48, maxBias: 1.95, weights: [0.35, 0.35, 0.3, 0] },
    corner: { baseSpeed: 315, minBias: 0.48, maxBias: 1.95, weights: [0.45, 0.35, 0.2, 0] },
  }

  for (let i = 0; i < 9; i++) {
    const col = i % 3
    const row = Math.floor(i / 3)
    const cx = 120 + col * 400 + extra() * 160
    const cy = 95 + row * 280 + extra() * 100
    const angle = 0.35 + extra() * 2.45
    const length = 135 + extra() * 145
    const dx = Math.cos(angle) * length * 0.5
    const dy = Math.sin(angle) * length * 0.5
    const shortPoints = fracture({ x: cx - dx, y: cy - dy }, { x: cx + dx, y: cy + dy }, 45 + extra() * 55, extra)
    const shortGeom = computeArcLengths(shortPoints)

    const wave = (rowPerm[row] + colPerm[col]) % 3
    const [wMin, wMax] = waveRanges[wave]
    const startMs = (wMin + speedRand() * (wMax - wMin)) * mainPhaseEndMs

    const cellKey = col === 1 && row === 1 ? 'center' : col === 1 ? 'midCol' : row === 1 ? 'midRow' : 'corner'
    const cellSpec = shortCellSpecs[cellKey]
    const localBias = logUniform(speedRand, cellSpec.minBias, cellSpec.maxBias)
    const shortCurve = pickCurveProfile(speedRand, cellSpec.weights)
    const leftCurve = pickCurveProfile(speedRand, cellSpec.weights)

    const leftWingBias = 0.82 + speedRand() * 0.36
    const rightWingBias = 0.82 + speedRand() * 0.36
    const baseTipSpeed = cellSpec.baseSpeed * localBias * sessionPace
    const leftArcLen = shortGeom.totalLength * shortGeom.midArcRatio
    const rightArcLen = shortGeom.totalLength * (1 - shortGeom.midArcRatio)
    const rawLeftMs = (leftArcLen / (baseTipSpeed * leftWingBias)) * 1000
    const rawRightMs = (rightArcLen / (baseTipSpeed * rightWingBias)) * 1000
    const rawMaxMs = Math.max(rawLeftMs, rawRightMs)
    const durationMs = clamp(rawMaxMs, 150, 1250)
    const ratioScale = rawMaxMs > 0 ? durationMs / rawMaxMs : 1

    veins.push({
      points: shortPoints,
      cumLengths: shortGeom.cumLengths,
      totalLength: shortGeom.totalLength,
      midArcRatio: shortGeom.midArcRatio,
      width: 0.65 + extra() * 0.5,
      kind: 'short',
      phase: extra() * 9,
      startMs,
      durationMs,
      leftDurationMs: Math.max(1, rawLeftMs * ratioScale),
      rightDurationMs: Math.max(1, rawRightMs * ratioScale),
      curve: shortCurve,
      leftCurve,
      growMode: 'center',
    })
  }

  let rawTotalMs = 0
  for (const vein of veins) {
    rawTotalMs = Math.max(rawTotalMs, vein.startMs + vein.durationMs)
  }
  const totalDurationMs = clamp(rawTotalMs, MIN_SCENE_DURATION_MS, MAX_SCENE_DURATION_MS)
  if (rawTotalMs > 0 && rawTotalMs !== totalDurationMs) {
    const timeScale = totalDurationMs / rawTotalMs
    for (const vein of veins) {
      vein.startMs *= timeScale
      vein.durationMs *= timeScale
      vein.leftDurationMs *= timeScale
      vein.rightDurationMs *= timeScale
    }
  }

  return { veins, totalDurationMs }
}

function getVeinArcProgress(vein: RockVein, elapsedMs: number): { left: number; right: number } {
  const dt = elapsedMs - vein.startMs
  if (dt <= 0) return { left: 0, right: 0 }
  if (vein.growMode === 'center') {
    return {
      left: dt >= vein.leftDurationMs ? 1 : evalCrackCurve(dt / vein.leftDurationMs, vein.leftCurve),
      right: dt >= vein.rightDurationMs ? 1 : evalCrackCurve(dt / vein.rightDurationMs, vein.curve),
    }
  }
  const right = dt >= vein.durationMs ? 1 : evalCrackCurve(dt / vein.durationMs, vein.curve)
  return { left: 1, right }
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

function computeTipGrowthScale(
  progress: number,
  distFromTip: number,
  maxTipSpan: number,
  tipRate: number,
  openSpan: number,
): number {
  if (progress >= 1) return 1
  const tipSpan = Math.min(maxTipSpan, progress * tipRate)
  const settleBlend = progress <= 0.78 ? 0 : (progress - 0.78) / 0.22
  const rawTip = tipSpan > 0 ? Math.min(1, (distFromTip / tipSpan) ** 0.55) : 1
  const rawOpen = 0.55 + 0.45 * Math.min(1, distFromTip / openSpan)
  const rawScale = rawTip * rawOpen
  return rawScale + (1 - rawScale) * settleBlend
}

function fillVeinPass(
  ctx: CanvasRenderingContext2D,
  vein: RockVein,
  count: number,
  leftProgress: number,
  rightProgress: number,
  startT: number,
  endT: number,
  multiplier: number,
  offset: number,
  color: string,
  alpha: number,
) {
  const settling = vein.growMode === 'center' ? leftProgress < 1 || rightProgress < 1 : rightProgress < 1
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
        if (vein.growMode === 'center') {
          const leftScale = computeTipGrowthScale(leftProgress, Math.max(0, t - startT), 0.08, 0.22, 0.16)
          const rightScale = computeTipGrowthScale(rightProgress, Math.max(0, endT - t), 0.08, 0.22, 0.16)
          growthScale = Math.min(leftScale, rightScale)
        } else {
          growthScale = computeTipGrowthScale(rightProgress, Math.max(0, endT - t), 0.1, 0.35, 0.18)
        }
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

function createVeinEmitters(
  veins: RockVein[],
  seed: number,
  initialProgress: number,
  totalDurationMs: number,
): VeinEmitter[] {
  const initialElapsedMs = initialProgress * totalDurationMs
  return veins.map((vein, veinIndex) => {
    const rand = createRandom(seed + 9103 + veinIndex * 97)
    const count =
      vein.kind === 'main' ? (vein.width > 0.6 ? 34 : 20) : vein.kind === 'branch' ? (vein.width > 0.3 ? 7 : 4) : 5
    const minP = vein.kind === 'short' ? 0.06 : 0.02
    const maxP = vein.kind === 'short' ? 0.9 : vein.kind === 'branch' ? 0.85 : 0.98
    const leftCheckpoints: number[] = []
    const rightCheckpoints: number[] = []
    for (let i = 0; i < count; i++) {
      const base = minP + ((i + 0.25 + rand() * 0.5) / count) * (maxP - minP)
      const cp = Math.min(maxP, Math.max(minP, base))
      if (vein.growMode === 'center' && rand() < 0.5) leftCheckpoints.push(cp)
      else rightCheckpoints.push(cp)
    }
    leftCheckpoints.sort((a, b) => a - b)
    rightCheckpoints.sort((a, b) => a - b)

    const initialState = getVeinArcProgress(vein, initialElapsedMs)
    let leftNextIdx = 0
    while (leftNextIdx < leftCheckpoints.length && leftCheckpoints[leftNextIdx] <= initialState.left) {
      leftNextIdx++
    }
    let rightNextIdx = 0
    while (rightNextIdx < rightCheckpoints.length && rightCheckpoints[rightNextIdx] <= initialState.right) {
      rightNextIdx++
    }
    return { vein, leftCheckpoints, rightCheckpoints, leftNextIdx, rightNextIdx }
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
  const safeSeed = Number.isFinite(seed) ? Math.trunc(seed) : 0

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
      const warp = noise(wx * 0.003, wy * 0.003, safeSeed + 1) * 75
      const u = wx + warp
      const v = wy + warp * 0.36
      const low = noise(u * 0.006, v * 0.007, safeSeed + 2)
      const mid = noise(u * 0.023, v * 0.029, safeSeed + 3)
      const fine = noise(u * 0.095, v * 0.11, safeSeed + 4)
      const micro = noise(u * 0.32, v * 0.36, safeSeed + 5)
      const ridge = Math.abs(noise((u + v * 0.24) * 0.011, v * 0.04, safeSeed + 6) - 0.5)
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
      const grain = (hash(x, y, safeSeed + 19) - 0.5) * 2
      const pore = hash(x, y, safeSeed + 22) > 0.997 ? -3 * RELIEF : 0
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

  const { veins, totalDurationMs } = createVeins(safeSeed)
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
  const emitters = createVeinEmitters(veins, safeSeed, safeInitialProgress, totalDurationMs)
  const particleRand = createRandom(safeSeed + 13107)
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
    totalDurationMs,
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
        const elapsedMs = safeProgress * totalDurationMs
        for (const emitter of emitters) {
          const { vein, leftCheckpoints, rightCheckpoints } = emitter
          const state = safeProgress >= 1 ? { left: 1, right: 1 } : getVeinArcProgress(vein, elapsedMs)

          while (emitter.leftNextIdx < leftCheckpoints.length && leftCheckpoints[emitter.leftNextIdx] <= state.left) {
            const cp = leftCheckpoints[emitter.leftNextIdx]
            emitter.leftNextIdx++
            const t = arcRatioToIndexT(vein.cumLengths, vein.totalLength, vein.midArcRatio * (1 - cp))
            pushParticleAt(vein.points, t, 'grain')
            if (particleRand() < 0.28) {
              pushParticleAt(vein.points, t, 'mist')
            }
          }

          while (
            emitter.rightNextIdx < rightCheckpoints.length &&
            rightCheckpoints[emitter.rightNextIdx] <= state.right
          ) {
            const cp = rightCheckpoints[emitter.rightNextIdx]
            emitter.rightNextIdx++
            if (vein.growMode === 'center') {
              const t = arcRatioToIndexT(
                vein.cumLengths,
                vein.totalLength,
                vein.midArcRatio + (1 - vein.midArcRatio) * cp,
              )
              pushParticleAt(vein.points, t, 'grain')
              if (particleRand() < 0.28) {
                pushParticleAt(vein.points, t, 'mist')
              }
            } else {
              const t = arcRatioToIndexT(vein.cumLengths, vein.totalLength, cp)
              const isThickMain = vein.kind === 'main' && vein.width > 0.6
              pushParticleAt(vein.points, t, 'grain')
              if (particleRand() < (isThickMain ? 0.6 : 0.3)) {
                pushParticleAt(vein.points, t, 'mist')
              }
              if (isThickMain && particleRand() < 0.35) {
                pushParticleAt(vein.points, t, 'grain')
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
      const elapsedMs = globalProgress * totalDurationMs
      const surfaceAlpha = globalProgress >= 1 ? 1 : 0.35 + 0.65 * Math.min(1, elapsedMs / SURFACE_FADE_MS)

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
        const state = globalProgress >= 1 ? { left: 1, right: 1 } : getVeinArcProgress(vein, elapsedMs)
        if (vein.growMode === 'center' ? state.left <= 0 && state.right <= 0 : state.right <= 0) continue

        let startT: number
        let endT: number
        if (globalProgress >= 1 || (state.left >= 1 && state.right >= 1)) {
          startT = 0
          endT = 1
        } else if (vein.growMode === 'center') {
          startT =
            state.left >= 1
              ? 0
              : arcRatioToIndexT(vein.cumLengths, vein.totalLength, vein.midArcRatio * (1 - state.left))
          endT =
            state.right >= 1
              ? 1
              : arcRatioToIndexT(
                  vein.cumLengths,
                  vein.totalLength,
                  vein.midArcRatio + (1 - vein.midArcRatio) * state.right,
                )
        } else {
          startT = 0
          endT = state.right >= 1 ? 1 : arcRatioToIndexT(vein.cumLengths, vein.totalLength, state.right)
        }

        const count = sampleSubPath(vein.points, startT, endT)
        if (count < 2) continue

        fillVeinPass(
          ctx,
          vein,
          count,
          state.left,
          state.right,
          startT,
          endT,
          0.82,
          0.34,
          highlightColor,
          highlightAlpha,
        )
        fillVeinPass(ctx, vein, count, state.left, state.right, startT, endT, 0.62, 0, creviceColor, creviceAlpha)
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
