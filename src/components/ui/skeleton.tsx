import { type HTMLAttributes } from 'react'

export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-surface-muted animate-pulse rounded-md motion-reduce:animate-none ${className}`}
      {...props}
    />
  )
}
