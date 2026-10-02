import React from 'react';

/**
 * SwiggyItemSkeleton:
 * Shimmering grey placeholder cards matching the exact dimensions, spacing,
 * and layout of modern Swiggy/Blinkit/Zomato item cards.
 * Powered by CSS linear-gradient pulsing animation for zero layout shifts (CLS = 0).
 */
export default function SwiggyItemSkeleton({ count = 6 }) {
  const skeletonArray = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Category Section Wrapper */}
      <div className="bg-[#ffffff] border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Shimmering Category Header Bar */}
        <div className="px-6 py-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full shimmer-skeleton" />
              <div className="h-6 w-36 sm:w-44 rounded-md shimmer-skeleton" />
            </div>
            <div className="h-3 w-56 sm:w-72 rounded shimmer-skeleton-subtle" />
          </div>
          <div className="h-6 w-18 rounded-full shimmer-skeleton self-start sm:self-auto" />
        </div>

        {/* Asymmetric Bento Box Skeleton Grid */}
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-[260px] sm:auto-rows-[280px] grid-flow-dense" aria-busy="true" aria-live="polite">
          {skeletonArray.map((idx) => {
            const isLarge = idx === 0;
            return (
              <div
                key={`skeleton-card-${idx}`}
                className={`rounded-2xl sm:rounded-3xl overflow-hidden relative border border-gray-800/80 bg-gray-950 flex flex-col justify-end p-2.5 sm:p-3 shadow-md ${
                  isLarge
                    ? 'col-span-1 sm:col-span-2 row-span-2 min-h-[400px] sm:min-h-[580px]'
                    : 'col-span-1 row-span-1 min-h-[260px] sm:min-h-[280px]'
                }`}
              >
                {/* Image Shimmer Area */}
                <div className="absolute inset-0 shimmer-skeleton-dark" />

                {/* Top Badge Shimmer */}
                <div className="absolute top-3 left-3 z-10">
                  <div className={`h-6 rounded-full shimmer-skeleton-darker ${isLarge ? 'w-28' : 'w-20'}`} />
                </div>

                {/* Glassmorphic Overlay Skeleton */}
                <div className="relative z-10 m-2 sm:m-2.5 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gray-950/75 backdrop-blur-md border border-white/10 space-y-2 shadow-2xl">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-14 rounded-full shimmer-skeleton-darker" />
                    <div className="h-3.5 w-16 rounded-full shimmer-skeleton-darker" />
                  </div>
                  <div className="h-4 sm:h-5 w-3/4 rounded-md shimmer-skeleton-darker" />
                  <div className="h-2.5 sm:h-3 w-full rounded shimmer-skeleton-dark" />
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <div className="h-4 w-12 rounded shimmer-skeleton-darker" />
                    <div className="h-7 w-20 rounded-lg shimmer-skeleton-darker" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
