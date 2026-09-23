'use client'

import { useRef, type ReactNode } from 'react'
import { Button } from './button'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  /** The element that triggers the dialog to open */
  children: ReactNode
  /** Variant for confirm button — defaults to 'danger' */
  variant?: 'primary' | 'danger'
}

/**
 * A confirmation dialog built on the native HTML <dialog> element.
 * No external dependencies. Opens on trigger click; calls onConfirm on confirm.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  variant = 'danger',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  function open() {
    dialogRef.current?.showModal()
  }

  function close() {
    dialogRef.current?.close()
  }

  function handleConfirm() {
    close()
    onConfirm()
  }

  return (
    <>
      {/* Trigger — clone children to attach onClick */}
      <span onClick={open} role="presentation">
        {children}
      </span>

      <dialog
        ref={dialogRef}
        className="border-border bg-surface shadow-pop rounded-xl border p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        onClose={close}
      >
        <div className="w-full max-w-sm p-6">
          <h2 id="confirm-dialog-title" className="text-h3 font-semibold">
            {title}
          </h2>
          <p id="confirm-dialog-description" className="text-text-muted mt-2 text-sm">
            {description}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={close}>
              Cancelar
            </Button>
            <Button type="button" variant={variant} size="sm" onClick={handleConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  )
}
