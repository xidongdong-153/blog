'use client'

import { useState } from 'react'
import { FriendApplyModal } from './friend-apply-modal'

interface FriendApplyButtonProps {
  className?: string
  children?: React.ReactNode
}

/**
 * 唤起友链申请弹窗的交互按钮
 */
export function FriendApplyButton({
  className,
  children = (
    <>
      申请友链
      <span aria-hidden="true">↗</span>
    </>
  ),
}: FriendApplyButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          'inline-flex w-fit items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs text-foreground motion-safe:transition-colors hover:border-foreground/30 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        }
      >
        {children}
      </button>

      <FriendApplyModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
