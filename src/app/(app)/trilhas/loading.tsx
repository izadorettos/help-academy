import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function TrilhasLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header skeleton */}
      <section aria-hidden>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </section>

      {/* Tabs skeleton */}
      <div aria-hidden className="border-border flex gap-1 border-b pb-0.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-none" />
        ))}
      </div>

      {/* Grid skeleton */}
      <ul aria-hidden className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i}>
            <Card className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-full rounded-full" />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
