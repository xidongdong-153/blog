interface Point {
  x: number
  y: number
}

interface RockVein {
  points: Point[]
  width: number
  kind: 'main' | 'branch' | 'short'
  phase: number
}

const ROCK_WIDTH = 1200
const ROCK_HEIGHT = 900
const RELIEF = 0.25
const VEIN_STRENGTH = 0.3
const MAX_CANVAS_PIXELS = 3_000_000
const MAX_MATERIAL_PIXELS = 800_000

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

  configurations.forEach(([start, end, amplitude, width], index) => {
    const points = fracture(flip(start), flip(end), amplitude, random)
    veins.push({ points, width, kind: 'main', phase: random() * 9 })
    const count = index === 2 ? 2 : 3
    for (let j = 0; j < count; j++) {
      const at = Math.floor((0.15 + random() * 0.65) * (points.length - 1))
      const branchStart = points[at]
      const direction = random() < 0.5 ? -1 : 1
      const length = 70 + random() * 190
      const branchEnd = { x: branchStart.x + direction * length, y: branchStart.y + 40 + random() * 150 }
      const branch = fracture(branchStart, branchEnd, length * 0.4, random)
      veins.push({ points: branch, width: width * (0.25 + random() * 0.25), kind: 'branch', phase: random() * 9 })
      if (j === 1) {
        const twigStart = branch[110]
        veins.push({
          points: fracture(twigStart, { x: twigStart.x - direction * 55, y: twigStart.y + 85 }, 32, random),
          width: 0.23,
          kind: 'branch',
          phase: random() * 9,
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
  })

  const extra = createRandom(seed + 7919)
  for (let i = 0; i < 9; i++) {
    const cx = 120 + (i % 3) * 400 + extra() * 160
    const cy = 95 + Math.floor(i / 3) * 280 + extra() * 100
    const angle = 0.35 + extra() * 2.45
    const length = 135 + extra() * 145
    const dx = Math.cos(angle) * length * 0.5
    const dy = Math.sin(angle) * length * 0.5
    veins.push({
      points: fracture({ x: cx - dx, y: cy - dy }, { x: cx + dx, y: cy + dy }, 45 + extra() * 55, extra),
      width: 0.65 + extra() * 0.5,
      kind: 'short',
      phase: extra() * 9,
    })
  }
  return veins
}

function drawVein(
  ctx: CanvasRenderingContext2D,
  vein: RockVein,
  multiplier: number,
  offset: number,
  color: string,
  alpha: number,
) {
  const { points } = vein
  ctx.beginPath()
  for (let side = 0; side < 2; side++) {
    for (let j = 0; j < points.length; j++) {
      const i = side ? points.length - 1 - j : j
      const previous = points[Math.max(0, i - 1)]
      const next = points[Math.min(points.length - 1, i + 1)]
      const dx = next.x - previous.x
      const dy = next.y - previous.y
      const length = Math.hypot(dx, dy) || 1
      const t = i / (points.length - 1)
      const taper =
        vein.kind === 'short'
          ? Math.sin(t * Math.PI) ** 0.55
          : vein.kind === 'branch'
            ? (1 - t) ** 0.65
            : 0.7 + 0.3 * Math.sin(t * Math.PI)
      const variation = 0.65 + 0.2 * Math.sin(t * 42 + vein.phase) + 0.15 * Math.sin(t * 137 + vein.phase * 2)
      const width = vein.width * taper * variation * multiplier
      const normal = (side ? -1 : 1) * width
      const x = points[i].x - (dy / length) * normal + offset
      const y = points[i].y + (dx / length) * normal + offset * 0.7
      if (side === 0 && j === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.globalAlpha = alpha * VEIN_STRENGTH
  ctx.fill()
}

/** 绘制第 7 版岩石细纹；明暗共用形状，透明底保留站点底色与文章氛围光。 */
export function paintRockTexture(
  lightCanvas: HTMLCanvasElement,
  darkCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  devicePixelRatio: number,
  seed: number,
): boolean {
  if (![width, height, devicePixelRatio].every(Number.isFinite) || width <= 0 || height <= 0) return false

  const lightContext = lightCanvas.getContext('2d')
  const darkContext = darkCanvas.getContext('2d')
  const material = document.createElement('canvas')
  const materialContext = material.getContext('2d')
  if (!lightContext || !darkContext || !materialContext) return false

  const dpr = Math.min(
    Math.max(1, devicePixelRatio),
    2,
    4096 / width,
    4096 / height,
    Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
  )
  const resolution = Math.min(1, Math.sqrt(MAX_MATERIAL_PIXELS / (width * height)))
  const sampleWidth = Math.max(1, Math.floor(width * resolution))
  const sampleHeight = Math.max(1, Math.floor(height * resolution))
  material.width = sampleWidth
  material.height = sampleHeight
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

  const lightPixels = materialContext.createImageData(sampleWidth, sampleHeight)
  const darkPixels = materialContext.createImageData(sampleWidth, sampleHeight)
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

  const veins = createVeins(seed)
  const layers = [
    { canvas: lightCanvas, ctx: lightContext, pixels: lightPixels, dark: false },
    { canvas: darkCanvas, ctx: darkContext, pixels: darkPixels, dark: true },
  ]
  for (const { canvas, ctx, pixels, dark } of layers) {
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    materialContext.putImageData(pixels, 0, 0)
    ctx.drawImage(material, 0, 0, canvas.width, canvas.height)
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, -offsetX * dpr * scale, -offsetY * dpr * scale)
    for (const vein of veins) {
      drawVein(ctx, vein, 0.82, 0.34, dark ? '#95aa98' : '#fffef7', dark ? 0.14 : 0.16)
      drawVein(ctx, vein, 0.62, 0, dark ? '#101a14' : '#6e6b60', dark ? 0.4 : 0.6175)
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
  }
  return true
}
