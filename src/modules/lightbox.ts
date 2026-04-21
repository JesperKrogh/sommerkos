const lightbox  = document.getElementById('lightbox') as HTMLElement | null
const closeBtn  = document.getElementById('lightboxClose')
const prevBtn   = document.getElementById('lightboxPrev')
const nextBtn   = document.getElementById('lightboxNext')
const imgWrap   = document.getElementById('lightboxImgWrap')
const captionEl = document.getElementById('lightboxCaption')

type LightboxItem = { src: string; captionDa: string; captionEn: string }

let items: LightboxItem[] = []
let currentIndex = 0

const getLang = () => document.documentElement.dataset.lang ?? 'da'

const collectItems = (): LightboxItem[] => {
  const result: LightboxItem[] = []
  const pageGallery = document.getElementById('page-gallery')
  if (pageGallery && pageGallery.dataset.allImages) {
    try {
      const all: { url: string; caption_da: string; caption_en: string }[] = JSON.parse(pageGallery.dataset.allImages)
      all.forEach(img => result.push({ src: img.url, captionDa: img.caption_da || '', captionEn: img.caption_en || '' }))
    } catch { /* ignore */ }
    return result
  }
  const gallery = document.getElementById('gallery')
  if (gallery) {
    gallery.querySelectorAll<HTMLElement>('.gallery__item').forEach(el => {
      const img = el.querySelector('img')
      if (img) result.push({ src: img.src, captionDa: el.dataset.captionDa || '', captionEn: el.dataset.captionEn || '' })
    })
  }
  return result
}

const showCaption = (item: LightboxItem) => {
  if (!captionEl) return
  const lang = getLang()
  captionEl.textContent = (lang === 'en' ? item.captionEn : item.captionDa) ?? ''
}

const showItem = (index: number) => {
  if (!items.length) return
  currentIndex = (index + items.length) % items.length
  const item = items[currentIndex]
  imgWrap!.innerHTML = ''
  const img = document.createElement('img')
  img.src = item.src
  img.loading = 'eager'
  img.alt = (getLang() === 'en' ? item.captionEn : item.captionDa) || ''
  imgWrap!.appendChild(img)
  showCaption(item)
}

const open = (startIndex: number) => {
  items = collectItems()
  if (!items.length) return
  showItem(startIndex)
  if (lightbox) lightbox.hidden = false
  document.body.style.overflow = 'hidden'
  history.pushState({ lightbox: true }, '')
  closeBtn?.focus()
}

const closeFromUser = () => {
  if (history.state?.lightbox) {
    history.back()
    return
  }
  close()
}

const close = () => {
  if (lightbox) lightbox.hidden = true
  document.body.style.overflow = ''
}

const bindItems = () => {
  const pageGallery = document.getElementById('page-gallery')
  if (pageGallery) {
    pageGallery.querySelectorAll<HTMLElement>('.page-gallery-item').forEach((el, index) => {
      el.setAttribute('tabindex', '0')
      el.setAttribute('role', 'button')
      el.setAttribute('aria-label', `View photo ${index + 1}`)
      el.onclick = () => open(index)
      el.onkeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(index) }
      }
    })
  }
  const gallery = document.getElementById('gallery')
  if (gallery) {
    gallery.querySelectorAll<HTMLElement>('.gallery__item').forEach((el, index) => {
      el.setAttribute('tabindex', '0')
      el.setAttribute('role', 'button')
      el.setAttribute('aria-label', `View photo ${index + 1}`)
      el.onclick = () => open(index)
      el.onkeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(index) }
      }
    })
  }
}

export function rebindLightbox(): void {
  bindItems()
}

export function initLightbox(): void {
  if (!lightbox || !closeBtn || !prevBtn || !nextBtn || !imgWrap) return

  closeBtn.addEventListener('click', closeFromUser)
  prevBtn.addEventListener('click', () => showItem(currentIndex - 1))
  nextBtn.addEventListener('click', () => showItem(currentIndex + 1))

  lightbox.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape')     closeFromUser()
    if (e.key === 'ArrowLeft')  showItem(currentIndex - 1)
    if (e.key === 'ArrowRight') showItem(currentIndex + 1)
  })

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeFromUser()
  })

  window.addEventListener('popstate', () => {
    if (!lightbox.hidden) close()
  })

  const langObserver = new MutationObserver(() => {
    if (!lightbox.hidden) showCaption(items[currentIndex])
  })
  langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] })

  bindItems()

  document.addEventListener('route-change', () => setTimeout(bindItems, 100))
}
