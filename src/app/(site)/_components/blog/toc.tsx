'use client'

import type { CSSProperties } from 'react'
import type {
  HorizontalVeinGeometry,
  HorizontalVeinNodeGeom,
  TocVeinDustParticle,
  TocVeinGeometry,
  TocVeinNodeInput,
} from './toc-vein'
import type { Heading } from '@/lib/content'
import { ArrowUp } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { clamp, createRandom } from '../site/backdrop-noise'
import { readBackdropFxEnabled, SITE_FX_CHANGE_EVENT } from '../site/paper-canvas'
import { useReaderFocus } from './article-reader-shell'
import {
  buildHorizontalVeinGeometry,
  buildTocVeinGeometry,
  hashTocSeed,
  renderHorizontalVein,
  renderTocVein,
  sampleVeinAtArcRatio,
  spawnVeinDustBurst,
  stepVeinDust,
  TOC_HVEIN_HEIGHT,
  TOC_VEIN_WIDTH,
} from './toc-vein'

interface TableOfContentsProps {
  headings: Heading[]
  onItemClick?: () => void
  /** 是否在桌面侧栏附带刊头进度与无框文字工具栏 */
  showRailTools?: boolean
  /** 是否置于移动端抽屉等外层自滚动容器中 */
  inDrawer?: boolean
}

const VEIN_GROW_DURATION_MS = 560

function getScrollMaskImage(edges: { top: boolean; bottom: boolean }): string | undefined {
  if (edges.top && edges.bottom) {
    return 'linear-gradient(to bottom, transparent 0%, black 18px, black calc(100% - 18px), transparent 100%)'
  }
  if (edges.top) {
    return 'linear-gradient(to bottom, transparent 0%, black 18px, black 100%)'
  }
  if (edges.bottom) {
    return 'linear-gradient(to bottom, black 0%, black calc(100% - 18px), transparent 100%)'
  }
  return undefined
}

function measureOffsetTop(el: HTMLElement, ancestor: HTMLElement): number {
  let top = 0
  let current: HTMLElement | null = el
  while (current && current !== ancestor) {
    top += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }
  if (current === ancestor) return top
  return el.getBoundingClientRect().top - ancestor.getBoundingClientRect().top
}

function isReducedMotionPreferred(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isFxMotionAllowed(): boolean {
  return !isReducedMotionPreferred() && readBackdropFxEnabled()
}

/**
 * 文章目录与右侧粘性导轨组件（青脉裂隙 · 墨沁石缝 + 专注横脉微纹）。
 * 1. 常态下按文章目录结构生成确定性垂直岩石主脉与 H3 分叉支脉，松烟墨青随真实章节进度沿石缝渗染。
 * 2. 专注阅读模式（或无标题文章）下平滑折叠目录，切换为横向分形青脉与 H2 矿晶刻度，悬停矿晶在刊头原位预览章名并支持点击直达。
 * 3. 入场裂开与跨章落尘在动画落定后自动停机，静置零耗电；同步响应双主题、FxToggle 与减弱动效偏好。
 */
export function TableOfContents({
  headings,
  onItemClick,
  showRailTools = false,
  inDrawer = false,
}: TableOfContentsProps) {
  const [activeIds, setActiveIds] = useState<string[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoveredHNodeId, setHoveredHNodeId] = useState<string | null>(null)
  const [lastPreviewHNode, setLastPreviewHNode] = useState<HorizontalVeinNodeGeom | null>(null)
  const [hNodes, setHNodes] = useState<HorizontalVeinNodeGeom[]>([])
  const [hTrackWidth, setHTrackWidth] = useState(224)
  const [scrollPercent, setScrollPercent] = useState(0)
  const [copiedLink, setCopiedLink] = useState(false)
  const [scrollEdges, setScrollEdges] = useState({ top: false, bottom: false })
  const { focusMode, toggleFocusMode } = useReaderFocus()

  const containerRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hTrackRef = useRef<HTMLDivElement>(null)
  const hCanvasRef = useRef<HTMLCanvasElement>(null)
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})

  const suppressFollowRef = useRef(false)
  const pendingClickSlugRef = useRef<string>('')
  const activeIdsRef = useRef<string[]>([])
  const primaryActiveIdRef = useRef<string | undefined>(undefined)
  const hoveredIdRef = useRef<string | null>(null)
  const hoveredHNodeIdRef = useRef<string | null>(null)
  const activeHNodeIdRef = useRef<string | undefined>(undefined)
  const scrollRafRef = useRef<number>(0)
  const copyTimerRef = useRef<number>(0)
  const focusModeRef = useRef(focusMode)
  const prevFocusModeRef = useRef(focusMode)

  // 垂直与横向青脉画布动态状态（按需驱动 RAF 并在落定后自动停机）
  const geomRef = useRef<TocVeinGeometry | null>(null)
  const hGeomRef = useRef<HorizontalVeinGeometry | null>(null)
  const growthRef = useRef<number>(0)
  const growStartTsRef = useRef<number | null>(null)
  const targetSeepRef = useRef<number>(0)
  const currentSeepRef = useRef<number>(0)
  const particlesRef = useRef<TocVeinDustParticle[]>([])
  const dustRandRef = useRef<(() => number) | null>(null)
  const veinRafRef = useRef<number>(0)
  const lastFrameTsRef = useRef<number>(0)
  const growDustEmittedRef = useRef<number>(0)

  const hasHeadings = headings.length > 0
  const isCollapsed = showRailTools && focusMode
  const showHorizontalVein = showRailTools && (!hasHeadings || focusMode)
  const primaryActiveId = activeIds[0]
  const veinSeed = useMemo(() => hashTocSeed(headings), [headings])

  // 横向青脉优先展示 H2 章节矿晶（无 H2 时回退至全部标题）
  const horizontalHeadings = useMemo(() => {
    const h2 = headings.filter((h) => h.depth === 2)
    return h2.length > 0 ? h2 : headings
  }, [headings])

  // 当前激活章节映射至横向青脉对应矿晶（阅读 H3 时归属到其上级 H2 矿晶）
  const activeHNodeId = useMemo(() => {
    if (!primaryActiveId || horizontalHeadings.length === 0) return undefined
    if (horizontalHeadings.some((h) => h.id === primaryActiveId)) return primaryActiveId
    const idx = headings.findIndex((h) => h.id === primaryActiveId)
    if (idx < 0) return undefined
    for (let i = idx - 1; i >= 0; i -= 1) {
      if (horizontalHeadings.some((h) => h.id === headings[i].id)) {
        return headings[i].id
      }
    }
    return horizontalHeadings[0]?.id
  }, [headings, horizontalHeadings, primaryActiveId])

  const hoveredHNode = useMemo(
    () => (hoveredHNodeId ? hNodes.find((n) => n.id === hoveredHNodeId) : undefined),
    [hNodes, hoveredHNodeId],
  )

  // 将横脉宽度无缝划分为各矿晶的连续邻域，消除节点间空隙导致的悬停闪烁
  const hNodeZones = useMemo(() => {
    if (hNodes.length === 0) return []
    const totalWidth = Math.max(40, hTrackWidth)
    return hNodes.map((node, index) => {
      const prev = hNodes[index - 1]
      const next = hNodes[index + 1]
      const left = prev ? (prev.x + node.x) * 0.5 : 0
      const right = next ? (node.x + next.x) * 0.5 : totalWidth
      return {
        node,
        left,
        width: Math.max(8, right - left),
      }
    })
  }, [hNodes, hTrackWidth])

  useEffect(() => {
    if (hoveredHNode) {
      setLastPreviewHNode(hoveredHNode)
    }
  }, [hoveredHNode])

  useEffect(() => {
    focusModeRef.current = focusMode
    if (!focusMode) {
      setHoveredHNodeId(null)
    }
  }, [focusMode])

  useEffect(() => {
    hoveredIdRef.current = hoveredId
  }, [hoveredId])

  useEffect(() => {
    hoveredHNodeIdRef.current = hoveredHNodeId
  }, [hoveredHNodeId])

  useEffect(() => {
    activeHNodeIdRef.current = activeHNodeId
  }, [activeHNodeId])

  const getDustRand = useCallback(() => {
    if (!dustRandRef.current) {
      dustRandRef.current = createRandom(veinSeed + 7919)
    }
    return dustRandRef.current
  }, [veinSeed])

  const drawStaticFrame = useCallback(() => {
    const dark = document.documentElement.classList.contains('dark')

    const canvas = canvasRef.current
    const geom = geomRef.current
    if (canvas && geom) {
      renderTocVein(canvas, geom, {
        dark,
        growth: growthRef.current,
        seep: currentSeepRef.current,
        primaryActiveId: activeIdsRef.current[0],
        secondaryActiveIds: new Set(activeIdsRef.current.slice(1)),
        hoveredId: hoveredIdRef.current,
        particles: particlesRef.current,
      })
    }

    const hCanvas = hCanvasRef.current
    const hGeom = hGeomRef.current
    if (hCanvas && hGeom) {
      renderHorizontalVein(hCanvas, hGeom, {
        dark,
        seep: currentSeepRef.current,
        activeNodeId: activeHNodeIdRef.current,
        hoveredNodeId: hoveredHNodeIdRef.current,
      })
    }
  }, [])

  const scheduleVeinFrame = useCallback(() => {
    if (veinRafRef.current) return

    const tick = (now: number) => {
      veinRafRef.current = 0
      const hasVertical = Boolean(canvasRef.current && geomRef.current)
      const hasHorizontal = Boolean(hCanvasRef.current && hGeomRef.current)
      if (!hasVertical && !hasHorizontal) return

      const dt = lastFrameTsRef.current > 0 ? Math.min(0.05, (now - lastFrameTsRef.current) / 1000) : 0.016
      lastFrameTsRef.current = now

      const allowMotion = isFxMotionAllowed()
      let needsNext = false

      // 1. 首次入场裂开生长
      if (hasVertical && growthRef.current < 1) {
        if (!allowMotion) {
          growthRef.current = 1
          growStartTsRef.current = null
        } else {
          if (growStartTsRef.current === null) {
            growStartTsRef.current = now
            growDustEmittedRef.current = 0
          }
          const elapsed = now - growStartTsRef.current
          const rawT = clamp(elapsed / VEIN_GROW_DURATION_MS, 0, 1)
          growthRef.current = 1 - (1 - rawT) ** 2.4

          const geom = geomRef.current
          const milestone = Math.floor(growthRef.current * 4)
          if (geom && milestone > growDustEmittedRef.current && growthRef.current < 0.98) {
            growDustEmittedRef.current = milestone
            const tip = sampleVeinAtArcRatio(geom.main, growthRef.current)
            particlesRef.current.push(...spawnVeinDustBurst(tip.x, tip.y, 3, false, getDustRand()))
          }
          if (growthRef.current < 1) {
            needsNext = true
          }
        }
      }

      // 2. 渗墨前沿平滑逼近目标阅读落点（垂直与横向青脉共享）
      const diff = targetSeepRef.current - currentSeepRef.current
      if (!allowMotion || Math.abs(diff) < 0.0015) {
        currentSeepRef.current = targetSeepRef.current
      } else {
        currentSeepRef.current += diff * Math.min(1, dt * 11)
        needsNext = true
      }

      // 3. 矿物落尘物理推进
      if (particlesRef.current.length > 0) {
        if (!allowMotion) {
          particlesRef.current.length = 0
        } else if (stepVeinDust(particlesRef.current, dt)) {
          needsNext = true
        }
      }

      drawStaticFrame()

      if (needsNext) {
        veinRafRef.current = window.requestAnimationFrame(tick)
      } else {
        lastFrameTsRef.current = 0
      }
    }

    lastFrameTsRef.current = 0
    veinRafRef.current = window.requestAnimationFrame(tick)
  }, [drawStaticFrame, getDustRand])

  const rebuildHorizontalVeinGeometry = useCallback(() => {
    if (!showRailTools || inDrawer) {
      hGeomRef.current = null
      setHNodes([])
      return
    }
    const width = hTrackRef.current?.clientWidth || containerRef.current?.clientWidth || 224
    if (width < 40) return

    const count = horizontalHeadings.length
    const inputs = horizontalHeadings.map((h, i) => ({
      id: h.id,
      text: h.text,
      ratio: count <= 1 ? 0.5 : i / (count - 1),
    }))

    const nextHGeom = buildHorizontalVeinGeometry(width, inputs, veinSeed)
    hGeomRef.current = nextHGeom
    setHTrackWidth(width)
    setHNodes(nextHGeom ? nextHGeom.nodes : [])
    drawStaticFrame()
  }, [drawStaticFrame, horizontalHeadings, inDrawer, showRailTools, veinSeed])

  const rebuildVeinGeometry = useCallback(() => {
    if (isCollapsed) return
    const listEl = listRef.current
    if (!listEl || headings.length === 0) {
      geomRef.current = null
      return
    }
    const height = listEl.offsetHeight
    if (height < 12) return

    const inputs: TocVeinNodeInput[] = []
    for (const heading of headings) {
      const linkEl = linkRefs.current[heading.id]
      if (!linkEl || linkEl.offsetHeight === 0) continue
      const top = measureOffsetTop(linkEl, listEl)
      const bottom = top + linkEl.offsetHeight
      inputs.push({
        id: heading.id,
        depth: heading.depth,
        centerY: top + linkEl.offsetHeight * 0.5,
        top,
        bottom,
      })
    }

    const nextGeom = buildTocVeinGeometry(height, inputs, veinSeed)
    geomRef.current = nextGeom
    if (!nextGeom) return

    if (!isFxMotionAllowed()) {
      growthRef.current = 1
      currentSeepRef.current = targetSeepRef.current
      particlesRef.current.length = 0
      drawStaticFrame()
    } else {
      scheduleVeinFrame()
    }
  }, [drawStaticFrame, headings, isCollapsed, scheduleVeinFrame, veinSeed])

  // 切换文章（veinSeed 变化）时重置入场生长状态与预览缓存
  useEffect(() => {
    dustRandRef.current = createRandom(veinSeed + 7919)
    particlesRef.current.length = 0
    growStartTsRef.current = null
    growDustEmittedRef.current = 0
    growthRef.current = isFxMotionAllowed() ? 0 : 1
    setLastPreviewHNode(null)
  }, [veinSeed])

  useLayoutEffect(() => {
    rebuildVeinGeometry()
    rebuildHorizontalVeinGeometry()
  }, [rebuildVeinGeometry, rebuildHorizontalVeinGeometry])

  useEffect(() => {
    scheduleVeinFrame()
  }, [hoveredId, hoveredHNodeId, activeIds, activeHNodeId, showHorizontalVein, scheduleVeinFrame])

  // 监听明暗主题切换、背景特效开关与字体加载，实时重绘双青脉
  useEffect(() => {
    const handleResize = () => {
      rebuildVeinGeometry()
      rebuildHorizontalVeinGeometry()
    }
    const handleFxChange = () => {
      if (!isFxMotionAllowed()) {
        growthRef.current = 1
        currentSeepRef.current = targetSeepRef.current
        particlesRef.current.length = 0
      }
      drawStaticFrame()
    }

    const observer = new MutationObserver(() => {
      drawStaticFrame()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-backdrop-fx'],
    })

    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
    if (document.fonts?.ready) {
      void document.fonts.ready.then(handleResize)
    }

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
    }
  }, [drawStaticFrame, rebuildVeinGeometry, rebuildHorizontalVeinGeometry])

  useEffect(() => {
    return () => {
      if (veinRafRef.current) {
        window.cancelAnimationFrame(veinRafRef.current)
      }
    }
  }, [])

  const updateScrollEdges = useCallback(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || inDrawer) {
      setScrollEdges((prev) => (prev.top || prev.bottom ? { top: false, bottom: false } : prev))
      return
    }
    const hasOverflow = scrollEl.scrollHeight > scrollEl.clientHeight + 2
    const nextTop = hasOverflow && scrollEl.scrollTop > 4
    const nextBottom = hasOverflow && scrollEl.scrollTop + scrollEl.clientHeight < scrollEl.scrollHeight - 4
    setScrollEdges((prev) =>
      prev.top === nextTop && prev.bottom === nextBottom ? prev : { top: nextTop, bottom: nextBottom },
    )
  }, [inDrawer])

  const ensureLinkVisible = useCallback(
    (id: string) => {
      if (inDrawer || focusModeRef.current) return
      const scrollContainer = scrollRef.current
      if (!scrollContainer || scrollContainer.clientHeight === 0) return
      if (scrollContainer.scrollHeight <= scrollContainer.clientHeight + 1) return

      const link = linkRefs.current[id]
      if (!link) return

      const containerRect = scrollContainer.getBoundingClientRect()
      const linkRect = link.getBoundingClientRect()
      const edgePadding = 40
      const isAbove = linkRect.top < containerRect.top + edgePadding
      const isBelow = linkRect.bottom > containerRect.bottom - edgePadding
      if (!isAbove && !isBelow) return

      const centerOffset = (containerRect.height - linkRect.height) / 2
      const targetScrollTop = scrollContainer.scrollTop + (linkRect.top - containerRect.top) - centerOffset
      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: isReducedMotionPreferred() ? 'auto' : 'smooth',
      })
    },
    [inDrawer],
  )

  useEffect(() => {
    const scrollEl = scrollRef.current
    const listEl = listRef.current
    const hTrackEl = hTrackRef.current

    const releaseFollow = () => {
      suppressFollowRef.current = false
    }

    const updatePositionAndStyle = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const rawScrollRatio = docHeight > 0 ? clamp(window.scrollY / docHeight, 0, 1) : 0
      const nextPercent = Math.round(rawScrollRatio * 100)
      setScrollPercent(nextPercent)

      if (headings.length === 0) {
        targetSeepRef.current = rawScrollRatio
        scheduleVeinFrame()
        return
      }

      const headingElements = headings
        .map((h) => ({ id: h.id, el: document.getElementById(h.id) }))
        .filter((item): item is { id: string; el: HTMLElement } => item.el !== null)

      if (headingElements.length === 0) {
        targetSeepRef.current = rawScrollRatio
        scheduleVeinFrame()
        return
      }

      if (suppressFollowRef.current) {
        const targetHeading = headingElements.find((h) => h.id === pendingClickSlugRef.current)
        const arrived = !targetHeading || Math.abs(targetHeading.el.getBoundingClientRect().top - 100) <= 80
        if (arrived) {
          suppressFollowRef.current = false
        }
      }

      const TOP_OFFSET = 108
      const windowHeight = window.innerHeight
      const article = document.querySelector('article')
      const articleRect = article?.getBoundingClientRect()
      const articleBottom = articleRect ? articleRect.bottom : windowHeight

      let currentActiveIds: string[] = []
      if (suppressFollowRef.current && pendingClickSlugRef.current) {
        currentActiveIds = [pendingClickSlugRef.current]
      } else {
        currentActiveIds = headingElements
          .filter((item, index) => {
            const rangeTop = item.el.getBoundingClientRect().top
            const nextEl = headingElements[index + 1]?.el
            const rangeBottom = nextEl ? nextEl.getBoundingClientRect().top : articleBottom
            return rangeTop < windowHeight && rangeBottom > TOP_OFFSET
          })
          .map((item) => item.id)

        if (currentActiveIds.length === 0 && headingElements.length > 0) {
          const firstTop = headingElements[0].el.getBoundingClientRect().top
          if (firstTop < windowHeight * 0.7 && firstTop > 0) {
            currentActiveIds = [headingElements[0].id]
          }
        }
      }

      // 将文章真实章节位置映射到青脉弧长，确保常态垂直脉与专注横脉的渗墨进度精准咬合
      const activeGeomNodes = focusModeRef.current ? hGeomRef.current?.nodes : geomRef.current?.nodes
      if (activeGeomNodes && activeGeomNodes.length > 0) {
        const atPageBottom = docHeight > 0 && window.scrollY >= docHeight - 4
        if (atPageBottom) {
          targetSeepRef.current = 1
        } else if (window.scrollY <= 4) {
          targetSeepRef.current = 0
        } else {
          const nodeMap = new Map(activeGeomNodes.map((n) => [n.id, n]))
          const mappedElements = headingElements.filter((h) => nodeMap.has(h.id))

          if (mappedElements.length === 0) {
            targetSeepRef.current = rawScrollRatio
          } else {
            const firstRectTop = mappedElements[0].el.getBoundingClientRect().top
            const firstNode = nodeMap.get(mappedElements[0].id)

            if (firstRectTop > TOP_OFFSET && firstNode) {
              const articleTop = articleRect ? articleRect.top : 0
              const introSpan = Math.max(1, firstRectTop - articleTop)
              const introT = clamp((TOP_OFFSET - articleTop) / introSpan, 0, 1)
              targetSeepRef.current = firstNode.arcRatio * introT
            } else {
              let passedIdx = 0
              for (let i = 0; i < mappedElements.length; i += 1) {
                if (mappedElements[i].el.getBoundingClientRect().top <= TOP_OFFSET) {
                  passedIdx = i
                } else {
                  break
                }
              }

              const curEl = mappedElements[passedIdx]
              const nextEl = mappedElements[passedIdx + 1]
              const curNode = nodeMap.get(curEl.id)
              const nextNode = nextEl ? nodeMap.get(nextEl.id) : undefined

              if (curNode && nextEl && nextNode) {
                const curTop = curEl.el.getBoundingClientRect().top
                const nextTop = nextEl.el.getBoundingClientRect().top
                const localT = clamp((TOP_OFFSET - curTop) / Math.max(1, nextTop - curTop), 0, 1)
                targetSeepRef.current = curNode.arcRatio + (nextNode.arcRatio - curNode.arcRatio) * localT
              } else if (curNode) {
                const curTop = curEl.el.getBoundingClientRect().top
                const tailSpan = Math.max(1, articleBottom - windowHeight * 0.45 - curTop)
                const tailT = clamp((TOP_OFFSET - curTop) / tailSpan, 0, 1)
                targetSeepRef.current = curNode.arcRatio + (1 - curNode.arcRatio) * tailT
              } else {
                targetSeepRef.current = rawScrollRatio
              }
            }
          }
        }
      } else {
        targetSeepRef.current = rawScrollRatio
      }

      const prevPrimary = primaryActiveIdRef.current
      const nextPrimary = currentActiveIds[0]
      const isDifferent =
        currentActiveIds.length !== activeIdsRef.current.length ||
        currentActiveIds.some((id, i) => id !== activeIdsRef.current[i])

      if (isDifferent) {
        activeIdsRef.current = currentActiveIds
        primaryActiveIdRef.current = nextPrimary
        setActiveIds(currentActiveIds)

        // 跨入新章节时在垂直青脉节点轻散数粒矿物微尘
        if (
          !focusModeRef.current &&
          prevPrimary &&
          nextPrimary &&
          prevPrimary !== nextPrimary &&
          isFxMotionAllowed() &&
          geomRef.current
        ) {
          const hitNode = geomRef.current.nodes.find((n) => n.id === nextPrimary)
          if (hitNode && particlesRef.current.length < 28) {
            particlesRef.current.push(...spawnVeinDustBurst(hitNode.anchorX, hitNode.anchorY, 4, true, getDustRand()))
          }
        }

        if (currentActiveIds.length > 0 && !suppressFollowRef.current) {
          ensureLinkVisible(currentActiveIds[0])
        }
      }

      scheduleVeinFrame()
    }

    const scheduleUpdate = () => {
      if (scrollRafRef.current) return
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = 0
        updatePositionAndStyle()
      })
    }

    updatePositionAndStyle()
    updateScrollEdges()
    const timer1 = window.setTimeout(updatePositionAndStyle, 100)
    const timer2 = window.setTimeout(updatePositionAndStyle, 300)
    const timer3 = window.setTimeout(updatePositionAndStyle, 600)

    const contentElement = document.querySelector('article')
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleUpdate()
        updateScrollEdges()
        rebuildVeinGeometry()
        rebuildHorizontalVeinGeometry()
      })
      if (contentElement) resizeObserver.observe(contentElement)
      if (scrollEl) resizeObserver.observe(scrollEl)
      if (listEl) resizeObserver.observe(listEl)
      if (hTrackEl) resizeObserver.observe(hTrackEl)
    }

    scrollEl?.addEventListener('scroll', updateScrollEdges, { passive: true })
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('resize', updateScrollEdges)
    window.addEventListener('wheel', releaseFollow, { passive: true })
    window.addEventListener('touchstart', releaseFollow, { passive: true })
    window.addEventListener('keydown', releaseFollow)

    return () => {
      window.clearTimeout(timer1)
      window.clearTimeout(timer2)
      window.clearTimeout(timer3)
      scrollEl?.removeEventListener('scroll', updateScrollEdges)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('resize', updateScrollEdges)
      window.removeEventListener('wheel', releaseFollow)
      window.removeEventListener('touchstart', releaseFollow)
      window.removeEventListener('keydown', releaseFollow)
      resizeObserver?.disconnect()
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current)
      }
    }
  }, [
    headings,
    ensureLinkVisible,
    updateScrollEdges,
    rebuildVeinGeometry,
    rebuildHorizontalVeinGeometry,
    scheduleVeinFrame,
    getDustRand,
  ])

  useEffect(() => {
    const wasFocused = prevFocusModeRef.current
    prevFocusModeRef.current = focusMode
    if (wasFocused === focusMode) return

    if (focusMode) {
      const frameId = window.requestAnimationFrame(() => {
        rebuildHorizontalVeinGeometry()
        scheduleVeinFrame()
      })
      return () => window.cancelAnimationFrame(frameId)
    }

    const frameId = window.requestAnimationFrame(() => {
      updateScrollEdges()
      rebuildVeinGeometry()
      if (activeIdsRef.current[0]) {
        ensureLinkVisible(activeIdsRef.current[0])
      }
    })
    const settleTimer = window.setTimeout(() => {
      updateScrollEdges()
      rebuildVeinGeometry()
    }, 450)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(settleTimer)
    }
  }, [
    focusMode,
    ensureLinkVisible,
    updateScrollEdges,
    rebuildVeinGeometry,
    rebuildHorizontalVeinGeometry,
    scheduleVeinFrame,
  ])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  const jumpToHeading = (id: string) => {
    const target = document.getElementById(id)
    if (!target) return

    suppressFollowRef.current = true
    pendingClickSlugRef.current = id
    activeIdsRef.current = [id]
    primaryActiveIdRef.current = id
    setActiveIds([id])

    if (focusModeRef.current && hGeomRef.current) {
      const hitH = hGeomRef.current.nodes.find((n) => n.id === id)
      if (hitH) {
        targetSeepRef.current = hitH.arcRatio
        scheduleVeinFrame()
      }
    } else if (isFxMotionAllowed() && geomRef.current) {
      const hitNode = geomRef.current.nodes.find((n) => n.id === id)
      if (hitNode) {
        targetSeepRef.current = hitNode.arcRatio
        if (particlesRef.current.length < 28) {
          particlesRef.current.push(...spawnVeinDustBurst(hitNode.anchorX, hitNode.anchorY, 5, true, getDustRand()))
        }
        scheduleVeinFrame()
      }
    }

    target.scrollIntoView({ behavior: isReducedMotionPreferred() ? 'auto' : 'smooth', block: 'start' })

    if (onItemClick) {
      onItemClick()
    }
  }

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    jumpToHeading(id)
  }

  const handleCopyPermalink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }
      copyTimerRef.current = window.setTimeout(setCopiedLink, 1800, false)
    } catch {
      // 忽略剪贴板权限错误
    }
  }

  const scrollToComments = () => {
    document.getElementById('comments')?.scrollIntoView({
      behavior: isReducedMotionPreferred() ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: isReducedMotionPreferred() ? 'auto' : 'smooth' })
  }

  const maskImage = !inDrawer ? getScrollMaskImage(scrollEdges) : undefined
  const showHeader = !inDrawer && (hasHeadings || showRailTools)
  const isPreviewingHNode = Boolean(showHorizontalVein && hoveredHNode)
  const displayedHNode = hoveredHNode ?? lastPreviewHNode

  return (
    <nav
      ref={containerRef}
      aria-label="文章目录"
      className={`select-none text-xs leading-relaxed ${
        showRailTools
          ? 'transition-opacity duration-300 group-data-[reader-focus=true]/reader:opacity-75 group-data-[reader-focus=true]/reader:hover:opacity-100 group-data-[reader-focus=true]/reader:focus-within:opacity-100'
          : ''
      }`}
    >
      {/* 刊头：锁定 h-5 高度防止切换字号时纵跳；悬停横脉矿晶时双层柔和叠化预览章节名 */}
      {showHeader && (
        <div
          className={`flex h-7 items-center justify-between gap-2 transition-[padding,border-color] duration-300 ${
            showHorizontalVein ? 'pb-1' : 'border-b border-hair pb-2'
          }`}
        >
          <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
            <span
              aria-hidden={isPreviewingHNode ? true : undefined}
              className={`absolute inset-0 flex items-center font-mono text-[11px] leading-none tracking-wider text-muted-foreground transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity ${
                isPreviewingHNode ? '-translate-y-1.5 opacity-0' : 'translate-y-0 opacity-100'
              }`}
            >
              <span className="min-w-0 truncate">{showHorizontalVein ? '阅读进度' : '目录'}</span>
            </span>

            {showHorizontalVein && displayedHNode && (
              <span
                key={displayedHNode.id}
                aria-hidden={!isPreviewingHNode ? true : undefined}
                className={`absolute inset-0 flex items-center font-sans text-[12px] font-medium leading-none text-primary transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity ${
                  isPreviewingHNode ? 'toc-label-in translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
                }`}
              >
                <span className="min-w-0 truncate">{displayedHNode.text}</span>
              </span>
            )}
          </div>

          {showRailTools && (
            <span
              aria-label={`阅读进度 ${scrollPercent}%`}
              className="shrink-0 font-mono text-[11px] leading-none tabular-nums text-foreground/80"
            >
              {scrollPercent}%
            </span>
          )}
        </div>
      )}

      {/* 专注模式 / 无标题文章：横脉微纹 · 墨沁石脊（连续邻域热点，无空隙闪烁） */}
      {showRailTools && !inDrawer && (
        <div
          inert={!showHorizontalVein ? true : undefined}
          aria-hidden={!showHorizontalVein ? true : undefined}
          className={`grid transition-[grid-template-rows,opacity] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-opacity motion-reduce:duration-150 ${
            showHorizontalVein
              ? 'grid-rows-[1fr] opacity-100 [transition-duration:360ms,280ms]'
              : 'pointer-events-none grid-rows-[0fr] opacity-0 [transition-duration:260ms,160ms]'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              ref={hTrackRef}
              style={{ height: `${TOC_HVEIN_HEIGHT}px` }}
              onMouseLeave={() => setHoveredHNodeId(null)}
              onBlurCapture={(e) => {
                const next = e.relatedTarget
                if (!(next instanceof Node) || !hTrackRef.current?.contains(next)) {
                  setHoveredHNodeId(null)
                }
              }}
              className="relative w-full"
            >
              <canvas ref={hCanvasRef} aria-hidden="true" className="pointer-events-none block size-full" />

              {hNodeZones.map(({ node, left, width }) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => jumpToHeading(node.id)}
                  onMouseEnter={() => setHoveredHNodeId(node.id)}
                  onFocus={() => setHoveredHNodeId(node.id)}
                  aria-label={`跳转到章节：${node.text}`}
                  aria-current={node.id === activeHNodeId ? 'location' : undefined}
                  style={{
                    left: `${left}px`,
                    width: `${width}px`,
                  }}
                  className="absolute inset-y-0 cursor-pointer rounded-xs focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 常态垂直青脉目录区（专注阅读时平滑折叠，不闪烁） */}
      {hasHeadings && (
        <div
          inert={isCollapsed ? true : undefined}
          aria-hidden={isCollapsed ? true : undefined}
          className={`grid transition-[grid-template-rows,opacity] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-opacity motion-reduce:duration-150 ${
            isCollapsed
              ? 'pointer-events-none grid-rows-[0fr] opacity-0 [transition-duration:380ms,220ms]'
              : 'grid-rows-[1fr] opacity-100 [transition-duration:440ms,320ms]'
          }`}
        >
          <div className={inDrawer ? 'min-h-0' : 'min-h-0 -mx-1.5 overflow-hidden px-1.5'}>
            <div
              ref={scrollRef}
              style={maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined}
              className={
                inDrawer
                  ? 'py-0.5'
                  : showRailTools
                    ? 'no-scrollbar -mx-1 max-h-[min(56vh,calc(100vh-16.5rem))] overflow-y-auto px-1 py-2.5'
                    : 'no-scrollbar -mx-1 max-h-[calc(100vh-10rem)] overflow-y-auto px-1 py-2.5'
              }
            >
              <ul ref={listRef} className="relative flex flex-col">
                <canvas
                  ref={canvasRef}
                  aria-hidden="true"
                  style={{ width: `${TOC_VEIN_WIDTH}px` }}
                  className="pointer-events-none absolute top-0 bottom-0 left-0 h-full"
                />

                {headings.map((heading, index) => {
                  const isPrimaryActive = heading.id === primaryActiveId
                  const isSecondaryActive = !isPrimaryActive && activeIds.includes(heading.id)
                  const isSubHeading = heading.depth === 3
                  const enterDelay = `${60 + Math.min(index, 8) * 16}ms`
                  const exitDelay = `${Math.min(index, 6) * 14}ms`

                  return (
                    <li
                      key={heading.id}
                      style={{ '--toc-ripple-delay': isCollapsed ? exitDelay : enterDelay } as CSSProperties}
                      className={`transition-[opacity,translate] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity ${
                        isCollapsed
                          ? 'pointer-events-none -translate-x-2 opacity-0 duration-150 [transition-delay:var(--toc-ripple-delay)]'
                          : 'translate-x-0 opacity-100 duration-[260ms] [transition-delay:var(--toc-ripple-delay)]'
                      }`}
                    >
                      <a
                        ref={(el) => {
                          linkRefs.current[heading.id] = el
                        }}
                        href={`#${heading.id}`}
                        onClick={(e) => handleLinkClick(e, heading.id)}
                        onMouseEnter={() => setHoveredId(heading.id)}
                        onMouseLeave={() => setHoveredId((prev) => (prev === heading.id ? null : prev))}
                        onFocus={() => setHoveredId(heading.id)}
                        onBlur={() => setHoveredId((prev) => (prev === heading.id ? null : prev))}
                        title={heading.text}
                        aria-current={isPrimaryActive ? 'location' : undefined}
                        className={`ink-glide block rounded-sm text-left leading-[1.45] hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                          isSubHeading ? 'py-1 pl-7.5 text-[12px]' : 'py-1.5 pl-6 text-[13px]'
                        } ${
                          isPrimaryActive
                            ? 'font-medium text-primary'
                            : isSecondaryActive
                              ? 'text-foreground/85 hover:text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="line-clamp-2 min-w-0 [overflow-wrap:anywhere]">{heading.text}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>

            {showRailTools && <div aria-hidden="true" className="border-t border-hair" />}
          </div>
        </div>
      )}

      {/* 底部无框排印操作条 */}
      {showRailTools && (
        <div
          className={`flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground ${
            showHorizontalVein ? 'pt-2' : 'pt-3'
          }`}
        >
          <div className="flex items-center">
            <button
              type="button"
              onClick={toggleFocusMode}
              title={focusMode ? '退出专注阅读' : '开启专注阅读'}
              aria-label={focusMode ? '退出专注阅读' : '开启专注阅读'}
              aria-pressed={focusMode}
              data-active={focusMode ? 'true' : undefined}
              className={`group/ink hit-expand inline-flex cursor-pointer items-center whitespace-nowrap transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                focusMode ? 'font-medium text-primary' : ''
              }`}
            >
              <span className="ink-line">{focusMode ? '退出' : '专注'}</span>
            </button>

            <span aria-hidden="true" className="mx-1.5 text-muted-foreground/30">
              ·
            </span>

            <button
              type="button"
              onClick={handleCopyPermalink}
              title={copiedLink ? '链接已复制' : '复制文章链接'}
              aria-label={copiedLink ? '链接已复制' : '复制文章链接'}
              className={`group/ink hit-expand inline-flex cursor-pointer items-center whitespace-nowrap transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                copiedLink ? 'text-primary' : ''
              }`}
            >
              <span className="ink-line">{copiedLink ? '已复制' : '复制'}</span>
            </button>

            <span aria-hidden="true" className="mx-1.5 text-muted-foreground/30">
              ·
            </span>

            <button
              type="button"
              onClick={scrollToComments}
              title="前往评论区"
              aria-label="前往评论区"
              className="group/ink hit-expand inline-flex cursor-pointer items-center whitespace-nowrap transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="ink-line">评论</span>
            </button>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            tabIndex={scrollPercent > 4 ? 0 : -1}
            aria-hidden={scrollPercent <= 4 ? true : undefined}
            aria-label="回到顶部"
            className={`group/ink hit-expand inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap transition-[opacity,color] duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              scrollPercent > 4 ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <ArrowUp
              aria-hidden="true"
              className="ink-glide size-3 group-hover/ink:-translate-y-0.5"
              strokeWidth={1.75}
            />
            <span className="ink-line">顶部</span>
          </button>

          <span className="sr-only" aria-live="polite">
            {copiedLink ? '链接已复制' : ''}
          </span>
        </div>
      )}
    </nav>
  )
}
