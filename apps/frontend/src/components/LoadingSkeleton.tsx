import React from 'react';

/**
 * Props for the LoadingSkeleton component
 */
interface LoadingSkeletonProps {
  /** Additional CSS classes to apply */
  className?: string;
}

/**
 * LoadingSkeleton Component
 *
 * A basic animated loading placeholder that provides visual feedback
 * while content is being loaded.
 *
 * @component
 * @param {LoadingSkeletonProps} props - Component props
 * @param {string} [props.className] - Additional CSS classes
 *
 * @example
 * ```tsx
 * // Basic skeleton
 * <LoadingSkeleton className="h-4 w-full" />
 *
 * // Custom dimensions
 * <LoadingSkeleton className="h-48 w-full rounded-lg" />
 * ```
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-gray-300 rounded ${className}`} />;
};

/**
 * Props for the ArticleSkeleton component
 */
interface ArticleSkeletonProps {
  /** Number of skeleton articles to display */
  count?: number;
}

/**
 * ArticleSkeleton Component
 *
 * Displays a grid of article loading skeletons that match the actual
 * article card layout. Used while news articles are being fetched.
 *
 * @component
 * @param {ArticleSkeletonProps} props - Component props
 * @param {number} [props.count=6] - Number of skeleton articles to show
 *
 * @example
 * ```tsx
 * // Show 8 loading articles
 * {loading && <ArticleSkeleton count={8} />}
 *
 * // Default 6 articles
 * {loading && <ArticleSkeleton />}
 * ```
 */
export const ArticleSkeleton: React.FC<ArticleSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-purple-950 bg-opacity-50 rounded-lg shadow">
          <LoadingSkeleton className="w-full h-48 rounded-t-lg" />
          <div className="p-3 space-y-2">
            <LoadingSkeleton className="h-4 w-full" />
            <LoadingSkeleton className="h-4 w-3/4" />
            <LoadingSkeleton className="h-3 w-full" />
            <LoadingSkeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Props for the InstagramSkeleton component
 */
interface InstagramSkeletonProps {
  /** Number of skeleton Instagram profiles to display */
  count?: number;
}

/**
 * InstagramSkeleton Component
 *
 * Displays a grid of Instagram profile loading skeletons for the social media page.
 * Matches the layout of actual Instagram profile cards.
 *
 * @component
 * @param {InstagramSkeletonProps} props - Component props
 * @param {number} [props.count=10] - Number of skeleton profiles to show
 *
 * @example
 * ```tsx
 * // Show 15 loading profiles
 * {loading && <InstagramSkeleton count={15} />}
 *
 * // Default 10 profiles
 * {loading && <InstagramSkeleton />}
 * ```
 */
export const InstagramSkeleton: React.FC<InstagramSkeletonProps> = ({ count = 10 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-purple-950 bg-opacity-50 rounded-lg shadow pb-4">
          <LoadingSkeleton className="w-full h-96 rounded-t-lg" />
          <div className="text-center mt-3 px-2">
            <LoadingSkeleton className="h-4 w-20 mx-auto mb-2" />
            <LoadingSkeleton className="h-6 w-16 mx-auto rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
