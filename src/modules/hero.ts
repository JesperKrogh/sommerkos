export function initHero(): void {
  const heroBg = document.getElementById('heroBg')

  if (!heroBg) return

  // ── Subtle parallax on hero background ───────────────────────────────────
  // Only run on devices that can handle it (respects prefers-reduced-motion)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) return

  let ticking = false

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollY = window.scrollY
        const heroHeight = heroBg.parentElement?.offsetHeight ?? window.innerHeight

        // Only apply within the hero section
        if (scrollY < heroHeight) {
          const offset = scrollY * 0.35
          heroBg.style.transform = `translateY(${offset}px)`
        }
        ticking = false
      })
      ticking = true
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
}
