export function initNav(): void {
  const nav = document.getElementById('nav')
  const hamburger = document.getElementById('hamburger')
  const mobileMenu = document.getElementById('mobileMenu')
  const langToggle = document.getElementById('langToggle')
  const html = document.documentElement

  if (!nav) return

  // ── Sticky nav background on scroll ──────────────────────────────────────
  const handleScroll = () => {
    if (window.scrollY > 40) {
      nav.classList.add('is-scrolled')
    } else {
      nav.classList.remove('is-scrolled')
    }
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()

  // ── Hamburger / mobile menu ───────────────────────────────────────────────
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('is-open')
      mobileMenu.classList.toggle('is-open', isOpen)
      hamburger.setAttribute('aria-expanded', String(isOpen))
    })

    // Close mobile menu on link click
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('is-open')
        mobileMenu.classList.remove('is-open')
        hamburger.setAttribute('aria-expanded', 'false')
      })
    })
  }

  // ── Language Toggle ───────────────────────────────────────────────────────
  if (langToggle) {
    const daLabel = langToggle.querySelector<HTMLElement>('[data-lang-label="da"]')
    const enLabel = langToggle.querySelector<HTMLElement>('[data-lang-label="en"]')

    const updateLangUI = (lang: string) => {
      daLabel?.classList.toggle('active', lang === 'da')
      enLabel?.classList.toggle('active', lang === 'en')
    }

    // Set initial state
    updateLangUI(html.dataset.lang ?? 'da')

    langToggle.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const langLabel = target.dataset.langLabel
      if (!langLabel) return

      html.dataset.lang = langLabel
      html.lang = langLabel
      updateLangUI(langLabel)

      try {
        localStorage.setItem('lang', langLabel)
      } catch {
        // localStorage unavailable — ignore
      }
    })

    // Restore saved preference
    try {
      const saved = localStorage.getItem('lang')
      if (saved === 'en' || saved === 'da') {
        html.dataset.lang = saved
        html.lang = saved
        updateLangUI(saved)
      }
    } catch {
      // ignore
    }
  }
}
