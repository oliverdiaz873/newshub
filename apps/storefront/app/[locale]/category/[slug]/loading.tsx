import { NewsCardSkeleton } from '@/ui/skeleton';

export default function Loading() {
  return (
    <main className="min-h-[calc(100vh-200px)] px-4 py-8 lg:px-4">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-9">
            <div className="space-y-8">
              <div className="rounded-lg bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:bg-[var(--color-surface-base)]">
                <div className="mb-4 h-7 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <NewsCardSkeleton variant="featured" />
                <div className="mb-1 mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <NewsCardSkeleton />
                  <NewsCardSkeleton />
                  <NewsCardSkeleton />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <NewsCardSkeleton />
                  <NewsCardSkeleton />
                </div>
              </div>

              <div className="rounded-lg bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:bg-[var(--color-surface-base)]">
                <div className="mb-4 h-7 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <NewsCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="lg:col-span-3">
            <section className="rounded-lg border-l border-[#ddd] bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:border-[var(--color-border-subtle)] dark:bg-[var(--color-surface-elevated)]">
              <div className="mb-4 h-7 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-6">
                {[...Array(5)].map((_, i) => (
                  <NewsCardSkeleton key={i} variant="sidebar" />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
