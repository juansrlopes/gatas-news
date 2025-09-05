import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-gray-300 rounded ${className}`} />;
};

interface ArticleSkeletonProps {
  count?: number;
}

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

interface InstagramSkeletonProps {
  count?: number;
}

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
