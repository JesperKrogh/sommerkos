import './style/base.css'
import './style/animations.css'
import './style/components.css'
import './style/pages.css'

import { initRouter } from './router'
import { initLightbox } from './modules/lightbox'
import './modules/infoscreen'

document.addEventListener('DOMContentLoaded', () => {
  initNav()
  initRouter()
  initLightbox()
})

function initNav(): void {
  const nav = document.getElementById('nav')
  const hamburger = document.getElementById('hamburger')
  const mobileMenu = document.getElementById('mobileMenu')
  const langToggle = document.getElementById('langToggle')
  const html = document.documentElement

  if (!nav) return

  const handleScroll = () => {
    if (window.scrollY > 40) {
      nav.classList.add('is-scrolled')
    } else {
      nav.classList.remove('is-scrolled')
    }
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('is-open')
      mobileMenu.classList.toggle('is-open', isOpen)
      hamburger.setAttribute('aria-expanded', String(isOpen))
    })

    const accordionArrows = mobileMenu.querySelectorAll<HTMLElement>('.nav__mobile-arrow')
    accordionArrows.forEach((accordionArrow) => {
      const accordionSub = accordionArrow.closest('.nav__mobile-accordion')?.querySelector<HTMLElement>('.nav__mobile-sub')
      if (accordionSub) {
        accordionArrow.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          const isOpen = accordionSub.classList.toggle('is-open')
          accordionArrow.classList.toggle('is-open', isOpen)
          accordionArrow.setAttribute('aria-expanded', String(isOpen))
        })
      }
    })

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('is-open')
        mobileMenu.classList.remove('is-open')
        hamburger.setAttribute('aria-expanded', 'false')
      })
    })
  }

  if (langToggle) {
    const daLabel = langToggle.querySelector<HTMLElement>('[data-lang-label="da"]')
    const enLabel = langToggle.querySelector<HTMLElement>('[data-lang-label="en"]')

    const updateLangUI = (lang: string) => {
      daLabel?.classList.toggle('active', lang === 'da')
      enLabel?.classList.toggle('active', lang === 'en')
    }

    updateLangUI(html.dataset.lang ?? 'da')

    langToggle.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const langLabel = target.dataset.langLabel
      if (!langLabel) return

      html.dataset.lang = langLabel
      html.lang = langLabel
      updateLangUI(langLabel)

      try { localStorage.setItem('lang', langLabel) } catch { /* ignore */ }

      // Re-render current page with new language
      window.dispatchEvent(new CustomEvent('route-change', { detail: { path: window.location.pathname } }))
    })

    try {
      const saved = localStorage.getItem('lang')
      if (saved === 'en' || saved === 'da') {
        html.dataset.lang = saved
        html.lang = saved
        updateLangUI(saved)
      }
    } catch { /* ignore */ }
  }
}
