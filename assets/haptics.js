(() => {
  'use strict';

  const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  const vibrate = (pattern = 10) => {
    if (!canVibrate()) return false;
    try { return navigator.vibrate(pattern); } catch { return false; }
  };

  window.NCLEX_HAPTICS = {
    tap: () => vibrate(12),
    soft: () => vibrate(7),
    success: () => vibrate([10, 35, 14]),
    warning: () => vibrate([18, 40, 18]),

    scrollSlow: () => vibrate(6),
    scrollMedium: () => vibrate(12),
    scrollFast: () => vibrate([16, 18, 18]),
    scrollVeryFast: () => vibrate([22, 16, 26])
  };

  document.addEventListener('pointerup', (event) => {
    const target = event.target?.closest?.(
      'button, a, .option-item, .choice-input, [role="button"], input[type="submit"], input[type="button"]'
    );
    if (!target || target.closest?.('[data-no-haptic="true"]')) return;
    window.NCLEX_HAPTICS.tap();
  }, { capture: true, passive: true });

  const isHapticScrollArea = () => {
    const path = location.pathname.toLowerCase();
    const isWelcome = path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('index.html');
    const isQuestionSelection =
      document.body.classList.contains('catalog-active') ||
      Boolean(document.getElementById('testGrid'));

    return isWelcome || isQuestionSelection;
  };

  let lastScrollY = window.scrollY || window.pageYOffset || 0;
  let lastScrollTime = performance.now();
  let lastScrollPulse = 0;

  const getScrollHapticBySpeed = (speed) => {
    // speed = pixels per millisecond
    if (speed >= 3.2) {
      return {
        pulse: window.NCLEX_HAPTICS.scrollVeryFast,
        cooldown: 55
      };
    }

    if (speed >= 1.8) {
      return {
        pulse: window.NCLEX_HAPTICS.scrollFast,
        cooldown: 75
      };
    }

    if (speed >= 0.75) {
      return {
        pulse: window.NCLEX_HAPTICS.scrollMedium,
        cooldown: 105
      };
    }

    return {
      pulse: window.NCLEX_HAPTICS.scrollSlow,
      cooldown: 150
    };
  };

  window.addEventListener('scroll', () => {
    if (!isHapticScrollArea()) return;

    const now = performance.now();
    const currentScrollY = window.scrollY || window.pageYOffset || 0;

    const distance = Math.abs(currentScrollY - lastScrollY);
    const elapsed = Math.max(now - lastScrollTime, 16);
    const speed = distance / elapsed;

    lastScrollY = currentScrollY;
    lastScrollTime = now;

    // Prevent buzzing on tiny scroll movements
    if (distance < 4) return;

    const { pulse, cooldown } = getScrollHapticBySpeed(speed);

    if (now - lastScrollPulse < cooldown) return;

    lastScrollPulse = now;
    pulse();
  }, { passive: true });
})();
