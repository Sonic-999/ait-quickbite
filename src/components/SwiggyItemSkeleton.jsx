import React from 'react';

/**
 * SwiggyItemSkeleton:
 * Shimmering grey placeholder cards matching the exact dimensions, spacing,
 * and layout of modern Swiggy/Blinkit/Zomato item cards.
 * Powered by CSS linear-gradient pulsing animation for zero layout shifts (CLS = 0).
 */
export default function SwiggyItemSkeleton({ count = 5 }) {
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

        {/* 4 to 6 Shimmering Item Cards Separated by Subtle Border */}
        <div className="divide-y divide-gray-100" aria-busy="true" aria-live="polite">
          {skeletonArray.map((idx) => (
            <div
              key={`skeleton-card-${idx}`}
              className="p-5 sm:p-6 flex items-start justify-between gap-4 sm:gap-8 relative overflow-hidden bg-[#ffffff]"
            >
              {/* ======================================================== */}
              {/* LEFT SIDE (TEXT): Veg Icon, Title, Price, Description     */}
              {/* ======================================================== */}
              <div className="flex-1 pr-2 sm:pr-4">
                {/* Veg Icon & Badge Placeholder */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-4 h-4 rounded-[3px] shimmer-skeleton border border-gray-200/80 shadow-2xs" />
                  {idx % 2 === 0 && (
                    <div className="h-4 w-16 sm:w-20 rounded shimmer-skeleton" />
                  )}
                </div>

                {/* Bold Item Name Placeholder */}
                <div
                  className="h-5 sm:h-6 rounded-md shimmer-skeleton mb-2"
                  style={{ width: idx % 2 === 0 ? '58%' : '48%' }}
                />

                {/* Price Line Placeholder */}
                <div className="h-4 sm:h-5 rounded shimmer-skeleton w-16 sm:w-20 mb-3 mt-1" />

                {/* Short, Two-line Muted Description Placeholder */}
                <div className="space-y-1.5 max-w-xl">
                  <div className="h-3 sm:h-3.5 rounded shimmer-skeleton-subtle w-full" />
                  <div
                    className="h-3 sm:h-3.5 rounded shimmer-skeleton-subtle"
                    style={{ width: idx % 2 === 0 ? '78%' : '65%' }}
                  />
                </div>
              </div>

              {/* ======================================================== */}
              {/* RIGHT SIDE (IMAGE & BUTTON): Square image & ADD button   */}
              {/* ======================================================== */}
              <div className="relative flex-shrink-0 flex flex-col items-center pb-3 pt-0.5">
                {/* High-quality square image placeholder with slightly rounded corners */}
                <div className="w-28 h-28 sm:w-36 sm:h-36 aspect-square rounded-xl shimmer-skeleton border border-gray-200/80 shadow-2xs relative overflow-hidden" />

                {/* Rectangular primary-colored 'ADD' button placeholder overlapping bottom center */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10">
                  <div className="w-20 sm:w-24 h-7 sm:h-8 rounded-lg shimmer-skeleton-darker shadow-xs border border-gray-200/80 flex items-center justify-center">
                    <div className="w-8 h-2.5 rounded shimmer-skeleton-subtle opacity-70" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
