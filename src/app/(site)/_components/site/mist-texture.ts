import { clamp, createRandom, fbm2d, smoothstep } from './backdrop-noise'

export type MistStratumKey = 'plume-a' | 'plume-b' | 'ribbon' | 'drift'

export interface MistMaskLayer {
  key: MistStratumKey
  maskUrl: string
}

interface Filament {
  ax: number
  ay: number
  bx: number
  by: number
  invTwoSigmaSq: number
  weight: number
}

interface StratumSpec {
  key: MistStratumKey
  erosionLow: number
  erosionHigh: number
  strength: number
  warpScale: number
  filaments: (rand: () => number) => Filament[]
}

const LAYER_PAD_LEFT = 0.12
const LAYER_PAD_TOP = 0.1
const LAYER_SPAN_X = 1.24
const LAYER_SPAN_Y = 1.18

function jitter(rand: () => number, min: number, max: number): number {
  return min + (max - min) * rand()
}

function makeFilament(ax: number, ay: number, bx: number, by: number, sigma: number, weight = 1): Filament {
  return {
    ax,
    ay,
    bx,
    by,
    invTwoSigmaSq: 1 / (2 * sigma * sigma),
    weight,
  }
}

function distSqToSegment(px: number, py: number, f: Filament): number {
  const dx = f.bx - f.ax
  const dy = f.by - f.ay
  const lenSq = dx * dx + dy * dy
  if (lenSq <= 1e-8) {
    const ex = px - f.ax
    const ey = py - f.ay
    return ex * ex + ey * ey
  }
  const t = clamp(((px - f.ax) * dx + (py - f.ay) * dy) / lenSq, 0, 1)
  const cx = f.ax + dx * t
  const cy = f.ay + dy * t
  const ex = px - cx
  const ey = py - cy
  return ex * ex + ey * ey
}

function evalFilamentEnvelope(px: number, py: number, filaments: readonly Filament[]): number {
  let complement = 1
  for (let i = 0; i < filaments.length; i += 1) {
    const f = filaments[i]
    const dSq = distSqToSegment(px, py, f)
    const contrib = clamp(Math.exp(-dSq * f.invTwoSigmaSq) * f.weight, 0, 1)
    complement *= 1 - contrib
  }
  return 1 - complement
}

const STRATUM_SPECS: readonly StratumSpec[] = [
  {
    key: 'plume-a',
    erosionLow: 0.12,
    erosionHigh: 0.92,
    strength: 0.92,
    warpScale: 0.95,
    filaments: (rand) => [
      makeFilament(
        jitter(rand, 0.0, 0.07),
        jitter(rand, 0.04, 0.1),
        jitter(rand, 0.34, 0.44),
        jitter(rand, 0.16, 0.24),
        jitter(rand, 0.15, 0.18),
        1.0,
      ),
      makeFilament(
        jitter(rand, 0.06, 0.14),
        jitter(rand, 0.24, 0.32),
        jitter(rand, 0.25, 0.36),
        jitter(rand, 0.32, 0.4),
        jitter(rand, 0.12, 0.15),
        0.82,
      ),
    ],
  },
  {
    key: 'plume-b',
    erosionLow: 0.14,
    erosionHigh: 0.94,
    strength: 0.88,
    warpScale: 1.0,
    filaments: (rand) => [
      makeFilament(
        jitter(rand, 0.58, 0.68),
        jitter(rand, 0.2, 0.28),
        jitter(rand, 0.93, 1.02),
        jitter(rand, 0.13, 0.22),
        jitter(rand, 0.15, 0.185),
        0.94,
      ),
      makeFilament(
        jitter(rand, 0.48, 0.58),
        jitter(rand, 0.36, 0.44),
        jitter(rand, 0.8, 0.9),
        jitter(rand, 0.42, 0.51),
        jitter(rand, 0.125, 0.155),
        0.82,
      ),
    ],
  },
  {
    key: 'ribbon',
    erosionLow: 0.18,
    erosionHigh: 0.94,
    strength: 0.74,
    warpScale: 1.08,
    filaments: (rand) => [
      makeFilament(
        jitter(rand, 0.24, 0.33),
        jitter(rand, 0.06, 0.14),
        jitter(rand, 0.66, 0.76),
        jitter(rand, 0.14, 0.22),
        jitter(rand, 0.115, 0.145),
        0.9,
      ),
    ],
  },
  {
    key: 'drift',
    erosionLow: 0.18,
    erosionHigh: 0.95,
    strength: 0.62,
    warpScale: 1.04,
    filaments: (rand) => [
      makeFilament(
        jitter(rand, 0.08, 0.16),
        jitter(rand, 0.43, 0.52),
        jitter(rand, 0.31, 0.4),
        jitter(rand, 0.5, 0.58),
        jitter(rand, 0.12, 0.15),
        0.85,
      ),
      makeFilament(
        jitter(rand, 0.68, 0.77),
        jitter(rand, 0.47, 0.56),
        jitter(rand, 0.89, 0.97),
        jitter(rand, 0.54, 0.63),
        jitter(rand, 0.11, 0.14),
        0.74,
      ),
    ],
  },
]

function renderStratumMask(
  spec: StratumSpec,
  seed: number,
  texW: number,
  texH: number,
  scaleX: number,
  scaleY: number,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): string {
  const rand = createRandom(seed)
  const filaments = spec.filaments(rand)
  const ws = spec.warpScale

  const sx1 = rand() * 30
  const sy1 = rand() * 30
  const sx2 = rand() * 30
  const sy2 = rand() * 30
  const sx3 = rand() * 30
  const sy3 = rand() * 30
  const sx4 = rand() * 30
  const sy4 = rand() * 30
  const sx5 = rand() * 30
  const sy5 = rand() * 30
  const sx6 = rand() * 30
  const sy6 = rand() * 30

  const seed1 = (seed + 101) >>> 0
  const seed2 = (seed + 307) >>> 0
  const seed3 = (seed + 613) >>> 0
  const seed4 = (seed + 919) >>> 0
  const seed5 = (seed + 1327) >>> 0
  const seed6 = (seed + 1789) >>> 0

  const image = ctx.createImageData(texW, texH)
  const data = image.data

  for (let py = 0; py < texH; py += 1) {
    const v = py / (texH - 1)
    const vy = v * LAYER_SPAN_Y - LAYER_PAD_TOP
    const marginTop = smoothstep(0.0, 0.045, v)
    const marginBottom = 1 - smoothstep(0.54, 0.92, v)
    const marginV = marginTop * marginBottom

    for (let px = 0; px < texW; px += 1) {
      const idx = (py * texW + px) * 4
      if (marginV <= 0.001) {
        data[idx] = 255
        data[idx + 1] = 255
        data[idx + 2] = 255
        data[idx + 3] = 0
        continue
      }

      const u = px / (texW - 1)
      const marginX = smoothstep(0.0, 0.045, u) * (1 - smoothstep(0.955, 1.0, u))
      const margin = marginX * marginV
      if (margin <= 0.001) {
        data[idx] = 255
        data[idx + 1] = 255
        data[idx + 2] = 255
        data[idx + 3] = 0
        continue
      }

      const vx = u * LAYER_SPAN_X - LAYER_PAD_LEFT
      const nx = vx * scaleX
      const ny = vy * scaleY

      const wx1 = (fbm2d(nx * 2.0 * ws + sx1, ny * 2.0 * ws + sy1, seed1, 3) - 0.5) * 0.42
      const wy1 = (fbm2d(nx * 2.0 * ws + sx2, ny * 2.0 * ws + sy2, seed2, 3) - 0.5) * 0.34
      const wu = vx + wx1
      const wv = vy + wy1

      const wx2 = (fbm2d(wu * 3.8 * scaleX * ws + sx3, wv * 3.8 * scaleY * ws + sy3, seed3, 3) - 0.5) * 0.18
      const wy2 = (fbm2d(wu * 3.8 * scaleX * ws + sx4, wv * 3.8 * scaleY * ws + sy4, seed4, 3) - 0.5) * 0.15
      const fu = wu + wx2
      const fv = wv + wy2

      const envelope = evalFilamentEnvelope(fu, fv, filaments)
      if (envelope <= 0.015) {
        data[idx] = 255
        data[idx + 1] = 255
        data[idx + 2] = 255
        data[idx + 3] = 0
        continue
      }

      const cloud = fbm2d(fu * 3.2 * scaleX + sx5, fv * 3.0 * scaleY + sy5, seed5, 4)
      const tendril = fbm2d(fu * 5.4 * scaleX + sx6, fv * 5.2 * scaleY + sy6, seed6, 3)
      const wispy = cloud * 0.82 + tendril * 0.18

      const raw = envelope * (0.28 + 1.05 * wispy)
      const eroded = smoothstep(spec.erosionLow, spec.erosionHigh, raw) ** 1.35
      const dither = (rand() - rand()) * 0.75
      const alpha = clamp(Math.round(eroded * spec.strength * margin * 255 + dither), 0, 255)

      data[idx] = 255
      data[idx + 1] = 255
      data[idx + 2] = 255
      data[idx + 3] = alpha
    }
  }

  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * 生成四层错落分布、非椭圆的不规则分形雾岚遮罩贴图（Data URL）。
 * 坐标经双层 fBm 域扭曲与柔和幂次边缘羽化，保证每次挂载随机且无几何椭圆或硬边；
 * 使用完即释放离屏画布显存，由 CSS mask-image 与合成层驱动呼吸变化。
 */
export function generateMistMaskLayers(seed: number, width: number, height: number): MistMaskLayer[] | null {
  if (
    typeof document === 'undefined' ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null
  }

  const texW = clamp(Math.round(width / 4.8), 160, 280)
  const texH = clamp(Math.round(height / 4.2), 112, 240)
  const scaleX = clamp(width / 960, 0.45, 1.32)
  const scaleY = clamp(height / 840, 0.5, 1.15)

  const canvas = document.createElement('canvas')
  canvas.width = texW
  canvas.height = texH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.width = canvas.height = 0
    return null
  }

  try {
    return STRATUM_SPECS.map((spec, index) => ({
      key: spec.key,
      maskUrl: renderStratumMask(spec, (seed + index * 4999 + 71) >>> 0, texW, texH, scaleX, scaleY, canvas, ctx),
    }))
  } finally {
    canvas.width = canvas.height = 0
  }
}
