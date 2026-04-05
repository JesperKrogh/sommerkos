interface GalleryImage {
  url: string
  folder: string
  caption_da: string
  caption_en: string
}

export async function initGallery(): Promise<void> {
  const gallery = document.getElementById('gallery')
  const hint    = document.querySelector<HTMLElement>('.gallery__hint')
  if (!gallery) return

  let images: GalleryImage[] = []
  try {
    const res = await fetch('/api/gallery/random?count=6')
    if (!res.ok) return
    images = await res.json()
  } catch {
    return // Leave placeholders if API is unavailable
  }

  if (!images.length) return

  // Hide the "replace placeholders" hint
  if (hint) hint.hidden = true

  const items = Array.from(gallery.querySelectorAll<HTMLElement>('.gallery__item'))

  items.forEach((item, i) => {
    const data = images[i]
    if (!data) return

    item.innerHTML = ''

    const img = document.createElement('img')
    img.src = data.url
    img.alt = data.caption_da || data.folder
    img.loading = 'lazy'
    img.decoding = 'async'

    // Store both captions for lightbox / language switch
    item.dataset.captionDa = data.caption_da
    item.dataset.captionEn = data.caption_en
    item.dataset.folder    = data.folder

    // Hover caption overlay
    const cap = document.createElement('div')
    cap.className = 'gallery__caption'
    cap.innerHTML = `<span class="da">${data.caption_da}</span><span class="en">${data.caption_en}</span>`

    item.appendChild(img)
    item.appendChild(cap)
  })
}
