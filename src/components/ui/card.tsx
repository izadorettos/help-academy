import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ interactive, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`border-border bg-surface shadow-card rounded-xl border ${interactive ? 'cursor-pointer transition-shadow hover:shadow-pop focus-within:ring-2 focus-within:ring-focus' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
