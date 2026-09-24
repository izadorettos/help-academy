import { BrandLogo } from '@/components/brand/brand-logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <BrandLogo height={44} priority />
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-text-muted">
            Academy
          </p>
        </div>
        <div className="border-border bg-surface shadow-card rounded-xl border p-8">{children}</div>
      </div>
    </div>
  )
}
