import QRCode from 'qrcode'

interface InfoscreenImage {
  url: string
  folder: string
  filename: string
  caption_da: string
  caption_en: string
}

interface Activity {
  date: string
  time: string
  activity: string
  location: string
  team: string
  color: string
}

let images: InfoscreenImage[] = []
let currentIndex = 0
let timer: ReturnType<typeof setTimeout> | null = null
let waitTime = 10000
let savedLang: string | null = null
let activitiesRefreshTimer: ReturnType<typeof setInterval> | null = null

export async function initInfoscreen(): Promise<void> {
  const container = document.getElementById('infoscreen')
  if (!container) return

  savedLang = document.documentElement.dataset.lang || 'da'
  document.documentElement.dataset.lang = 'da'
  document.documentElement.lang = 'da'

  const params = new URLSearchParams(window.location.search)
  const wt = parseInt(params.get('waittime') || '10', 10)
  waitTime = Math.max(3, Math.min(wt, 120)) * 1000

  container.innerHTML = `
    <button class="infoscreen__lang-toggle" id="infoscreenLangToggle" aria-label="Switch language">
      <span class="infoscreen__lang-label infoscreen__lang-label--da" data-lang-label="da">DA</span>
      <span class="infoscreen__lang-label infoscreen__lang-label--en" data-lang-label="en">EN</span>
    </button>
    <div class="infoscreen__slides" id="infoscreenSlides"></div>
    <a class="infoscreen__qr" id="infoscreenQr" href="#" target="_blank" rel="noopener noreferrer" aria-label="Edit caption">
      <canvas id="infoscreenQrCanvas"></canvas>
    </a>
    <div class="infoscreen__activities" id="infoscreenActivities"></div>
  `

  const langToggle = document.getElementById('infoscreenLangToggle')
  if (langToggle) {
    updateLangUI()
    langToggle.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const label = target.dataset.langLabel
      if (!label) return
      document.documentElement.dataset.lang = label
      document.documentElement.lang = label
      updateLangUI()
      updateCurrentCaption()
    })
  }

  loadActivities()

  try {
    const res = await fetch('/api/gallery/all')
    if (!res.ok) return
    images = await res.json()
  } catch {
    return
  }

  if (images.length === 0) return

  currentIndex = 0
  showImage(currentIndex)
}

async function updateQrCode(folder: string, filename: string): Promise<void> {
  const qrLink = document.getElementById('infoscreenQr') as HTMLAnchorElement | null
  const canvas = document.getElementById('infoscreenQrCanvas') as HTMLCanvasElement | null
  if (!qrLink || !canvas) return

  const baseUrl = window.location.origin
  const editUrl = `${baseUrl}/caption/edit?folder=${encodeURIComponent(folder)}&image=${encodeURIComponent(filename)}`
  qrLink.href = editUrl

  try {
    await QRCode.toCanvas(canvas, editUrl, {
      width: 80,
      margin: 1,
      color: { dark: '#ffffff', light: '#00000000' }
    })
  } catch {
    // ignore
  }
}

async function loadActivities(): Promise<void> {
  try {
    const res = await fetch('/api/activities')
    if (!res.ok) return
    const activities: Activity[] = await res.json()
    renderActivities(activities)
  } catch {
    // ignore
  }
}

function renderActivities(activities: Activity[]): void {
  const container = document.getElementById('infoscreenActivities')
  if (!container) return

  if (activities.length === 0) {
    container.innerHTML = `<div class="infoscreen__activities-header"><span class="da">Kommende aktiviteter</span><span class="en">Upcoming activities</span></div><div class="infoscreen__activities-empty"><span class="da">Ingen kommende aktiviteter</span><span class="en">No upcoming activities</span></div>`
    return
  }

  const rows = activities.map(a => `
    <div class="infoscreen__activity">
      <div class="infoscreen__activity-dot" style="background-color: ${a.color || '#2eab61'}"></div>
      <div class="infoscreen__activity-content">
        <div class="infoscreen__activity-name">${a.activity}</div>
        <div class="infoscreen__activity-meta">${a.date} · ${a.time}</div>
        ${a.team ? `<div class="infoscreen__activity-team">${a.team}</div>` : ''}
      </div>
    </div>
  `).join('')

  container.innerHTML = `
    <div class="infoscreen__activities-header"><span class="da">Kommende aktiviteter</span><span class="en">Upcoming activities</span></div>
    ${rows}
  `
}

function updateLangUI(): void {
  const lang = document.documentElement.dataset.lang || 'da'
  const daLabel = document.querySelector('.infoscreen__lang-label--da')
  const enLabel = document.querySelector('.infoscreen__lang-label--en')
  if (daLabel) daLabel.classList.toggle('active', lang === 'da')
  if (enLabel) enLabel.classList.toggle('active', lang === 'en')
}

function updateCurrentCaption(): void {
  const img = images[currentIndex]
  if (!img) return
  const lang = document.documentElement.dataset.lang || 'da'
  const caption = lang === 'da' ? img.caption_da : img.caption_en
  const captionEl = document.querySelector('.infoscreen__slide--active .infoscreen__caption')
  if (captionEl && caption) captionEl.textContent = caption
}

function showImage(index: number): void {
  const img = images[index]
  if (!img) return

  const slidesContainer = document.getElementById('infoscreenSlides')
  const currentEl = slidesContainer?.querySelector('.infoscreen__slide--active') as HTMLElement | null
  const lang = document.documentElement.dataset.lang || 'da'
  const caption = lang === 'da' ? img.caption_da : img.caption_en

  const slide = document.createElement('div')
  slide.className = 'infoscreen__slide'
  slide.innerHTML = `
    <img class="infoscreen__image" src="${img.url}" alt="${caption || img.filename}" />
    ${caption ? `<div class="infoscreen__caption">${caption}</div>` : ''}
  `

  slidesContainer?.appendChild(slide)

  const imgEl = slide.querySelector('.infoscreen__image') as HTMLImageElement
  imgEl.addEventListener('load', () => {
    if (currentEl) {
      currentEl.remove()
    }
    requestAnimationFrame(() => {
      slide.classList.add('infoscreen__slide--active')
    })
  })

  imgEl.addEventListener('error', () => {
    slide.remove()
    advance()
  })

  updateQrCode(img.folder, img.filename)

  if (timer) clearTimeout(timer)
  timer = setTimeout(advance, waitTime)
}

function advance(): void {
  currentIndex = (currentIndex + 1) % images.length
  showImage(currentIndex)
}

export function restoreLang(): void {
  if (savedLang) {
    document.documentElement.dataset.lang = savedLang
    document.documentElement.lang = savedLang
  }
  if (activitiesRefreshTimer) {
    clearInterval(activitiesRefreshTimer)
    activitiesRefreshTimer = null
  }
}
