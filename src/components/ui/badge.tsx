import type { ReactNode } from 'react'

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'muted' | 'xp' | 'required' | 'brand'

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-muted text-text-muted',
  success: 'bg-status-success-chip-bg text-status-success-chip-fg',
  warning: 'bg-status-warning-chip-bg text-status-warning-chip-fg',
  muted: 'bg-surface-muted text-text-subtle',
  xp: 'bg-accent-soft text-accent-strong',
  required: 'bg-brand-soft text-brand-text',
  brand: 'bg-brand text-on-brand',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
