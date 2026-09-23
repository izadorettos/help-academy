import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function TrilhaDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      {/* Breadcrumb skeleton */}
      <div aria-hidden>
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Header skeleton */}
      <section aria-hidden className="space-y-3">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Card className="p-4 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </Card>
      </section>

      {/* Modules skeleton */}
      <div aria-hidden className="space-y-4">
        {[0, 1].map((i) => (
          <Card key={i} className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
            <div className="space-y-1">
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex items-center gap-3 px-3 py-2">
                  <Skeleton className="size-5 rounded-full shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-10 shrink-0" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
