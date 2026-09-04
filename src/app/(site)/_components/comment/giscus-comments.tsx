'use client'

import { useEffect, useRef } from 'react'

/**
 * 获取适用于 Giscus 的主题参数。
 *
 * 规则：
 * 1. 本地开发环境（localhost 或 HTTP）由于跨域加载本地 CSS 会被 HTTPS iframe 混合内容（Mixed Content）阻断，
 *    安全回退到 Giscus 内置的 'light' 与 'dark' 主题。
 * 2. 线上生产环境（HTTPS）提供绝对路径链接指向 /themes/giscus-light.css 或 /themes/giscus-dark.css。
 */
function getGiscusTheme(): string {
  if (typeof window === 'undefined') return 'light'
  const isDark = document.documentElement.classList.contains('dark')

  const hostname = window.location.hostname
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || window.location.protocol === 'http:'

  if (isLocal) {
    return isDark ? 'dark' : 'light'
  }

  const origin = window.location.origin
  return isDark ? `${origin}/themes/giscus-dark.css` : `${origin}/themes/giscus-light.css`
}

/**
 * Giscus 评论组件。
 *
 * 基于 GitHub Discussions 实现。支持通过 NEXT_PUBLIC_GISCUS_* 环境变量配置，
 * 并通过 MutationObserver 与 postMessage 实时跟随全站三态主题切换。
 */
export function GiscusComments() {
  const containerRef = useRef<HTMLDivElement>(null)

  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY || 'General'
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID
  const mapping = process.env.NEXT_PUBLIC_GISCUS_MAPPING || 'pathname'
  const reactionsEnabled = process.env.NEXT_PUBLIC_GISCUS_REACTIONS_ENABLED || '1'
  const inputPosition = process.env.NEXT_PUBLIC_GISCUS_INPUT_POSITION || 'top'
  const lang = process.env.NEXT_PUBLIC_GISCUS_LANG || 'zh-CN'

  const isConfigured = Boolean(repo && repoId && categoryId)

  useEffect(() => {
    if (!isConfigured || !containerRef.current) return

    const container = containerRef.current
    // 清空历史内容，避免热重载重复注入
    container.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://giscus.app/client.js'
    script.setAttribute('data-repo', repo!)
    script.setAttribute('data-repo-id', repoId!)
    script.setAttribute('data-category', category)
    script.setAttribute('data-category-id', categoryId!)
    script.setAttribute('data-mapping', mapping)
    script.setAttribute('data-strict', '0')
    script.setAttribute('data-reactions-enabled', reactionsEnabled)
    script.setAttribute('data-emit-metadata', '0')
    script.setAttribute('data-input-position', inputPosition)
    script.setAttribute('data-theme', getGiscusTheme())
    script.setAttribute('data-lang', lang)
    script.setAttribute('data-loading', 'lazy')
    script.crossOrigin = 'anonymous'
    script.async = true

    container.appendChild(script)

    function syncTheme() {
      const theme = getGiscusTheme()
      const iframe = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            giscus: {
              setConfig: {
                theme,
              },
            },
          },
          'https://giscus.app',
        )
      }
    }

    const observer = new MutationObserver(() => {
      syncTheme()
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', syncTheme)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', syncTheme)
      container.innerHTML = ''
    }
  }, [category, categoryId, inputPosition, isConfigured, lang, mapping, reactionsEnabled, repo, repoId])

  return (
    <section aria-label="评论区" className="border-t border-border pt-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">评论</h2>
      </div>

      {!isConfigured ? (
        <div className="rounded-lg border border-border/60 bg-card/30 p-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">评论区尚未配置</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            在 <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">.env.local</code> 中配置{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_GISCUS_REPO</code>、
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_GISCUS_REPO_ID</code>、
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_GISCUS_CATEGORY_ID</code>{' '}
            即可启用 GitHub Discussions 评论。
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="min-h-[280px]" />
      )}
    </section>
  )
}
