'use client'

import type { RefObject } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { Button } from '../ui/button'

export function PostConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  busy,
  variant = 'default',
  returnFocusRef,
  originRectRef,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  busy: boolean
  variant?: 'default' | 'destructive'
  returnFocusRef?: RefObject<HTMLElement | null>
  originRectRef?: RefObject<DOMRect | null>
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <AlertDialog
      triggerRef={returnFocusRef}
      originRectRef={originRectRef}
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose()
      }}
    >
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault()
        }}
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef?.current
          if (target?.isConnected) {
            event.preventDefault()
            target.focus()
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="break-words leading-relaxed">{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
          <Button variant={variant} pending={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
