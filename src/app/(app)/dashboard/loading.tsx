import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-8">
      {/* Greeting skeleton */}
      <section aria-hidden>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-56 mt-2" />
      </section>

      {/* Overall progress skeleton */}
      <section aria-hidden>
        <Card className="p-5 flex items-center gap-6">
          <Skeleton className="size-24 rounded-full shrink-0" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-64" />
          </div>
        </Card>
      </section>

      {/* Continue card skeleton */}
      <section aria-hidden>
        <Skeleton className="h-5 w-44 mb-3" />
        <Card className="p-4 flex items-center gap-4">
          <Skeleton className="size-12 rounded-full shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </Card>
      </section>

      {/* Paths grid skeleton */}
      <section aria-hidden>
        <Skeleton className="h-5 w-32 mb-3" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Card className="p-4 space-y-3">
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
      </section>
    </div>
  )
}
