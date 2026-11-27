'use client'

import type { FriendLinkItem } from '@/server/modules/links/links.types'
import { useState } from 'react'
import { FriendApplyButton } from './friend-apply-button'
import { FriendLinksDirectory } from './friend-links-directory'
import { FriendsVeinStage } from './friends-vein-stage'
import { RandomFriendButton } from './random-friend-button'

type LinksViewMode = 'vein' | 'list'

/**
 * 友链页面主展示区，默认展示分形石脉图形视图，支持与单列列表视图切换，并提供随机访问与申请入口。
 */
export function LinksShowcase({ links }: { links: FriendLinkItem[] }) {
  const [view, setView] = useState<LinksViewMode>('vein')

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      {/* 页面头：左标题、数量与排序说明 + 右视图切换与操作入口 */}
      <header className="flex flex-col justify-between gap-4 border-b border-hair pb-6 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-3">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">友链</h1>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{links.length} 个</span>
          </div>
          {links.length > 0 && <p className="text-xs text-muted-foreground">按加入时间先后排序，无优先级之分。</p>}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {links.length > 0 && (
            <div role="group" aria-label="切换展示方式" className="inline-flex items-center gap-2.5 font-mono text-xs">
              <button
                type="button"
                aria-pressed={view === 'vein'}
                data-active={view === 'vein' ? 'true' : undefined}
                onClick={() => setView('vein')}
                className={`group/ink hit-expand inline-flex min-h-9 cursor-pointer items-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  view === 'vein' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="ink-line">图形</span>
              </button>
              <span aria-hidden="true" className="text-muted-foreground/40">
                /
              </span>
              <button
                type="button"
                aria-pressed={view === 'list'}
                data-active={view === 'list' ? 'true' : undefined}
                onClick={() => setView('list')}
                className={`group/ink hit-expand inline-flex min-h-9 cursor-pointer items-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  view === 'list' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="ink-line">列表</span>
              </button>
            </div>
          )}

          <RandomFriendButton urls={links.map((link) => link.url)} />
          <FriendApplyButton className="group/ink hit-expand inline-flex min-h-9 cursor-pointer items-center gap-1.5 font-mono text-xs text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        </div>
      </header>

      {links.length === 0 ? (
        <p className="py-8 text-sm leading-relaxed text-muted-foreground">暂无友链。</p>
      ) : view === 'vein' ? (
        <FriendsVeinStage links={links} />
      ) : (
        <FriendLinksDirectory links={links} />
      )}
    </div>
  )
}
