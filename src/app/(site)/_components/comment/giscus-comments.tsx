'use client'

import { useEffect, useRef } from 'react'

/**
 * 获取当前页面实际生效的明暗主题。
 * 读取 document.documentElement 上的 dark 类名。
 */
function getEffectiveTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
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
    script.setAttribute('data-theme', getEffectiveTheme())
    script.setAttribute('data-lang', lang)
    script.setAttribute('data-loading', 'lazy')
    script.crossOrigin = 'anonymous'
    script.async = true

    container.appendChild(script)

    function syncTheme() {
      const theme = getEffectiveTheme()
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
