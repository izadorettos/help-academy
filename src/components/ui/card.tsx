import { type HTMLAttributes } from 'react'

type CardVariant = 'default' | 'dark'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  variant?: CardVariant
}

export function Card({ interactive, variant = 'default', className = '', children, ...props }: CardProps) {
  const base = variant === 'dark'
    ? 'bg-navy border-navy rounded-lg'
    : 'border-border bg-surface rounded-lg border'
  return (
    <div
      className={`${base} ${interactive ? 'cursor-pointer transition-shadow hover:shadow-pop focus-within:ring-2 focus-within:ring-focus shadow-card' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
