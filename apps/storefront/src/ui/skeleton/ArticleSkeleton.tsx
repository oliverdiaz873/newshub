export const ArticleSkeleton = () => (
  <>
    <nav className="w-full border-b border-gray-200 bg-white dark:border-[#404040] dark:bg-[#242424]">
      <div className="mx-auto max-w-[1320px] px-4 py-3 md:px-[0.1rem] lg:px-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">/</span>
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">/</span>
          <div className="h-4 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </nav>

    <main className="min-h-[calc(100vh-200px)] px-4 py-8 lg:px-4">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-9">
            <div className="mb-8 rounded-[10px] bg-white p-[20px] shadow-sm dark:bg-gray-900 md:p-[30px]">
              <div className="flex flex-col items-start gap-8 lg:flex-row">
                <div className="order-2 flex-[0_0_100%] lg:order-1 lg:max-w-[40%] lg:flex-[0_0_40%]">
                  <div className="mb-3 space-y-3">
                    <div className="h-8 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-8 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-8 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="mb-3 h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>

                <div className="order-1 aspect-video flex-[0_0_100%] animate-pulse rounded-[10px] bg-gray-300 dark:bg-gray-600 lg:order-2 lg:max-w-[60%] lg:flex-[0_0_60%]" />
              </div>

              <div className="mt-8 space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800">
                <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>

          <aside className="lg:col-span-3">
            <div className="rounded-lg border-l border-[#ddd] bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:border-[var(--color-border-subtle)] dark:bg-[var(--color-surface-elevated)]">
              <div className="mb-4 h-7 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />

              <div className="space-y-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-[120px] w-full animate-pulse rounded-lg bg-gray-300 dark:bg-gray-600" />
                    <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  </>
);
