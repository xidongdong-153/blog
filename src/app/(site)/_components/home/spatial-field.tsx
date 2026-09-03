'use client'

import { Mesh, Program, Renderer, Triangle } from 'ogl'
import { useEffect, useRef } from 'react'

const VERTEX_SHADER = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uThemeMode; // 0.0 = Light (Computational Paper), 1.0 = Dark (Dark Spatial Field)
uniform vec2 uMouse;
uniform float uMouseActive;
uniform float uMouseStrength;
uniform float uDensity;
uniform float uLineWidth;

out vec4 fragColor;

mat2 rot2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

// 标量势场计算：结合多频简谐波与低频空间域翘曲
float computeField(vec2 p, float t, vec2 mPos, float mActive) {
  // 鼠标空间度规扰动（柔和凹陷，无光圈无吸附）
  vec2 toMouse = p - mPos;
  float mDistSq = dot(toMouse, toMouse);
  float mInfluence = exp(-mDistSq * 8.0) * mActive * uMouseStrength;
  vec2 pWarped = p + (toMouse / (sqrt(mDistSq) + 0.18)) * mInfluence * 0.2;

  float tSlow = t * 0.14;
  vec2 q = pWarped * 0.92;
  q = rot2d(0.24) * q;

  // 低频域翘曲（Domain Warping）
  vec2 warp = vec2(
    sin(q.y * 1.7 + tSlow * 0.65 + 0.5),
    cos(q.x * 1.5 - tSlow * 0.75 + 1.2)
  );

  vec2 r = q + warp * 0.36;

  float val = sin(r.x * 2.1 + tSlow * 0.45) * cos(r.y * 1.9 - tSlow * 0.55);
  val += 0.42 * sin((r.x + r.y) * 3.2 - tSlow * 0.35 + 1.8);
  val += 0.20 * cos(length(r * 1.4) * 4.0 - tSlow * 0.3);

  return val;
}

// 连续平滑场流线与拓扑空间
void main() {
  vec2 res = max(uResolution, vec2(1.0));
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  vec2 mouseUV = (uMouse - 0.5 * res) / min(res.x, res.y);

  float field = computeField(uv, uTime, mouseUV, uMouseActive);

  // 等高线拓扑与抗锯齿渲染
  float scaledField = field * uDensity;
  float fracField = fract(scaledField);
  float distToLine = abs(fracField - 0.5);

  float fw = max(fwidth(scaledField), 0.0006);
  float line = 1.0 - smoothstep(0.0, fw * uLineWidth, distToLine);

  // 主等值线（每 4 条强化一层）
  float majorFrac = fract(scaledField * 0.25);
  float majorDist = abs(majorFrac - 0.5);
  float majorFw = max(fwidth(scaledField * 0.25), 0.0004);
  float majorLine = 1.0 - smoothstep(0.0, majorFw * (uLineWidth * 1.3), majorDist);

  // 1. 浅色模式：极淡流线墨迹，如轻透纸面上的数学拓扑，无多余网格线框
  vec3 lightLineColor = vec3(0.18, 0.20, 0.25);
  float lightAlpha = (line * 0.09 + majorLine * 0.07);

  // 2. 深色模式：冷钢蓝与青灰力场线，弱节点微光自然呼吸
  vec3 darkBaseLine = vec3(0.20, 0.32, 0.46);
  vec3 darkHighLine = vec3(0.44, 0.74, 0.88);
  vec3 darkLineColor = mix(darkBaseLine, darkHighLine, clamp(field * 0.5 + 0.5, 0.0, 1.0));

  // 弱能量凝聚节点
  float nodeEnergy = exp(-abs(field) * 3.8);
  vec3 darkNodeGlow = vec3(0.32, 0.58, 0.76) * (nodeEnergy * 0.12 * line);

  float darkAlpha = (line * 0.18 + majorLine * 0.12);

  // 主题渐变插值
  vec3 finalColor = mix(lightLineColor, darkLineColor + darkNodeGlow, uThemeMode);
  float finalAlpha = mix(lightAlpha, darkAlpha, uThemeMode);

  // 边缘全方向柔和自然弥散，底部平滑融入正文，完全无矩形或线框切边
  float normY = gl_FragCoord.y / res.y;
  float bottomFade = smoothstep(0.02, 0.32, normY);
  float topFade = smoothstep(0.0, 0.18, 1.0 - normY);
  float sideFade = smoothstep(0.0, 0.12, min(gl_FragCoord.x / res.x, 1.0 - gl_FragCoord.x / res.x));
  float naturalVignette = bottomFade * topFade * sideFade;

  finalAlpha *= naturalVignette;

  fragColor = vec4(finalColor * finalAlpha, finalAlpha);
}
`

interface SpatialFieldProps {
  className?: string
}

/**
 * 首页 Hero 区域动态空间场背景组件。
 *
 * 基于 WebGL (ogl) 统一实现双主题渲染：
 * - Light: 极细拓扑墨线与工程图纸标度 (Spatial Paper)
 * - Dark: 冷钢蓝计算场线与弱节点微光 (Dark Spatial Field)
 *
 * 性能保障：
 * - 限制 DPR 最大为 2，移动端降为 1
 * - IntersectionObserver 离开视口立即停止 rAF
 * - document.visibilitychange 标签页切后台立即暂停
 * - prefers-reduced-motion 下仅渲染静态一帧
 * - 所有动态参数在 rAF 内部更新，无 React 每帧 setState
 */
export function SpatialField({ className = '' }: SpatialFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 检测移动端与 Reduced Motion
    const isMobile = window.innerWidth < 768
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let prefersReducedMotion = reducedMotionQuery.matches

    // DPR 配置：移动端限制为 1.0，桌面端最多 2.0
    const dpr = isMobile ? 1.0 : Math.min(window.devicePixelRatio || 1, 2)

    let renderer: Renderer | null = null
    let gl: Renderer['gl'] | null = null

    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        dpr,
      })
      gl = renderer.gl
    } catch {
      return
    }

    gl.clearColor(0, 0, 0, 0)
    const canvas = gl.canvas as HTMLCanvasElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.style.pointerEvents = 'none'
    container.appendChild(canvas)

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        uResolution: { value: new Float32Array([1, 1]) },
        uTime: { value: 12.0 },
        uThemeMode: { value: 0.0 },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseActive: { value: 0.0 },
        uMouseStrength: { value: 0.35 },
        uDensity: { value: isMobile ? 18.0 : 26.0 },
        uLineWidth: { value: 1.2 },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })

    // 检测当前是否暗色主题
    const checkIsDark = () => {
      return (
        document.documentElement.classList.contains('dark') ||
        document.documentElement.dataset.theme === 'dark' ||
        (document.documentElement.dataset.theme === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      )
    }

    let targetTheme = checkIsDark() ? 1.0 : 0.0
    let currentTheme = targetTheme
    program.uniforms.uThemeMode.value = currentTheme

    // 观察主题变化，实现平滑过渡
    const themeObserver = new MutationObserver(() => {
      targetTheme = checkIsDark() ? 1.0 : 0.0
      if (prefersReducedMotion && renderer) {
        currentTheme = targetTheme
        program.uniforms.uThemeMode.value = currentTheme
        renderer.render({ scene: mesh })
      }
    })

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })

    const mediaScheme = window.matchMedia('(prefers-color-scheme: dark)')
    const onSchemeChange = () => {
      targetTheme = checkIsDark() ? 1.0 : 0.0
      if (prefersReducedMotion && renderer) {
        currentTheme = targetTheme
        program.uniforms.uThemeMode.value = currentTheme
        renderer.render({ scene: mesh })
      }
    }
    mediaScheme.addEventListener('change', onSchemeChange)

    // 调整尺寸
    const setSize = () => {
      if (!container || !renderer || !gl) return
      const rect = container.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      renderer.setSize(w, h)
      const res = program.uniforms.uResolution.value as Float32Array
      res[0] = gl.drawingBufferWidth
      res[1] = gl.drawingBufferHeight
      renderer.render({ scene: mesh })
    }

    const ro = new ResizeObserver(setSize)
    ro.observe(container)
    setSize()

    // 鼠标微扰动坐标计算
    const currentMouse = [0.5, 0.5]
    const targetMouse = [0.5, 0.5]
    let mouseActive = 0.0
    let mouseActiveTarget = 0.0

    const onPointerMove = (e: PointerEvent) => {
      if (isMobile) return
      const rect = container.getBoundingClientRect()
      targetMouse[0] = (e.clientX - rect.left) * dpr
      targetMouse[1] = (rect.bottom - e.clientY) * dpr
      mouseActiveTarget = 1.0
    }

    const onPointerLeave = () => {
      mouseActiveTarget = 0.0
    }

    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerleave', onPointerLeave)

    // 动画循环控制
    let rafId = 0
    let isIntersecting = true
    let isDocumentVisible = !document.hidden
    const startTime = performance.now()

    const loop = (t: number) => {
      if (prefersReducedMotion || !renderer) return

      const elapsed = (t - startTime) * 0.001
      program.uniforms.uTime.value = elapsed

      // 主题平滑阻尼插值（300ms 左右过渡）
      if (Math.abs(targetTheme - currentTheme) > 0.002) {
        currentTheme += (targetTheme - currentTheme) * 0.08
        program.uniforms.uThemeMode.value = currentTheme
      }

      // 鼠标平滑插值
      currentMouse[0] += (targetMouse[0] - currentMouse[0]) * 0.06
      currentMouse[1] += (targetMouse[1] - currentMouse[1]) * 0.06
      const m = program.uniforms.uMouse.value as Float32Array
      m[0] = currentMouse[0]
      m[1] = currentMouse[1]

      mouseActive += (mouseActiveTarget - mouseActive) * 0.05
      program.uniforms.uMouseActive.value = mouseActive

      renderer.render({ scene: mesh })
      rafId = requestAnimationFrame(loop)
    }

    const startLoop = () => {
      if (!prefersReducedMotion && isIntersecting && isDocumentVisible && rafId === 0) {
        rafId = requestAnimationFrame(loop)
      }
    }

    const stopLoop = () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    }

    // Reduced Motion 监听
    const onReducedMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches
      if (prefersReducedMotion) {
        stopLoop()
        program.uniforms.uTime.value = 12.0
        renderer?.render({ scene: mesh })
      } else {
        startLoop()
      }
    }
    reducedMotionQuery.addEventListener('change', onReducedMotionChange)

    // 离开视口暂停
    const io = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting
        if (isIntersecting) {
          startLoop()
        } else {
          stopLoop()
        }
      },
      { threshold: 0.05 },
    )
    io.observe(container)

    // 标签页后台暂停
    const onVisibilityChange = () => {
      isDocumentVisible = !document.hidden
      if (isDocumentVisible) {
        startLoop()
      } else {
        stopLoop()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    if (prefersReducedMotion) {
      program.uniforms.uTime.value = 12.0
      renderer.render({ scene: mesh })
    } else {
      startLoop()
    }

    return () => {
      stopLoop()
      ro.disconnect()
      io.disconnect()
      themeObserver.disconnect()
      mediaScheme.removeEventListener('change', onSchemeChange)
      reducedMotionQuery.removeEventListener('change', onReducedMotionChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)

      try {
        container.removeChild(canvas)
      } catch {
        // 忽略移除节点异常
      }

      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-auto absolute inset-0 overflow-hidden select-none ${className}`.trim()}
    />
  )
}
