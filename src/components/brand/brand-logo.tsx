import Image from 'next/image'

type Variant = 'positivo' | 'negativo' | 'tinta'

// Dimensões reais dos arquivos em public/brand (logo empilhado: símbolo + wordmark).
const INTRINSIC = { width: 388, height: 442 } as const

type BrandLogoProps = {
  /** positivo sobre claro, negativo sobre escuro, tinta para uma cor (docs/BRAND-HELP.md §6) */
  variant?: Variant
  /** Altura em px. Mínimo da marca: 32px. */
  height?: number
  className?: string
  priority?: boolean
}

export function BrandLogo({ variant = 'positivo', height = 48, className = '', priority }: BrandLogoProps) {
  const safeHeight = Math.max(32, height)
  const width = Math.round((safeHeight * INTRINSIC.width) / INTRINSIC.height)
  return (
    <Image
      src={`/brand/logo-help-${variant}.png`}
      alt="Help Entregas"
      width={width}
      height={safeHeight}
      priority={priority}
      className={`shrink-0 ${className}`}
      style={{ width, height: safeHeight }}
    />
  )
}
