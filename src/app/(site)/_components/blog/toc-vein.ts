import { clamp, createRandom, smoothstep } from '../site/backdrop-noise'

export interface TocVeinNodeInput {
  id: string
  depth: 2 | 3
  /** 链接垂直中心相对列表顶部的偏移（px） */
  centerY: number
  /** 链接顶部相对列表顶部的偏移（px） */
  top: number
  /** 链接底部相对列表顶部的偏移（px） */
  bottom: number
}

interface Point {
  x: number
  y: number
}

interface VeinPath {
  points: Point[]
  cumLengths: Float64Array
  totalLength: number
}

interface BranchVein extends VeinPath {
  nodeId: string
  parentArcRatio: number
}

interface MicroTwig extends VeinPath {
  parentArcRatio: number
  alphaScale: number
}

export interface TocVeinNodeGeom {
  id: string
  depth: 2 | 3
  centerY: number
  top: number
  bottom: number
  arcRatio: number
  startArcRatio: number
  endArcRatio: number
  anchorX: number
  anchorY: number
  branch?: BranchVein
}

export interface TocVeinGeometry {
  width: number
  height: number
  main: VeinPath
  nodes: TocVeinNodeGeom[]
  twigs: MicroTwig[]
}

export interface TocVeinDustParticle {
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
  inked: boolean
}

export interface TocVeinRenderState {
  dark: boolean
  /** 首次入场裂开生长进度 [0, 1] */
  growth: number
  /** 沿主裂纹向下的松烟青渗墨进度 [0, 1] */
  seep: number
  primaryActiveId?: string
  secondaryActiveIds: ReadonlySet<string>
  hoveredId?: string | null
  particles: readonly TocVeinDustParticle[]
}

export const TOC_VEIN_WIDTH = 28
export const TOC_HVEIN_HEIGHT = 22
const MAIN_SPINE_X = 8.5

export interface HorizontalVeinNodeGeom {
  id: string
  text: string
  arcRatio: number
  x: number
  y: number
}

export interface HorizontalVeinGeometry {
  width: number
  height: number
  main: VeinPath
  nodes: HorizontalVeinNodeGeom[]
  twigs: MicroTwig[]
}

export interface HorizontalVeinRenderState {
  dark: boolean
  /** 松烟墨青自左向右的渗墨进度 [0, 1] */
  seep: number
  activeNodeId?: string
  hoveredNodeId?: string | null
}

/** 由文章目录结构派生稳定 32 位种子，确保每篇文章裂纹独特且刷新不跳变。 */
export function hashTocSeed(nodes: readonly { id: string }[]): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < nodes.length; i += 1) {
    const id = nodes[i].id
    for (let j = 0; j < id.length; j += 1) {
      h ^= id.charCodeAt(j)
      h = Math.imul(h, 16777619) >>> 0
    }
    h ^= (i + 1) * 31
    h = Math.imul(h, 16777619) >>> 0
  }
  return (h ^ 0x9e3779b9) >>> 0
}

/** 复用岩石裂纹的中点位移分形折线算法，生成自然有机岩脉。 */
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
    const fraction = 0.36 + random() * 0.28
    const offset = (random() - 0.5) * spread
    const mid: Point = {
      x: a.x + dx * fraction - (dy / len) * offset,
      y: a.y + dy * fraction + (dx / len) * offset,
    }
    split(a, mid, level - 1, spread * 0.52)
    split(mid, b, level - 1, spread * 0.52)
  }
  split(start, end, depth, amplitude)
  return points
}

function buildVeinPath(points: Point[]): VeinPath {
  const cumLengths = new Float64Array(points.length)
  let total = 0
  cumLengths[0] = 0
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    cumLengths[i] = total
  }
  return {
    points,
    cumLengths,
    totalLength: Math.max(1e-3, total),
  }
}

export function sampleVeinAtArcRatio(path: VeinPath, ratio: number): Point {
  const pts = path.points
  if (pts.length === 0) return { x: MAIN_SPINE_X, y: 0 }
  if (pts.length === 1 || ratio <= 0) return pts[0]
  if (ratio >= 1) return pts[pts.length - 1]

  const target = ratio * path.totalLength
  let lo = 0
  let hi = pts.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (path.cumLengths[mid] < target) lo = mid
    else hi = mid
  }
  const segLen = path.cumLengths[hi] - path.cumLengths[lo]
  const frac = segLen > 1e-5 ? clamp((target - path.cumLengths[lo]) / segLen, 0, 1) : 0
  return {
    x: pts[lo].x + (pts[hi].x - pts[lo].x) * frac,
    y: pts[lo].y + (pts[hi].y - pts[lo].y) * frac,
  }
}

function findArcRatioForY(path: VeinPath, targetY: number): { arcRatio: number; point: Point } {
  const pts = path.points
  if (pts.length <= 1) {
    return { arcRatio: 0, point: pts[0] ?? { x: MAIN_SPINE_X, y: targetY } }
  }
  if (targetY <= pts[0].y) return { arcRatio: 0, point: pts[0] }
  const last = pts[pts.length - 1]
  if (targetY >= last.y) return { arcRatio: 1, point: last }

  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1]
    const b = pts[i]
    if (b.y >= targetY) {
      const dy = b.y - a.y
      const frac = dy > 1e-5 ? clamp((targetY - a.y) / dy, 0, 1) : 0
      const segDist = Math.hypot(b.x - a.x, b.y - a.y) * frac
      const arcRatio = clamp((path.cumLengths[i - 1] + segDist) / path.totalLength, 0, 1)
      return {
        arcRatio,
        point: {
          x: a.x + (b.x - a.x) * frac,
          y: a.y + (b.y - a.y) * frac,
        },
      }
    }
  }

  return { arcRatio: 1, point: last }
}

/**
 * 依据实测目录节点坐标与文章种子构建主矿脉、H3 分叉支脉与微末暗裂。
 */
export function buildTocVeinGeometry(
  height: number,
  inputs: readonly TocVeinNodeInput[],
  seed: number,
): TocVeinGeometry | null {
  if (!Number.isFinite(height) || height < 12 || inputs.length === 0) return null
  const rand = createRandom(seed + 137)

  const startY = Math.max(4, Math.min(inputs[0].top + 4, inputs[0].centerY - 6))
  const endY = Math.min(
    height - 4,
    Math.max(inputs[inputs.length - 1].bottom - 4, inputs[inputs.length - 1].centerY + 6),
  )
  const spanY = Math.max(16, endY - startY)

  // 沿纵向按自然步长布设控制锚点，再通过中点位移生成有机岩石微折主脉
  const segmentCount = clamp(Math.round(spanY / 44), 2, 22)
  const anchors: Point[] = []
  let drift = (rand() - 0.5) * 2.2
  for (let i = 0; i <= segmentCount; i += 1) {
    const t = i / segmentCount
    drift = clamp(drift * 0.45 + (rand() - 0.5) * 4.4, -3.2, 3.2)
    const edgeTaper = i === 0 || i === segmentCount ? 0.45 : 1
    anchors.push({
      x: MAIN_SPINE_X + drift * edgeTaper,
      y: startY + spanY * t,
    })
  }

  const mainPoints: Point[] = [anchors[0]]
  for (let i = 1; i < anchors.length; i += 1) {
    const seg = fracturePolyline(anchors[i - 1], anchors[i], 3.4, 3, rand)
    for (let j = 1; j < seg.length; j += 1) {
      const prev = mainPoints[mainPoints.length - 1]
      const pt = seg[j]
      // 保持纵向单调推进，避免极端回折导致按 Y 映射失真
      mainPoints.push({
        x: clamp(pt.x, 3.8, 13.4),
        y: Math.max(prev.y + 0.25, pt.y),
      })
    }
  }
  // 收齐末端纵坐标
  mainPoints[mainPoints.length - 1] = {
    x: mainPoints[mainPoints.length - 1].x,
    y: Math.max(mainPoints[mainPoints.length - 1].y, endY),
  }

  const main = buildVeinPath(mainPoints)

  // 映射章节节点，并为每个 H3 生成自然分叉收尖支脉
  const nodes: TocVeinNodeGeom[] = inputs.map((input) => {
    const center = findArcRatioForY(main, input.centerY)
    const startHit = findArcRatioForY(main, input.top + 3)
    const endHit = findArcRatioForY(main, input.bottom - 3)

    let branch: BranchVein | undefined
    if (input.depth === 3) {
      const forkY = Math.max(startY + 1, input.centerY - (3.5 + rand() * 3.5))
      const forkHit = findArcRatioForY(main, forkY)
      const tipX = 23.2 + (rand() - 0.5) * 1.8
      const tipY = input.centerY + (rand() - 0.5) * 1.2
      const rawBranch = fracturePolyline(forkHit.point, { x: tipX, y: tipY }, 2.6, 2, rand)
      branch = {
        ...buildVeinPath(rawBranch),
        nodeId: input.id,
        parentArcRatio: forkHit.arcRatio,
      }
    }

    return {
      id: input.id,
      depth: input.depth,
      centerY: input.centerY,
      top: input.top,
      bottom: input.bottom,
      arcRatio: center.arcRatio,
      startArcRatio: Math.min(startHit.arcRatio, center.arcRatio),
      endArcRatio: Math.max(endHit.arcRatio, center.arcRatio),
      anchorX: center.point.x,
      anchorY: center.point.y,
      branch,
    }
  })

  // 在主脉左侧点缀少量极细短微裂，强化真实岩石断裂质感
  const twigCount = clamp(Math.floor(spanY / 72), 2, 7)
  const twigs: MicroTwig[] = []
  for (let i = 0; i < twigCount; i += 1) {
    const ratio = clamp((i + 0.35 + rand() * 0.45) / twigCount, 0.08, 0.92)
    const root = sampleVeinAtArcRatio(main, ratio)
    const goLeft = rand() < 0.72
    const len = 4.2 + rand() * 4.6
    const angle = goLeft ? Math.PI * (0.64 + rand() * 0.34) : Math.PI * (0.14 + rand() * 0.28)
    const tip: Point = {
      x: clamp(root.x + Math.cos(angle) * len, 1.2, 16.5),
      y: clamp(root.y + Math.sin(angle) * len, 2, height - 2),
    }
    const pts = fracturePolyline(root, tip, 1.4, 2, rand)
    twigs.push({
      ...buildVeinPath(pts),
      parentArcRatio: ratio,
      alphaScale: 0.48 + rand() * 0.32,
    })
  }

  return {
    width: TOC_VEIN_WIDTH,
    height,
    main,
    nodes,
    twigs,
  }
}

/** 在指定裂纹节点生成数粒与背景同源的微小落尘粒子。 */
export function spawnVeinDustBurst(
  x: number,
  y: number,
  count: number,
  inked: boolean,
  rand: () => number,
): TocVeinDustParticle[] {
  const result: TocVeinDustParticle[] = []
  for (let i = 0; i < count; i += 1) {
    const side = rand() < 0.55 ? 1 : -1
    result.push({
      x: x + (rand() - 0.5) * 2.4,
      y: y + (rand() - 0.5) * 3.2,
      vx: side * (5 + rand() * 14),
      vy: -6 + rand() * 14,
      gravity: 46 + rand() * 44,
      drag: 2.9,
      size: 0.8 + rand() * 0.95,
      alpha: 0.34 + rand() * 0.24,
      age: 0,
      life: 0.55 + rand() * 0.32,
      inked: inked && rand() < 0.65,
    })
  }
  return result
}

/** 推进落尘物理状态，返回是否仍有存活粒子。 */
export function stepVeinDust(particles: TocVeinDustParticle[], dtSeconds: number): boolean {
  const dt = clamp(dtSeconds, 0, 0.06)
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i]
    p.age += dt
    if (p.age >= p.life) {
      particles.splice(i, 1)
      continue
    }
    const damping = Math.exp(-p.drag * dt)
    p.vx *= damping
    p.vy = p.vy * damping + p.gravity * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
  return particles.length > 0
}

function strokeSubPath(
  ctx: CanvasRenderingContext2D,
  path: VeinPath,
  startRatio: number,
  endRatio: number,
  widthFn: (localT: number, arcRatio: number) => number,
  strokeStyle: string,
) {
  const s0 = clamp(startRatio, 0, 1)
  const s1 = clamp(endRatio, 0, 1)
  if (s1 - s0 <= 1e-4 || path.points.length < 2) return

  const pts = path.points
  const startDist = s0 * path.totalLength
  const endDist = s1 * path.totalLength

  ctx.strokeStyle = strokeStyle
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let i = 1; i < pts.length; i += 1) {
    const d0 = path.cumLengths[i - 1]
    const d1 = path.cumLengths[i]
    if (d1 <= startDist || d0 >= endDist) continue

    const segLen = Math.max(1e-5, d1 - d0)
    const c0 = clamp((Math.max(d0, startDist) - d0) / segLen, 0, 1)
    const c1 = clamp((Math.min(d1, endDist) - d0) / segLen, 0, 1)
    if (c1 - c0 <= 1e-5) continue

    const a = pts[i - 1]
    const b = pts[i]
    const x0 = a.x + (b.x - a.x) * c0
    const y0 = a.y + (b.y - a.y) * c0
    const x1 = a.x + (b.x - a.x) * c1
    const y1 = a.y + (b.y - a.y) * c1

    const midDist = d0 + segLen * (c0 + c1) * 0.5
    const arcRatio = midDist / path.totalLength
    const localT = (midDist - startDist) / Math.max(1e-5, endDist - startDist)

    ctx.lineWidth = Math.max(0.45, widthFn(localT, arcRatio))
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }
}

function drawMineralFacet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  stroke?: string,
) {
  ctx.beginPath()
  ctx.moveTo(x, y - radius)
  ctx.lineTo(x + radius * 0.82, y)
  ctx.lineTo(x, y + radius)
  ctx.lineTo(x - radius * 0.82, y)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 0.8
    ctx.stroke()
  }
}

/**
 * 渲染双主题「青脉裂隙 · 墨沁石缝」导轨画布。
 * 浅色（暖宣石）：暖灰褐干石缝 + 微白石缘高光 + 深松烟墨青浸润。
 * 深色（青玄炭）：含蓄冷青暗缝 + 清冷松烟玉光浸润。
 */
export function renderTocVein(canvas: HTMLCanvasElement, geom: TocVeinGeometry, state: TocVeinRenderState) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(Math.max(1, window.devicePixelRatio || 1), 2, 4096 / Math.max(1, geom.height))
  const targetW = Math.max(1, Math.round(geom.width * dpr))
  const targetH = Math.max(1, Math.round(geom.height * dpr))
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }

  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, geom.width, geom.height)

  const growth = clamp(state.growth, 0, 1)
  if (growth <= 1e-4) {
    ctx.restore()
    return
  }

  const seep = Math.min(growth, clamp(state.seep, 0, 1))
  const dark = state.dark

  // 配色严格对齐 DESIGN.md：浅色松烟墨青 hsl(166 60% 26%) ≈ (27, 106, 87)；深色 hsl(164 47% 56.5%) ≈ (92, 196, 169)
  const dryCrack = dark ? 'rgba(182, 200, 190, 0.22)' : 'rgba(68, 64, 54, 0.25)'
  const dryHighlight = dark ? 'rgba(226, 240, 232, 0.08)' : 'rgba(255, 253, 246, 0.62)'
  const dryTwig = dark ? 'rgba(182, 200, 190, 0.14)' : 'rgba(78, 74, 62, 0.17)'
  const inkRgb = dark ? '92, 196, 169' : '27, 106, 87'
  const inkHalo = dark ? `rgba(${inkRgb}, 0.22)` : `rgba(${inkRgb}, 0.15)`
  const inkSeep = dark ? `rgba(${inkRgb}, 0.78)` : `rgba(${inkRgb}, 0.82)`
  const inkActive = dark ? `rgba(116, 214, 188, 0.98)` : `rgba(22, 96, 78, 0.98)`
  const inkHover = dark ? `rgba(${inkRgb}, 0.56)` : `rgba(${inkRgb}, 0.54)`

  // 1. 底层石缘微高光（偏移 +0.65px，模拟暖宣石/青玄炭细纹微雕起伏）
  ctx.save()
  ctx.translate(0.65, 0.35)
  strokeSubPath(
    ctx,
    geom.main,
    0,
    growth,
    (_lt, t) => {
      const tipTaper = smoothstep(0, 0.06, t) * smoothstep(1, 0.94, t)
      return 0.65 + tipTaper * 0.45
    },
    dryHighlight,
  )
  ctx.restore()

  // 2. 干石主裂隙与微末毛细暗裂
  for (const twig of geom.twigs) {
    if (growth <= twig.parentArcRatio) continue
    const twigProgress = clamp((growth - twig.parentArcRatio) / 0.14, 0, 1)
    strokeSubPath(ctx, twig, 0, twigProgress, (lt) => (1 - lt * 0.75) * 0.85, dryTwig)
  }

  strokeSubPath(
    ctx,
    geom.main,
    0,
    growth,
    (_lt, t) => {
      const edgeTaper = smoothstep(0, 0.05, t) * smoothstep(1, 0.95, t)
      const organicWave = 0.88 + Math.sin(t * 27) * 0.12
      return (0.55 + edgeTaper * 0.6) * organicWave
    },
    dryCrack,
  )

  // 3. H3 分叉支脉（干石底层 + 已渗墨/悬停/激活层）
  for (const node of geom.nodes) {
    if (!node.branch) continue
    const br = node.branch
    if (growth <= br.parentArcRatio) continue
    const branchGrowth = clamp((growth - br.parentArcRatio) / 0.16, 0, 1)

    // 干石支脉
    strokeSubPath(ctx, br, 0, branchGrowth, (lt) => 1.05 * (1 - lt * 0.62), dryCrack)

    const isPrimary = node.id === state.primaryActiveId
    const isHovered = node.id === state.hoveredId
    const branchSeep = clamp((seep - br.parentArcRatio) / 0.075, 0, 1)
    const effectiveSeep = isPrimary ? branchGrowth : Math.min(branchGrowth, branchSeep)

    if (effectiveSeep > 0.01) {
      if (isPrimary) {
        strokeSubPath(ctx, br, 0, effectiveSeep, (lt) => 3.4 * (1 - lt * 0.55), inkHalo)
      }
      strokeSubPath(
        ctx,
        br,
        0,
        effectiveSeep,
        (lt) => (isPrimary ? 1.55 : 1.15) * (1 - lt * 0.58),
        isPrimary ? inkActive : inkSeep,
      )
    } else if (isHovered && branchGrowth > 0.05) {
      strokeSubPath(ctx, br, 0, branchGrowth, (lt) => 1.25 * (1 - lt * 0.58), inkHover)
    }
  }

  // 4. 松烟墨青沿主脉渗染层（柔晕 + 凝墨主缝）
  if (seep > 0.002) {
    strokeSubPath(
      ctx,
      geom.main,
      0,
      seep,
      (lt, t) => {
        const edge = smoothstep(0, 0.04, t)
        const tipFade = smoothstep(1, 0.82, lt)
        return (2.6 + tipFade * 1.4) * edge
      },
      inkHalo,
    )
    strokeSubPath(
      ctx,
      geom.main,
      0,
      seep,
      (_lt, t) => {
        const edge = smoothstep(0, 0.05, t)
        const organic = 0.9 + Math.sin(t * 27) * 0.12
        return (0.85 + edge * 0.55) * organic
      },
      inkSeep,
    )
  }

  // 5. 当前主激活章节高光青脉区段
  const primaryNode = state.primaryActiveId ? geom.nodes.find((n) => n.id === state.primaryActiveId) : undefined
  if (primaryNode && growth >= primaryNode.startArcRatio) {
    const segStart = Math.max(0, primaryNode.startArcRatio)
    const segEnd = Math.min(growth, Math.max(primaryNode.endArcRatio, primaryNode.arcRatio + 0.015))
    strokeSubPath(ctx, geom.main, segStart, segEnd, () => 4.2, inkHalo)
    strokeSubPath(ctx, geom.main, segStart, segEnd, () => 1.85, inkActive)
  }

  // 6. H2 裂纹矿晶节点（未读极淡石点 / 已读淡青棱点 / 主激活松烟玉晶）
  for (const node of geom.nodes) {
    if (node.depth !== 2 || growth < node.arcRatio) continue
    const isPrimary = node.id === state.primaryActiveId
    const isHovered = node.id === state.hoveredId
    const isSecondary = state.secondaryActiveIds.has(node.id)
    const isRead = seep >= node.arcRatio - 0.012

    if (isPrimary) {
      const glow = ctx.createRadialGradient(node.anchorX, node.anchorY, 0, node.anchorX, node.anchorY, 6.5)
      glow.addColorStop(0, `rgba(${inkRgb}, ${dark ? 0.45 : 0.32})`)
      glow.addColorStop(1, `rgba(${inkRgb}, 0)`)
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(node.anchorX, node.anchorY, 6.5, 0, Math.PI * 2)
      ctx.fill()
      drawMineralFacet(ctx, node.anchorX, node.anchorY, 2.7, inkActive)
    } else if (isHovered) {
      drawMineralFacet(ctx, node.anchorX, node.anchorY, 2.2, inkHover)
    } else if (isRead || isSecondary) {
      drawMineralFacet(
        ctx,
        node.anchorX,
        node.anchorY,
        1.75,
        isRead ? `rgba(${inkRgb}, ${dark ? 0.72 : 0.75})` : `rgba(${inkRgb}, 0.42)`,
      )
    } else {
      drawMineralFacet(
        ctx,
        node.anchorX,
        node.anchorY,
        1.35,
        dark ? 'rgba(182, 200, 190, 0.28)' : 'rgba(74, 70, 58, 0.28)',
      )
    }
  }

  // 7. 渗墨最前沿的微光墨尖（未到 0% 且未封顶时轻柔提示阅读落点）
  if (seep > 0.015 && seep < 0.995) {
    const tip = sampleVeinAtArcRatio(geom.main, seep)
    const tipGlow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 5.5)
    tipGlow.addColorStop(0, `rgba(${inkRgb}, ${dark ? 0.5 : 0.36})`)
    tipGlow.addColorStop(1, `rgba(${inkRgb}, 0)`)
    ctx.fillStyle = tipGlow
    ctx.beginPath()
    ctx.arc(tip.x, tip.y, 5.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = inkActive
    ctx.beginPath()
    ctx.arc(tip.x, tip.y, 1.35, 0, Math.PI * 2)
    ctx.fill()
  }

  // 8. 裂开与跨章落尘粉尘（静置时为空数组，零开销）
  if (state.particles.length > 0) {
    const stoneRgb = dark ? '155, 175, 160' : '112, 106, 94'
    for (const p of state.particles) {
      const lifeRatio = clamp(p.age / p.life, 0, 1)
      const fade = (1 - lifeRatio) * (1 - lifeRatio)
      const alpha = p.alpha * fade
      if (alpha <= 0.008) continue
      const rgb = p.inked ? inkRgb : stoneRgb
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.9)
      grad.addColorStop(0, `rgba(${rgb}, ${alpha})`)
      grad.addColorStop(1, `rgba(${rgb}, 0)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 1.9, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

function findArcRatioForX(path: VeinPath, targetX: number): { arcRatio: number; point: Point } {
  const pts = path.points
  if (pts.length <= 1) {
    return { arcRatio: 0, point: pts[0] ?? { x: targetX, y: TOC_HVEIN_HEIGHT * 0.5 } }
  }
  if (targetX <= pts[0].x) return { arcRatio: 0, point: pts[0] }
  const last = pts[pts.length - 1]
  if (targetX >= last.x) return { arcRatio: 1, point: last }

  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1]
    const b = pts[i]
    if (b.x >= targetX) {
      const dx = b.x - a.x
      const frac = dx > 1e-5 ? clamp((targetX - a.x) / dx, 0, 1) : 0
      const segDist = Math.hypot(b.x - a.x, b.y - a.y) * frac
      const arcRatio = clamp((path.cumLengths[i - 1] + segDist) / path.totalLength, 0, 1)
      return {
        arcRatio,
        point: {
          x: a.x + (b.x - a.x) * frac,
          y: a.y + (b.y - a.y) * frac,
        },
      }
    }
  }

  return { arcRatio: 1, point: last }
}

/**
 * 构建专注模式专用的横向分形岩石裂隙与章节矿晶刻度几何（横脉微纹 · 墨沁石脊）。
 */
export function buildHorizontalVeinGeometry(
  width: number,
  nodesInput: readonly { id: string; text: string; ratio: number }[],
  seed: number,
): HorizontalVeinGeometry | null {
  if (!Number.isFinite(width) || width < 40) return null
  const height = TOC_HVEIN_HEIGHT
  const midY = height * 0.5
  const padX = 5
  const spanX = Math.max(20, width - padX * 2)
  const rand = createRandom(seed + 911)

  const segmentCount = clamp(Math.round(spanX / 34), 4, 10)
  const anchors: Point[] = []
  let drift = (rand() - 0.5) * 2
  for (let i = 0; i <= segmentCount; i += 1) {
    const t = i / segmentCount
    drift = clamp(drift * 0.45 + (rand() - 0.5) * 4.2, -3.4, 3.4)
    const edgeTaper = i === 0 || i === segmentCount ? 0.35 : 1
    anchors.push({
      x: padX + spanX * t,
      y: midY + drift * edgeTaper,
    })
  }

  const mainPoints: Point[] = [anchors[0]]
  for (let i = 1; i < anchors.length; i += 1) {
    const seg = fracturePolyline(anchors[i - 1], anchors[i], 3.1, 3, rand)
    for (let j = 1; j < seg.length; j += 1) {
      const prev = mainPoints[mainPoints.length - 1]
      const pt = seg[j]
      mainPoints.push({
        x: Math.max(prev.x + 0.25, pt.x),
        y: clamp(pt.y, 4.5, height - 4.5),
      })
    }
  }
  mainPoints[mainPoints.length - 1] = {
    x: Math.max(mainPoints[mainPoints.length - 1].x, width - padX),
    y: mainPoints[mainPoints.length - 1].y,
  }

  const main = buildVeinPath(mainPoints)

  // 将章节节点映射到横向裂纹上（两端保留安全边距以防矿晶裁切）
  const innerPadX = 10
  const innerSpanX = Math.max(12, width - innerPadX * 2)
  const nodes: HorizontalVeinNodeGeom[] = nodesInput.map((item) => {
    const targetX = innerPadX + innerSpanX * clamp(item.ratio, 0, 1)
    const hit = findArcRatioForX(main, targetX)
    return {
      id: item.id,
      text: item.text,
      arcRatio: hit.arcRatio,
      x: hit.point.x,
      y: hit.point.y,
    }
  })

  // 上下侧点缀 3 条极淡微末短裂，呼应岩石断裂肌理
  const twigs: MicroTwig[] = []
  const twigCount = 3
  for (let i = 0; i < twigCount; i += 1) {
    const ratio = clamp((i + 0.3 + rand() * 0.4) / twigCount, 0.14, 0.86)
    const root = sampleVeinAtArcRatio(main, ratio)
    const goUp = i % 2 === 0 ? rand() < 0.65 : rand() < 0.35
    const len = 4.2 + rand() * 3.8
    const angle = goUp ? -(0.35 + rand() * 0.75) : 0.35 + rand() * 0.75
    const tip: Point = {
      x: clamp(root.x + Math.cos(angle) * len, 3, width - 3),
      y: clamp(root.y + Math.sin(angle) * len, 2, height - 2),
    }
    twigs.push({
      ...buildVeinPath(fracturePolyline(root, tip, 1.2, 2, rand)),
      parentArcRatio: ratio,
      alphaScale: 0.52,
    })
  }

  return { width, height, main, nodes, twigs }
}

/**
 * 渲染专注模式「横脉微纹 · 墨沁石脊」画布：横向分形裂纹、松烟青渗墨与章节矿晶刻度。
 */
export function renderHorizontalVein(
  canvas: HTMLCanvasElement,
  geom: HorizontalVeinGeometry,
  state: HorizontalVeinRenderState,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(Math.max(1, window.devicePixelRatio || 1), 2)
  const targetW = Math.max(1, Math.round(geom.width * dpr))
  const targetH = Math.max(1, Math.round(geom.height * dpr))
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }

  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, geom.width, geom.height)

  const seep = clamp(state.seep, 0, 1)
  const dark = state.dark

  const dryCrack = dark ? 'rgba(182, 200, 190, 0.24)' : 'rgba(68, 64, 54, 0.25)'
  const dryHighlight = dark ? 'rgba(226, 240, 232, 0.08)' : 'rgba(255, 253, 246, 0.62)'
  const dryTwig = dark ? 'rgba(182, 200, 190, 0.14)' : 'rgba(78, 74, 62, 0.16)'
  const inkRgb = dark ? '92, 196, 169' : '27, 106, 87'
  const inkHalo = dark ? `rgba(${inkRgb}, 0.22)` : `rgba(${inkRgb}, 0.15)`
  const inkSeep = dark ? `rgba(${inkRgb}, 0.84)` : `rgba(${inkRgb}, 0.86)`
  const inkActive = dark ? `rgba(116, 214, 188, 0.98)` : `rgba(22, 96, 78, 0.98)`
  const inkHover = dark ? `rgba(${inkRgb}, 0.65)` : `rgba(${inkRgb}, 0.62)`

  // 1. 偏移微白石缘高光
  ctx.save()
  ctx.translate(0.3, 0.65)
  strokeSubPath(
    ctx,
    geom.main,
    0,
    1,
    (_lt, t) => 0.6 + smoothstep(0, 0.06, t) * smoothstep(1, 0.94, t) * 0.45,
    dryHighlight,
  )
  ctx.restore()

  // 2. 极淡微末支脉 + 干石主裂隙
  for (const twig of geom.twigs) {
    strokeSubPath(ctx, twig, 0, 1, (lt) => (1 - lt * 0.75) * 0.8, dryTwig)
    if (seep > twig.parentArcRatio) {
      const twigSeep = clamp((seep - twig.parentArcRatio) / 0.1, 0, 1)
      strokeSubPath(ctx, twig, 0, twigSeep, (lt) => (1 - lt * 0.75) * 0.85, `rgba(${inkRgb}, 0.45)`)
    }
  }

  strokeSubPath(
    ctx,
    geom.main,
    0,
    1,
    (_lt, t) => {
      const edgeTaper = smoothstep(0, 0.05, t) * smoothstep(1, 0.95, t)
      const organicWave = 0.88 + Math.sin(t * 25) * 0.12
      return (0.55 + edgeTaper * 0.6) * organicWave
    },
    dryCrack,
  )

  // 3. 松烟墨青自左向右渗染层
  if (seep > 0.002) {
    strokeSubPath(
      ctx,
      geom.main,
      0,
      seep,
      (lt, t) => {
        const edge = smoothstep(0, 0.04, t)
        const tipFade = smoothstep(1, 0.82, lt)
        return (2.6 + tipFade * 1.4) * edge
      },
      inkHalo,
    )
    strokeSubPath(
      ctx,
      geom.main,
      0,
      seep,
      (_lt, t) => {
        const edge = smoothstep(0, 0.05, t)
        const organic = 0.9 + Math.sin(t * 25) * 0.12
        return (0.9 + edge * 0.6) * organic
      },
      inkSeep,
    )
  }

  // 4. 章节矿晶刻度节点
  for (const node of geom.nodes) {
    const isActive = node.id === state.activeNodeId
    const isHovered = node.id === state.hoveredNodeId
    const isRead = seep >= node.arcRatio - 0.012

    if (isActive || isHovered) {
      const glowRadius = isActive ? 6.5 : 5
      const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius)
      glow.addColorStop(0, `rgba(${inkRgb}, ${dark ? 0.46 : 0.34})`)
      glow.addColorStop(1, `rgba(${inkRgb}, 0)`)
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2)
      ctx.fill()
      drawMineralFacet(ctx, node.x, node.y, isActive ? 2.8 : 2.3, isActive ? inkActive : inkHover)
    } else if (isRead) {
      drawMineralFacet(ctx, node.x, node.y, 1.8, `rgba(${inkRgb}, ${dark ? 0.78 : 0.8})`)
    } else {
      drawMineralFacet(ctx, node.x, node.y, 1.45, dark ? 'rgba(182, 200, 190, 0.34)' : 'rgba(74, 70, 58, 0.32)')
    }
  }

  // 5. 渗墨前沿微光墨尖
  if (seep > 0.015 && seep < 0.995) {
    const tip = sampleVeinAtArcRatio(geom.main, seep)
    const tipGlow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 5.2)
    tipGlow.addColorStop(0, `rgba(${inkRgb}, ${dark ? 0.5 : 0.36})`)
    tipGlow.addColorStop(1, `rgba(${inkRgb}, 0)`)
    ctx.fillStyle = tipGlow
    ctx.beginPath()
    ctx.arc(tip.x, tip.y, 5.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = inkActive
    ctx.beginPath()
    ctx.arc(tip.x, tip.y, 1.35, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}
