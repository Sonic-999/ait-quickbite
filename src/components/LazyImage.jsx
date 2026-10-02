import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyImage Component:
 * - Lazy loads images only when scrolled near/into the viewport using IntersectionObserver.
 * - Displays an animated shimmering skeleton placeholder block while loading.
 * - Smoothly transitions the image in (fade-in + de-blur) once downloaded to eliminate layout shifts and visual popping.
 * - Graceful fallback support if the image URL fails to load.
 */
export default function LazyImage({
  src,
  alt = '',
  fallbackSrc,
  className = '',
  imgClassName = '',
  skeletonClassName = 'shimmer-skeleton-dark',
  style = {},
  aspectRatio,
  onError,
  onLoad,
  hoverEffect = false,
  ...rest
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef(null);

  // Set up IntersectionObserver to lazy load when scrolled into view
  useEffect(() => {
    // If IntersectionObserver is not supported, load immediately
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      setCurrentSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          setCurrentSrc(src);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // start loading 200px before scrolling into viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  // When src prop updates, update currentSrc if already visible
  useEffect(() => {
    if (isVisible) {
      setCurrentSrc(src);
      setIsLoaded(false);
      setHasError(false);
    }
  }, [src, isVisible]);

  const handleImageLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleImageError = (e) => {
    if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
    } else {
      setIsLoaded(true); // Stop shimmering if broken
      if (onError) onError(e);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...(aspectRatio ? { aspectRatio } : {}),
        ...style,
      }}
    >
      {/* 1. Animated Shimmering Skeleton Loader Placeholder */}
      <div
        className={`absolute inset-0 w-full h-full transition-opacity duration-700 pointer-events-none z-0 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        } ${skeletonClassName}`}
        aria-hidden="true"
      />

      {/* 2. Actual Image with Smooth Fade-In and De-blur CSS Transition */}
      {isVisible && currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-all duration-700 ease-out z-1 relative ${
            isLoaded
              ? 'opacity-100 filter-none'
              : 'opacity-0 filter blur-xs scale-[1.02]'
          } ${hoverEffect ? 'group-hover:scale-108' : ''} ${imgClassName}`}
          {...rest}
        />
      )}
    </div>
  );
}
