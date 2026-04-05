export function initLightbox(): void {
  const gallery   = document.getElementById('gallery')
  const lightbox  = document.getElementById('lightbox') as HTMLElement | null
  const closeBtn  = document.getElementById('lightboxClose')
  const prevBtn   = document.getElementById('lightboxPrev')
  const nextBtn   = document.getElementById('lightboxNext')
  const imgWrap   = document.getElementById('lightboxImgWrap')
  const captionEl = document.getElementById('lightboxCaption')

  if (!gallery || !lightbox || !closeBtn || !prevBtn || !nextBtn || !imgWrap) return

  const items = Array.from(gallery.querySelectorAll<HTMLElement>('.gallery__item'))
  let currentIndex = 0

  const getLang = () => document.documentElement.dataset.lang ?? 'da'

  const showCaption = (item: HTMLElement) => {
    if (!captionEl) return
    const lang = getLang()
    captionEl.textContent = (lang === 'en' ? item.dataset.captionEn : item.dataset.captionDa) ?? ''
  }

  const showItem = (index: number) => {
    currentIndex = (index + items.length) % items.length
    const item = items[currentIndex]
    imgWrap.innerHTML = ''

    const img = item.querySelector('img')
    if (img) {
      const clone = img.cloneNode(true) as HTMLImageElement
      clone.loading = 'eager'
      imgWrap.appendChild(clone)
    } else {
      const placeholder = item.querySelector('.gallery__placeholder')
      if (placeholder) imgWrap.appendChild(placeholder.cloneNode(true))
    }

    showCaption(item)
  }

  const open = (index: number) => {
    showItem(index)
    lightbox.hidden = false
    document.body.style.overflow = 'hidden'
    closeBtn.focus()
  }

  const close = () => {
    lightbox.hidden = true
    document.body.style.overflow = ''
    items[currentIndex]?.focus()
  }

  items.forEach((item, index) => {
    item.setAttribute('tabindex', '0')
    item.setAttribute('role', 'button')
    item.setAttribute('aria-label', `View photo ${index + 1}`)
    item.addEventListener('click', () => open(index))
    item.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(index) }
    })
  })

  closeBtn.addEventListener('click', close)
  prevBtn.addEventListener('click', () => showItem(currentIndex - 1))
  nextBtn.addEventListener('click', () => showItem(currentIndex + 1))

  lightbox.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape')     close()
    if (e.key === 'ArrowLeft')  showItem(currentIndex - 1)
    if (e.key === 'ArrowRight') showItem(currentIndex + 1)
  })

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close()
  })

  // Re-render caption when language changes
  const langObserver = new MutationObserver(() => {
    if (!lightbox.hidden) showCaption(items[currentIndex])
  })
  langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] })
}
