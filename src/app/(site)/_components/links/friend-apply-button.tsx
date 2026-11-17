'use client'

import { useState } from 'react'
import { FriendApplyModal } from './friend-apply-modal'

interface FriendApplyButtonProps {
  className?: string
  children?: React.ReactNode
}

/**
 * 唤起友链申请弹窗的无框排版触发器。
 */
export function FriendApplyButton({ className, children }: FriendApplyButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          'group/ink inline-flex w-fit cursor-pointer items-center gap-1.5 py-1 font-mono text-xs text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
        }
      >
        {children ?? (
          <>
            <span className="ink-line">申请友链</span>
            <span
              aria-hidden="true"
              className="ink-glide group-hover/ink:translate-x-0.5 group-hover/ink:-translate-y-0.5"
            >
              ↗
            </span>
          </>
        )}
      </button>

      <FriendApplyModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
