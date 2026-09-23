type ProgressBarVariant = 'brand' | 'success'

const BAR_CLASSES: Record<ProgressBarVariant, string> = {
  brand: 'bg-brand',
  success: 'bg-success',
}

interface ProgressBarProps {
  value: number
  label?: string
  variant?: ProgressBarVariant
  className?: string
  showValue?: boolean
}

export function ProgressBar({
  value,
  label,
  variant = 'brand',
  className = '',
  showValue,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1 flex justify-between text-xs text-text-muted">
          {label && <span>{label}</span>}
          {showValue && <span>{clamped}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none ${BAR_CLASSES[variant]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
