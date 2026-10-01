/**
 * Parabolic flight animation utility for adding items to the cart.
 * 
 * - Duplicates the item's image.
 * - Shrinks it to 30x30 pixels.
 * - Uses CSS keyframes to make it 'fly' in a smooth parabolic arc from the item card
 *   down into the 'View Cart' sticky banner at the bottom of the screen.
 * - Makes the 'View Cart' banner briefly scale up and pulse when the flying item lands inside it.
 */

export function flyItemToCart(sourceImageOrCard, targetBannerOrId, onLand) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  // 1. Locate the source image
  let imgEl = null;
  if (sourceImageOrCard instanceof HTMLImageElement) {
    imgEl = sourceImageOrCard;
  } else if (sourceImageOrCard instanceof HTMLElement) {
    imgEl = sourceImageOrCard.querySelector('img') || sourceImageOrCard;
  } else if (typeof sourceImageOrCard === 'string') {
    imgEl = document.querySelector(sourceImageOrCard);
  }

  // 2. Find target banner
  const banner =
    (typeof targetBannerOrId === 'string' ? document.querySelector(targetBannerOrId) : targetBannerOrId) ||
    document.getElementById('floating-cart-banner-card') ||
    document.getElementById('floating-cart-bar') ||
    document.querySelector('[aria-label="View Cart Banner"]');

  // Compute source coordinates
  let startX = window.innerWidth / 2;
  let startY = window.innerHeight / 3;
  let sourceWidth = 100;
  let imgSrc = '';
  let imgAlt = 'Food Item';

  if (imgEl && imgEl instanceof HTMLImageElement) {
    const rect = imgEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
      sourceWidth = Math.max(30, rect.width);
    }
    imgSrc = imgEl.currentSrc || imgEl.src;
    imgAlt = imgEl.alt || 'Flying Item';
  } else if (imgEl && typeof imgEl.getBoundingClientRect === 'function') {
    const rect = imgEl.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
    const nestedImg = imgEl.querySelector ? imgEl.querySelector('img') : null;
    if (nestedImg) {
      imgSrc = nestedImg.currentSrc || nestedImg.src;
      imgAlt = nestedImg.alt || 'Flying Item';
    }
  }

  // Fallback SVG placeholder if image has no src yet
  if (!imgSrc) {
    imgSrc = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="%236b21a8"><circle cx="12" cy="12" r="10"/></svg>';
  }

  // Compute target coordinates (View Cart sticky banner)
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight - 56;

  if (banner) {
    const bannerRect = banner.getBoundingClientRect();
    const cartIcon = banner.querySelector('#cart-icon-target') || banner.querySelector('svg');
    if (cartIcon) {
      const iconRect = cartIcon.getBoundingClientRect();
      targetX = iconRect.left + iconRect.width / 2;
      targetY = iconRect.top + iconRect.height / 2;
    } else {
      targetX = bannerRect.left + Math.min(60, bannerRect.width / 4);
      targetY = bannerRect.top + bannerRect.height / 2;
    }
  }

  // Start & End centered for 30x30 dimensions
  const x0 = Math.round(startX - 15);
  const y0 = Math.round(startY - 15);
  const x1 = Math.round(targetX - 15);
  const y1 = Math.round(targetY - 15);

  // Parabolic control point (apex arches up above the higher of the two points)
  const arcHeight = Math.max(70, Math.min(160, Math.abs(x1 - x0) * 0.25));
  const cx = Math.round((x0 + x1) / 2);
  const cy = Math.round(Math.min(y0, y1) - arcHeight);

  // Calculate initial visual scale before shrinking down to 30x30
  const initialScale = Math.max(1.6, Math.min(3.5, sourceWidth / 30));

  // 3. Create duplicate of item image shrunk to 30x30 pixels
  const flyingImg = document.createElement('img');
  flyingImg.src = imgSrc;
  flyingImg.alt = imgAlt;
  flyingImg.className = 'flying-cart-item';
  flyingImg.setAttribute('data-flying-item', 'true');
  flyingImg.style.width = '30px';
  flyingImg.style.height = '30px';
  flyingImg.style.borderRadius = '50%';
  flyingImg.style.objectFit = 'cover';
  flyingImg.style.position = 'fixed';
  flyingImg.style.top = '0px';
  flyingImg.style.left = '0px';
  flyingImg.style.zIndex = '99999';
  flyingImg.style.pointerEvents = 'none';
  flyingImg.style.border = '2px solid #ffffff';
  flyingImg.style.boxShadow = '0 8px 20px rgba(107, 33, 168, 0.45), 0 2px 6px rgba(0, 0, 0, 0.2)';
  flyingImg.style.willChange = 'transform, opacity';

  // 4. Generate CSS keyframes for smooth parabolic arc
  const animId = `fly_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const keyframesStyle = document.createElement('style');
  keyframesStyle.id = `style_${animId}`;

  const steps = 12;
  let keyframeRules = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pct = Math.round(t * 100);

    // Quadratic Bézier: B(t) = (1-t)^2 * P0 + 2*(1-t)*t * Pc + t^2 * P1
    const xt = Math.round((1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1);
    const yt = Math.round((1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1);

    // Shrinks smoothly to 30x30 (scale 1) by t = 0.20
    let scale = 1;
    let opacity = 1;
    if (t === 0) {
      scale = initialScale;
      opacity = 0.95;
    } else if (t <= 0.20) {
      // Shrinking to 30x30 pixels
      scale = 1 + (initialScale - 1) * (1 - t / 0.20);
      opacity = 1;
    } else if (t < 0.85) {
      // Maintaining 30x30 flight size along the parabolic curve
      scale = 1;
      opacity = 1;
    } else {
      // Landing inside banner
      const endT = (t - 0.85) / 0.15;
      scale = 1 - 0.65 * endT; // shrinks into cart
      opacity = 1 - 0.75 * endT;
    }

    const rotate = Math.round((t - 0.5) * 36);

    keyframeRules += `
      ${pct}% {
        transform: translate3d(${xt}px, ${yt}px, 0) scale(${scale.toFixed(3)}) rotate(${rotate}deg);
        opacity: ${opacity.toFixed(2)};
      }
    `;
  }

  keyframesStyle.textContent = `
    @keyframes ${animId} {
      ${keyframeRules}
    }
  `;
  document.head.appendChild(keyframesStyle);

  const duration = 650; // ms
  flyingImg.style.animation = `${animId} ${duration}ms cubic-bezier(0.2, 0.75, 0.25, 1) forwards`;

  // 5. Landing trigger
  let hasLanded = false;
  const triggerLanding = () => {
    if (hasLanded) return;
    hasLanded = true;

    // Clean up DOM elements
    try {
      flyingImg.remove();
    } catch (_) {}
    try {
      keyframesStyle.remove();
    } catch (_) {}

    // Find and trigger scale up and pulse animation on 'View Cart' banner
    const cartTarget =
      document.getElementById('floating-cart-banner-card') ||
      document.getElementById('floating-cart-bar') ||
      document.querySelector('[aria-label="View Cart Banner"]');

    if (cartTarget) {
      cartTarget.classList.remove('cart-pulse-active');
      // Trigger DOM reflow so repeated clicks re-trigger animation
      void cartTarget.offsetWidth;
      cartTarget.classList.add('cart-pulse-active');

      setTimeout(() => {
        cartTarget.classList.remove('cart-pulse-active');
      }, 500);
    }

    // Call optional callback (e.g. to sync React state)
    if (typeof onLand === 'function') {
      try {
        onLand();
      } catch (err) {
        console.error('[flyItemToCart] onLand callback error:', err);
      }
    }
  };

  flyingImg.addEventListener('animationend', triggerLanding, { once: true });
  setTimeout(triggerLanding, duration + 50); // fallback guarantee

  document.body.appendChild(flyingImg);

  return flyingImg;
}

// Make globally accessible for testing and browser automation
if (typeof window !== 'undefined') {
  window.flyItemToCart = flyItemToCart;
}
