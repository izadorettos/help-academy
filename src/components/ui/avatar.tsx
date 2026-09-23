import Image from 'next/image'

type AvatarSize = 32 | 40 | 64

interface AvatarProps {
  src?: string | null
  name: string
  size?: AvatarSize
}

const SIZE_CLS: Record<AvatarSize, string> = {
  32: 'size-8 text-xs',
  40: 'size-10 text-sm',
  64: 'size-16 text-xl',
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ src, name, size = 40 }: AvatarProps) {
  const cls = `${SIZE_CLS[size]} rounded-full overflow-hidden bg-brand-soft text-brand-hover font-semibold flex items-center justify-center shrink-0`
  if (src) {
    return (
      <div className={cls}>
        <Image src={src} alt={name} width={size} height={size} className="object-cover" />
      </div>
    )
  }
  return (
    <div className={cls} aria-label={name}>
      {initials(name)}
    </div>
  )
}
