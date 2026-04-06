export function initLightbox(): void {
  const lightbox  = document.getElementById('lightbox') as HTMLElement | null
  const closeBtn  = document.getElementById('lightboxClose')
  const prevBtn   = document.getElementById('lightboxPrev')
  const nextBtn   = document.getElementById('lightboxNext')
  const imgWrap   = document.getElementById('lightboxImgWrap')
  const captionEl = document.getElementById('lightboxCaption')

  if (!lightbox || !closeBtn || !prevBtn || !nextBtn || !imgWrap) return

  const getLang = () => document.documentElement.dataset.lang ?? 'da'

  let items: HTMLElement[] = []
  let currentIndex = 0

  const collectItems = () => {
    const gallery = document.getElementById('gallery')
    const pageGallery = document.getElementById('page-gallery')
    items = []
    if (gallery) items.push(...Array.from(gallery.querySelectorAll<HTMLElement>('.gallery__item, .page-gallery-item')))
    if (pageGallery) items.push(...Array.from(pageGallery.querySelectorAll<HTMLElement>('.gallery__item, .page-gallery-item')))
  }

  const showCaption = (item: HTMLElement) => {
    if (!captionEl) return
    const lang = getLang()
    captionEl.textContent = (lang === 'en' ? item.dataset.captionEn : item.dataset.captionDa) ?? ''
  }

  const showItem = (index: number) => {
    if (!items.length) return
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
    collectItems()
    if (!items.length) return
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

  const bindItems = () => {
    collectItems()
    items.forEach((item, index) => {
      item.setAttribute('tabindex', '0')
      item.setAttribute('role', 'button')
      item.setAttribute('aria-label', `View photo ${index + 1}`)
      item.addEventListener('click', () => open(index))
      item.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(index) }
      })
    })
  }

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

  // Bind items on load and after page changes
  bindItems()

  // Re-bind after route changes
  document.addEventListener('route-change', () => setTimeout(bindItems, 100))
}
