import type { ReactNode } from 'react'

interface EyebrowProps {
  children: ReactNode
  className?: string
}

export function Eyebrow({ children, className = '' }: EyebrowProps) {
  return (
    <span
      className={`font-mono text-xs font-medium uppercase tracking-widest text-text-muted ${className}`}
    >
      {children}
    </span>
  )
}
