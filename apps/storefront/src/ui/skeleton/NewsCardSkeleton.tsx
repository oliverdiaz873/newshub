import { SkeletonBlock, SkeletonImage, SkeletonText } from './BaseSkeleton';

type CardVariant = 'card' | 'sidebar' | 'featured';

interface NewsCardSkeletonProps {
  variant?: CardVariant;
}

const FeaturedSkeleton = () => (
  <div className="rounded-lg bg-white p-[10px] shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:bg-[var(--color-surface-base)]">
    <div className="xl:flex xl:items-start xl:gap-6">
      <div className="mb-4 xl:order-2 xl:mb-0 xl:w-[70%]">
        <SkeletonImage className="aspect-video w-full rounded-lg" />
      </div>
      <div className="xl:w-[35%]">
        <SkeletonText lines={3} className="mb-3" />
        <SkeletonBlock className="mb-2 h-4 w-1/2" />
        <SkeletonText lines={2} />
      </div>
    </div>
  </div>
);

const CardSkeleton = () => (
  <div className="news-card-home h-full rounded-lg bg-white p-[10px] shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:bg-[var(--color-surface-base)]">
    <SkeletonImage className="mb-3 w-full rounded-lg aspect-video" />
    <SkeletonBlock className="mb-2 h-5 w-3/4" />
    <SkeletonBlock className="mb-2 h-4 w-1/3" />
    <SkeletonText lines={2} />
  </div>
);

const SidebarSkeleton = () => (
  <div className="rounded-lg p-2">
    <SkeletonImage className="mb-2 h-[120px] w-full rounded-lg" />
    <SkeletonBlock className="mb-2 h-4 w-full" />
    <SkeletonBlock className="mb-2 h-4 w-2/3" />
    <SkeletonBlock className="h-3 w-1/3" />
  </div>
);

export const NewsCardSkeleton = ({ variant = 'card' }: NewsCardSkeletonProps) => {
  switch (variant) {
    case 'featured':
      return <FeaturedSkeleton />;
    case 'sidebar':
      return <SidebarSkeleton />;
    default:
      return <CardSkeleton />;
  }
};
