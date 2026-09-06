import { NewsCardSkeleton } from '@/ui/skeleton';

export function SearchResultsSkeleton() {
  return (
    <main className="min-h-[calc(100vh-200px)] px-4 py-8 lg:px-4">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-12">
            <div className="mb-6">
              <div className="mb-2 h-8 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <NewsCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Loading() {
  return (
    <main className="min-h-[calc(100vh-200px)] px-4 py-8 lg:px-4">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-12">
            <div className="mb-6">
              <div className="mb-2 h-8 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <NewsCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
