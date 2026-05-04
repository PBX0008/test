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
    warning: () => vibrate([18, 40, 18])
  };

  document.addEventListener('pointerup', (event) => {
    const target = event.target?.closest?.('button, a, .option-item, .choice-input, [role="button"], input[type="submit"], input[type="button"]');
    if (!target || target.closest?.('[data-no-haptic="true"]')) return;
    window.NCLEX_HAPTICS.tap();
  }, { capture: true, passive: true });

  let lastScrollPulse = 0;
  const isHapticScrollArea = () => {
    const path = location.pathname.toLowerCase();
    const isWelcome = path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('index.html');
    const isQuestionSelection = document.body.classList.contains('catalog-active') || Boolean(document.getElementById('testGrid'));
    return isWelcome || isQuestionSelection;
  };

  window.addEventListener('scroll', () => {
    if (!isHapticScrollArea()) return;
    const now = Date.now();
    if (now - lastScrollPulse < 180) return;
    lastScrollPulse = now;
    window.NCLEX_HAPTICS.soft();
  }, { passive: true });
})();
