export function initScrollReveal(): void {
  const elements = document.querySelectorAll<HTMLElement>('.reveal')

  if (!elements.length) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    }
  )

  elements.forEach((el) => observer.observe(el))
}
