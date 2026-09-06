export const SkeletonBlock = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />
);

export const SkeletonText = ({ lines = 1, className = '' }: { lines?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
        style={{ width: i === lines - 1 ? '60%' : '100%' }}
      />
    ))}
  </div>
);

export const SkeletonImage = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-300 dark:bg-gray-600 ${className}`} />
);
