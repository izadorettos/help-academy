export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-brand text-xs font-semibold tracking-widest uppercase">
            Help Entregas
          </p>
          <p className="text-text mt-1 text-xl font-bold">Help Academy</p>
        </div>
        <div className="border-border bg-surface shadow-card rounded-xl border p-8">{children}</div>
      </div>
    </div>
  )
}
