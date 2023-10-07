/**
 *
 */
export function fixHeight() {
  // https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
  document.documentElement.style.setProperty(`--vh`, `${Math.min(window.innerHeight, window.outerHeight) * 0.01}px`)
}
