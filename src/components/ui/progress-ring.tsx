interface ProgressRingProps {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function ProgressRing({ value, size = 80, strokeWidth = 8, label }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (clamped / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${clamped}% concluído`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={strokeWidth}
        stroke="var(--color-surface-muted)"
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={strokeWidth}
        stroke="var(--color-brand)"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 300ms ease-out' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-text font-bold"
        style={{ fontSize: size * 0.2 }}
      >
        {clamped}%
      </text>
    </svg>
  )
}
