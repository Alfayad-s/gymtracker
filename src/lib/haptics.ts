/** Light native haptics via the Vibration API (supported on most Android / some PWAs). */

export type HapticStyle = 'light' | 'medium' | 'success' | 'warning' | 'error'

const PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 18,
  success: [18, 40, 28],
  warning: [24, 40, 24],
  error: [40, 50, 40],
}

export function canUseHaptics() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function triggerHaptic(style: HapticStyle = 'light') {
  if (!canUseHaptics()) return false
  try {
    // Cancel any ongoing pattern so taps feel snappy
    navigator.vibrate(0)
    return navigator.vibrate(PATTERNS[style])
  } catch {
    return false
  }
}

const INTERACTIVE_SELECTOR = [
  'button:not(:disabled)',
  'a[href]',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="tab"]',
  '[role="switch"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="link"]',
  'input[type="button"]:not(:disabled)',
  'input[type="submit"]:not(:disabled)',
  'input[type="reset"]:not(:disabled)',
  'input[type="checkbox"]:not(:disabled)',
  'input[type="radio"]:not(:disabled)',
  'input[type="file"]:not(:disabled)',
  'input[type="range"]:not(:disabled)',
  'select:not(:disabled)',
  'summary',
  'label[for]',
  '[data-slot="button"]',
  '[data-haptic]:not([data-haptic="off"])',
  '.cursor-pointer',
].join(',')

export function findHapticTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null
  const el = target.closest(INTERACTIVE_SELECTOR)
  if (!el) return null
  if (el.closest('[data-haptic="off"]')) return null
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return null
  return el
}

export function hapticStyleForTarget(el: Element): HapticStyle {
  const explicit = el.getAttribute('data-haptic')
  if (
    explicit === 'light' ||
    explicit === 'medium' ||
    explicit === 'success' ||
    explicit === 'warning' ||
    explicit === 'error'
  ) {
    return explicit
  }

  if (
    el.classList.contains('text-destructive') ||
    el.classList.contains('bg-destructive') ||
    el.getAttribute('data-variant') === 'destructive'
  ) {
    return 'warning'
  }

  return 'light'
}
