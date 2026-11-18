'use client'

import type { RefObject } from 'react'
import { useOverlayMotion } from './use-overlay-motion'

/** 搜索浮层共用展开与收回逻辑，展开期间隐藏原按钮。 */
export function useSearchMotion(isOpen: boolean, mounted: boolean, triggerRef: RefObject<HTMLButtonElement | null>) {
  const { surfaceRef, ...motion } = useOverlayMotion({
    open: isOpen,
    ready: mounted,
    triggerRef,
    hideTrigger: true,
  })
  return { ...motion, dialogRef: surfaceRef }
}
