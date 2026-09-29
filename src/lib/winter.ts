import { WinterModeOption } from '../types';

/**
 * Checks whether winter mode should be actively displaying snow.
 * - 'on': Always active.
 * - 'off': Always disabled.
 * - 'auto': Default seasonal setting. Active during seasonal winter period / winter release edition.
 */
export function isWinterModeActive(mode: WinterModeOption = 'auto'): boolean {
  if (mode === 'on') return true;
  if (mode === 'off') return false;

  // 'auto': Active during the Winter Edition seasonal rollout or winter calendar months
  if (typeof window !== 'undefined') {
    // Check if user has explicit reduced motion preference
    // (Note: reduced motion will still keep winter mode active for the static ambient scene if needed,
    // but the animation engine specifically checks reduced motion)
  }

  // AUTO defaults to active for the seasonal Honk Winter Update experience
  return true;
}

/**
 * Detects whether system prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns recommended particle count based on device profile.
 */
export function getRecommendedParticleCount(isLowData: boolean = false): number {
  if (typeof window === 'undefined') return 45;

  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  const isLowPower =
    isLowData ||
    (typeof navigator !== 'undefined' &&
      navigator.hardwareConcurrency !== undefined &&
      navigator.hardwareConcurrency <= 4);

  if (isLowPower) return 14;
  if (isMobile) return 22;
  if (isTablet) return 38;
  return 60; // Desktop high-fidelity with minimal CPU load
}
