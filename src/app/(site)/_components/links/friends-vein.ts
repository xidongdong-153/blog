import { clamp, createRandom, smoothstep } from '../site/backdrop-noise'

interface Point {
  x: number
  y: number
}

export interface VeinPath {
  points: Point[]
  cumLengths: Float64Array
  totalLength: number
}

export interface FriendsVeinNodeGeom {
  key: string
  index: number
  arcRatio: number
  originX: number
  originY: number
  tipX: number
  tipY: number
  dir: -1 | 1
  branch: VeinPath
}

export interface FriendsVeinGeometry {
  width: number
  height: number
  main: VeinPath
  nodes: FriendsVeinNodeGeom[]
  twigs: VeinPath[]
}

export interface FriendsVeinRenderState {
  dark: boolean
  activeKey: string | null
  seepProgress: number
}

function hashKeysSeed(keys: readonly string[]): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]
    for (let j = 0; j < key.length; j += 1) {
      h ^= key.charCodeAt(j)
      h = Math.imul(h, 16777619) >>> 0
    }
    h ^= (i + 1) * 31
    h = Math.imul(h, 16777619) >>> 0
  }
  return (h ^ 0x9e3779b9) >>> 0
}

function fracturePolyline(start: Point, end: Point, amplitude: number, depth: number, random: () => number): Point[] {
  const points: Point[] = [start]

  const split = (a: Point, b: Point, level: number, spread: number) => {
    if (level <= 0) {
      points.push(b)
      return
    }
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const fraction = 0.37 + random() * 0.26
    const offset = (random() - 0.5) * spread
    const mid: Point = {
      x: a.x + dx * fraction - (dy / len) * offset,
      y: a.y + dy * fraction + (dx / len) * offset,
    }
    split(a, mid, level - 1, spread * 0.56)
    split(mid, b, level - 1, spread * 0.56)
  }

  split(start, end, depth, amplitude)
  return points
}

function buildVeinPath(points: Point[]): VeinPath {
  const cumLengths = new Float64Array(points.length)
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    total += Math.hypot(dx, dy)
    cumLengths[i] = total
  }
  return { points, cumLengths, totalLength: total }
}

function sampleVeinPoint(path: VeinPath, ratio: number): Point {
  const { points, cumLengths, totalLength } = path
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1 || totalLength <= 0) return points[0]

  const target = clamp(ratio, 0, 1) * totalLength
  for (let i = 1; i < points.length; i += 1) {
    if (cumLengths[i] >= target) {
      const segLen = cumLengths[i] - cumLengths[i - 1]
      const t = segLen > 1e-6 ? (target - cumLengths[i - 1]) / segLen : 0
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
      }
    }
  }
  return points[points.length - 1]
}

function strokeSubPath(
  ctx: CanvasRenderingContext2D,
  path: VeinPath,
  endRatio: number,
  widthAt: (t: number) => number,
  strokeStyle: string,
) {
  const { points, cumLengths, totalLength } = path
  if (points.length < 2 || totalLength <= 0 || endRatio <= 1e-4) return

  const limit = clamp(endRatio, 0, 1) * totalLength
  ctx.strokeStyle = strokeStyle
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let i = 1; i < points.length; i += 1) {
    const segStart = cumLengths[i - 1]
    if (segStart >= limit) break

    const segEnd = cumLengths[i]
    const clippedEnd = Math.min(segEnd, limit)
    const segLen = segEnd - segStart
    const frac = segLen > 1e-6 ? (clippedEnd - segStart) / segLen : 1

    const p0 = points[i - 1]
    const p1 = {
      x: p0.x + (points[i].x - p0.x) * frac,
      y: p0.y + (points[i].y - p0.y) * frac,
    }
    const midRatio = (segStart + clippedEnd) / (2 * totalLength)

    ctx.lineWidth = widthAt(midRatio)
    ctx.beginPath()
    ctx.moveTo(p0.x, p0.y)
    ctx.lineTo(p1.x, p1.y)
    ctx.stroke()
  }
}

function drawMineralFacet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fillStyle: string,
  strokeStyle?: string,
) {
  ctx.beginPath()
  ctx.moveTo(x, y - radius)
  ctx.lineTo(x + radius * 0.82, y)
  ctx.lineTo(x, y + radius)
  ctx.lineTo(x - radius * 0.82, y)
  ctx.closePath()
  ctx.fillStyle = fillStyle
  ctx.fill()
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = 1.15
    ctx.stroke()
  }
}

/**
 * 为友链节点生成确定性的横向分形石脉、分支与菱形矿晶坐标。
 */
export function buildFriendsVeinGeometry(
  items: readonly { key: string }[],
  width: number,
  height: number,
): FriendsVeinGeometry {
  const safeW = Math.max(280, Math.floor(width))
  const safeH = Math.max(176, Math.floor(height))
  const random = createRandom(hashKeysSeed(items.map((item) => item.key)))

  const marginX = 22
  const mainY = safeH * 0.52
  const main = buildVeinPath(
    fracturePolyline({ x: marginX, y: mainY }, { x: safeW - marginX, y: mainY }, 14, 5, random),
  )

  const count = items.length
  const nodes: FriendsVeinNodeGeom[] = items.map((item, index) => {
    const arcRatio = count === 1 ? 0.5 : 0.09 + (index / (count - 1)) * 0.82
    const origin = sampleVeinPoint(main, arcRatio)
    const dir: -1 | 1 = index % 2 === 0 ? -1 : 1
    const branchLen = 34 + random() * 22
    const driftX = (random() - 0.5) * Math.min(28, safeW / Math.max(count * 3, 6))
    const tipX = clamp(origin.x + driftX, 34, safeW - 34)
    const tipY = clamp(origin.y + dir * branchLen, 32, safeH - 32)
    const branch = buildVeinPath(fracturePolyline(origin, { x: tipX, y: tipY }, 9, 3, random))

    return {
      key: item.key,
      index,
      arcRatio,
      originX: origin.x,
      originY: origin.y,
      tipX,
      tipY,
      dir,
      branch,
    }
  })

  const twigCount = Math.min(9, Math.max(4, Math.floor(safeW / 130)))
  const twigs: VeinPath[] = []
  for (let i = 0; i < twigCount; i += 1) {
    const ratio = 0.07 + random() * 0.86
    const origin = sampleVeinPoint(main, ratio)
    const angle = (random() > 0.5 ? -1 : 1) * (0.55 + random() * 0.9)
    const len = 14 + random() * 20
    const end = {
      x: clamp(origin.x + Math.cos(angle) * len, 12, safeW - 12),
      y: clamp(origin.y + Math.sin(angle) * len, 16, safeH - 16),
    }
    twigs.push(buildVeinPath(fracturePolyline(origin, end, 4.5, 2, random)))
  }

  return { width: safeW, height: safeH, main, nodes, twigs }
}

/**
 * 在 Canvas 上绘制友链分形石脉、松烟青渗墨与矿晶节点。
 * 配色与文章目录导轨（toc-vein.ts）及 DESIGN.md 保持一致。
 */
export function renderFriendsVein(
  ctx: CanvasRenderingContext2D,
  geom: FriendsVeinGeometry,
  dpr: number,
  state: FriendsVeinRenderState,
): void {
  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, geom.width, geom.height)

  const dark = state.dark
  const progress = clamp(state.seepProgress, 0, 1)

  const dryCrack = dark ? 'rgba(182, 200, 190, 0.22)' : 'rgba(68, 64, 54, 0.24)'
  const dryHighlight = dark ? 'rgba(226, 240, 232, 0.08)' : 'rgba(255, 253, 246, 0.62)'
  const dryTwig = dark ? 'rgba(182, 200, 190, 0.14)' : 'rgba(78, 74, 62, 0.16)'
  const nodeBg = dark ? 'hsl(160 7% 8.4%)' : 'hsl(48 33% 97.1%)'
  const inkRgb = dark ? '92, 196, 169' : '27, 106, 87'
  const inkHalo = dark ? `rgba(${inkRgb}, 0.22)` : `rgba(${inkRgb}, 0.14)`
  const inkSeep = dark ? `rgba(${inkRgb}, 0.8)` : `rgba(${inkRgb}, 0.84)`
  const inkActive = dark ? 'rgba(116, 214, 188, 0.98)' : 'rgba(22, 96, 78, 0.98)'

  // 1. 石缘微高光，呼应岩石细纹浮雕层次
  ctx.save()
  ctx.translate(0.65, 0.4)
  strokeSubPath(ctx, geom.main, 1, (t) => 0.65 + smoothstep(0, 0.06, t) * smoothstep(1, 0.94, t) * 0.45, dryHighlight)
  ctx.restore()

  // 2. 干态主裂纹、细枝与所有支脉
  strokeSubPath(ctx, geom.main, 1, (t) => 0.85 + smoothstep(0, 0.07, t) * smoothstep(1, 0.93, t) * 0.55, dryCrack)

  for (const twig of geom.twigs) {
    strokeSubPath(ctx, twig, 1, (t) => 0.8 * (1 - t * 0.6), dryTwig)
  }

  for (const node of geom.nodes) {
    strokeSubPath(ctx, node.branch, 1, (t) => 1.05 * (1 - t * 0.3), dryCrack)
  }

  // 3. 松烟墨青沿主脉渗染至当前激活分支
  const activeNode = geom.nodes.find((node) => node.key === state.activeKey) ?? null
  if (activeNode && progress > 1e-4) {
    const mainRatio = activeNode.arcRatio * clamp(progress * 1.18, 0, 1)
    const branchRatio = clamp((progress - 0.16) / 0.84, 0, 1)

    strokeSubPath(ctx, geom.main, mainRatio, () => 4.2, inkHalo)
    strokeSubPath(ctx, geom.main, mainRatio, (t) => 1.45 + smoothstep(0, 0.08, t) * 0.35, inkSeep)

    if (branchRatio > 1e-4) {
      strokeSubPath(ctx, activeNode.branch, branchRatio, () => 3.8, inkHalo)
      strokeSubPath(ctx, activeNode.branch, branchRatio, (t) => 1.55 * (1 - t * 0.2), inkActive)
    }
  }

  // 4. 菱形矿晶节点
  for (const node of geom.nodes) {
    const isActive = node.key === state.activeKey
    if (isActive) {
      const glow = ctx.createRadialGradient(node.tipX, node.tipY, 0, node.tipX, node.tipY, 11)
      glow.addColorStop(0, `rgba(${inkRgb}, ${dark ? 0.42 : 0.28})`)
      glow.addColorStop(1, `rgba(${inkRgb}, 0)`)
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(node.tipX, node.tipY, 11, 0, Math.PI * 2)
      ctx.fill()

      drawMineralFacet(ctx, node.tipX, node.tipY, 5.8, inkActive, inkActive)
    } else {
      drawMineralFacet(ctx, node.tipX, node.tipY, 4.1, nodeBg, dryCrack)
    }
  }

  ctx.restore()
}
