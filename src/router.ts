import { loadData, loadHoldCards, loadFladeCards, loadEvents, loadBestyrelsen, getLang, navigate, getRoute, isEventPast, getUpcomingEvents, formatDateRange, type SiteData, type HoldCards, type FladeCards, type EventCards, type BestyrelsenMember } from './data'
import { rebindLightbox } from './modules/lightbox'
import { initInfoscreen, restoreLang } from './modules/infoscreen'

const SITE_NAME = 'KØS Sejlsport'
const BASE_URL = 'https://kossejlsport.krogh.cc'
const DEFAULT_OG_IMAGE = '/images-overview/flade-optimist.jpg'

function updateMeta(title: string, description: string, path: string, ogImage?: string): void {
  document.title = `${title} | ${SITE_NAME}`
  const url = `${BASE_URL}${path}`

  const setMeta = (prop: string, content: string, isProperty = false) => {
    const attr = isProperty ? 'property' : 'name'
    let el = document.querySelector(`meta[${attr}="${prop}"]`) as HTMLMetaElement | null
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attr, prop)
      document.head.appendChild(el)
    }
    el.content = content
  }

  setMeta('description', description)
  setMeta('og:title', title, true)
  setMeta('og:description', description, true)
  setMeta('og:url', url, true)
  setMeta('og:image', `${BASE_URL}${ogImage || DEFAULT_OG_IMAGE}`, true)
  setMeta('og:site_name', SITE_NAME, true)
  setMeta('og:locale', 'da_DK', true)
  setMeta('twitter:card', 'summary_large_image')
  setMeta('twitter:title', title)
  setMeta('twitter:description', description)
  setMeta('twitter:image', `${BASE_URL}${ogImage || DEFAULT_OG_IMAGE}`, true)

  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = url
}

type PageFn = (data: SiteData, params: Record<string, string>) => string

const routes: { pattern: RegExp; paramNames: string[]; page: PageFn }[] = []

let _holdCards: HoldCards = {}
let _fladeCards: FladeCards = {}
let _events: EventCards = []

function getFladeCardsArray() {
  return Object.values(_fladeCards)
}

function renderEventTile(e: EventCards[number], isDa: boolean): string {
  const lang = isDa ? 'da' : 'en'
  const name = isDa ? e.name_da : e.name_en
  const shortDesc = isDa ? e.short_description_da : e.short_description_en
  const time = isDa ? e.time_da : e.time_en
  const price = isDa ? e.price_da : e.price_en
  const optPrice = isDa ? e.optional_price_da : e.optional_price_en
  const dateStr = formatDateRange(e, lang)
  const past = isEventPast(e)
  const bgStyle = e.image ? `style="--card-bg: url('${e.image}')"` : ''
  const withBg = e.image ? ' event-card--with-bg' : ''

  const metaParts: string[] = []
  if (dateStr) metaParts.push(dateStr)
  if (time) metaParts.push(time)
  if (price) metaParts.push(price)
  if (optPrice) metaParts.push(optPrice)

  return `<a href="/events/${e.slug}" class="event-card${withBg}${past ? ' event-card--past' : ''} reveal" data-link ${bgStyle}>
    ${past ? `<div class="event-card__past-badge"><span class="da">Afsluttet</span><span class="en">Finished</span></div>` : ''}
    <div class="event-card__overlay">
      <div class="event-card__name">${name}</div>
      <div class="event-card__short-desc">${shortDesc}</div>
      <div class="event-card__meta">${metaParts.join(' – ')}</div>
    </div>
  </a>`
}

function addRoute(pattern: string, page: PageFn): void {
  const paramNames: string[] = []
  const regexStr = pattern.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name)
    return '([^/]+)'
  })
  const regex = new RegExp(`^${regexStr}$`)
  routes.push({ pattern: regex, paramNames, page })
}

function matchRoute(path: string): { page: PageFn; params: Record<string, string> } | null {
  for (const { pattern, paramNames, page } of routes) {
    const m = path.match(pattern)
    if (m) {
      const params: Record<string, string> = {}
      paramNames.forEach((name, i) => { params[name] = m[i + 1] || '' })
      return { page, params }
    }
  }
  return null
}

// ── Route definitions ─────────────────────────────────────────────────────────

addRoute('/', renderFrontpage)
addRoute('/hold', renderHoldOverview)
addRoute('/hold/:slug', renderHoldPage)
addRoute('/flade', renderFladeOverview)
addRoute('/flade/:slug', renderFladePage)
addRoute('/events', renderEventsOverview)
addRoute('/events/:slug', renderEventPage)
addRoute('/galleri', renderGalleryPage)
addRoute('/kalender', renderKalenderPage)
addRoute('/tilmelding', renderTilmeldingPage)
addRoute('/om', renderOmOverview)
addRoute('/om/:slug', renderOmSubPage)
addRoute('/infoscreen', renderInfoscreenPage)
addRoute('/caption/edit', renderCaptionEditPage)
addRoute('/caption/review', renderCaptionReviewPage)

// ── Page: Frontpage ───────────────────────────────────────────────────────────

function getHoldCardImage(slug: string): string {
  const imageMap: Record<string, string> = {
    'mini-sejler': 'hold-mini-sejler.jpg',
    'begynder': 'hold-begynder.jpg',
    'fortsaetter': 'hold-fortsætter.jpg',
    'ovede': 'hold-øvede.jpg',
    'adventure': 'hold-adventure.jpg',
    'j70-youngster': 'hold-j70-youngster.jpg',
    'j70-begyndere': 'hold-j70-begyndere.jpg',
    'j70': 'hold-j70-træning.jpg',
  }
  const img = imageMap[slug] || imageMap['j70']
  return `/images-overview/${img}`
}

function getFladeCardImage(slug: string): string {
  const imageMap: Record<string, string> = {
    'optimist': 'flade-optimist.jpg',
    'rs-tera': 'flade-rs-tera.jpg',
    'rs-feva': 'flade-rs-feva.jpg',
    'rs-zest': 'flade-rs-zest.jpg',
    'ilca-laser': 'flade-ilca-laser.jpg',
    'h-baad': 'flade-h-baad.jpg',
    'j70': 'flade-j70.jpg',
  }
  const img = imageMap[slug] || imageMap['j70']
  return `/images-overview/${img}`
}

function renderContactFooter(data: SiteData): string {
  return `
    <footer class="site-footer">
      <div class="container">
        <div class="site-footer__inner">
          <span class="site-footer__address"><span class="da">Svaneknoppen 5, Svanemøllen Havn</span><span class="en">Svaneknoppen 5, Svanemøllen Harbour</span></span>
          <a href="mailto:${data.site.email}" class="site-footer__link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" width="16" height="16"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
            ${data.site.email}
          </a>
          <a href="${data.site.facebook}" target="_blank" rel="noopener noreferrer" class="site-footer__link">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span class="da">Facebook</span><span class="en">Facebook</span>
          </a>
        </div>
      </div>
    </footer>`
}

function renderFrontpage(data: SiteData): string {
  const lang = getLang()
  const isDa = lang === 'da'
  const upcomingEvents = getUpcomingEvents(_events).slice(0, 3)
  const holdSlugs = Object.keys(_holdCards)
  const holdCards = holdSlugs.map(slug => {
    const card = _holdCards[slug]
    return `<a href="/hold/${slug}" class="hold-card hold-card--with-bg reveal" data-link style="--card-bg: url('${getHoldCardImage(slug)}')"><div class="hold-card__name">${isDa ? card.name_da : card.name_en}</div><div class="hold-card__tagline">${isDa ? card.tagline_da : card.tagline_en}</div><div class="hold-card__age">${isDa ? card.age_da : card.age_en}</div><div class="hold-card__time">${isDa ? card.time_da : card.time_en}</div>${card.price_da ? `<div class="hold-card__price">${isDa ? card.price_da : card.price_en}</div>` : ''}</a>`
  }).join('')

  return `
    <section class="hero hero--with-image hero--slideshow" id="hero">
      <div class="hero__bg"></div>
      <div class="hero__content">
        <h1 class="hero__title hero__title--frontpage reveal">
          <span class="da">Hop om bord – fællesskab på vandet</span>
          <span class="en">Come aboard – community on the water</span>
        </h1>
        <p class="hero__sub reveal">
          <span class="da">KØS Sejlsport samler børn, unge og voksne i et sikkert, sjovt og læringsrigt miljø. Eventyret venter på alle aldre.</span>
          <span class="en">KØS Sejlsport brings together children, youth and adults in a safe, fun and educational environment. Adventure awaits for all ages.</span>
        </p>
        <div class="hero__cta-row reveal">
          <a href="/hold" class="btn btn--kos" data-link><span class="da">Start her</span><span class="en">Get started</span></a>
        </div>
      </div>
    </section>

    <section class="section section--mid" id="intro">
      <div class="container">
        <div class="intro-grid">
          <div class="intro-text">
            <span class="section-label reveal"><span class="da">Velkommen til KØS</span><span class="en">Welcome to KØS</span></span>
            <h2 class="section-title reveal">
              <span class="da">Sejlads for børn og unge i alderen 6–25 år</span>
              <span class="en">Sailing for children and youth aged 6–25</span>
            </h2>
            <p class="section-body reveal">
              <span class="da">KØS Sejlsport er en klub for børn og unge i alderen 6–25 år. Vi tilbyder mange forskellige former for sejlads, men fælles for dem alle er, at det skal være trygt, sikkert, hyggeligt og lærerigt at sejle i KØS Sejlsport.</span>
              <span class="en">KØS Sejlsport is a club for children and youth aged 6–25. We offer many different types of sailing, but they all share one thing: sailing at KØS Sejlsport should be safe, secure, cozy, and educational.</span>
            </p>
            <div class="intro-features">
              <div class="intro-feature reveal">
                <span class="intro-feature__icon">🏊</span>
                <span class="da">Fra 6 år</span>
                <span class="en">From age 6</span>
              </div>
              <div class="intro-feature reveal">
                <span class="intro-feature__icon">⛵</span>
                <span class="da">Alle niveauer</span>
                <span class="en">All levels</span>
              </div>
              <div class="intro-feature reveal">
                <span class="intro-feature__icon">👨‍👩‍👧‍👦</span>
                <span class="da">Familievenligt</span>
                <span class="en">Family friendly</span>
              </div>
            </div>
            <a href="/hold" class="btn btn--kos reveal" data-link><span class="da">Se alle hold</span><span class="en">See all teams</span></a>
          </div>
          <div class="intro-images reveal" id="intro-images">
            <div class="intro-image-stack">
              <div class="intro-image intro-image--1" style="background-image: url('/images-web/j70/547201391_1093273222790151_6353806278774509213_n.jpg')"></div>
              <div class="intro-image intro-image--2" style="background-image: url('/images-web/rsfeva/547367784_1091568366293970_682452581349231292_n.jpg')"></div>
              <div class="intro-image intro-image--3" style="background-image: url('/images-web/socialt/492694740_986693480114793_4118764152267689699_n.jpg')"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--mid" id="hold-overview">
      <div class="container">
        <span class="section-label reveal"><span class="da">Hold</span><span class="en">Teams</span></span>
        <h2 class="section-title reveal"><span class="da">Find dit hold</span><span class="en">Find your team</span></h2>
        <div class="hold-grid">
          ${holdCards}
        </div>
      </div>
    </section>

    <section class="section section--mid" id="flade-overview">
      <div class="container">
        <span class="section-label reveal"><span class="da">Flåde</span><span class="en">Fleet</span></span>
        <h2 class="section-title reveal"><span class="da">Vores både</span><span class="en">Our boats</span></h2>
        <div class="flade-grid">
          ${getFladeCardsArray().map((f) => `<a href="/flade/${f.slug}" class="flade-card flade-card--with-bg reveal" data-link style="--card-bg: url('${getFladeCardImage(f.slug)}')"><div class="flade-card__name">${isDa ? f.name_da : f.name_en}</div><div class="flade-card__specs">${isDa ? f.specs_da : f.specs_en}</div><div class="flade-card__designer">${isDa ? f.designer_da : f.designer_en}</div></a>`).join('')}
        </div>
      </div>
    </section>

    ${upcomingEvents.length ? `<section class="section section--deep" id="events-overview">
      <div class="container">
        <div class="events-section-header reveal">
          <div>
            <span class="section-label section-label--light"><span class="da">Events</span><span class="en">Events</span></span>
            <h2 class="section-title section-title--light"><span class="da">Kommende events</span><span class="en">Upcoming events</span></h2>
          </div>
          <a href="/events" class="btn btn--kos-outline" data-link><span class="da">Se alle events</span><span class="en">See all events</span></a>
        </div>
        <div class="events-list">
          ${upcomingEvents.map(e => renderEventTile(e, isDa)).join('')}
        </div>
      </div>
    </section>` : ''}

    ${renderContactFooter(data)}
  `
}

// ── Page: Hold Overview ───────────────────────────────────────────────────────

function renderHoldOverview(_data: SiteData): string {
  const isDa = getLang() === 'da'
  const holdSlugs = Object.keys(_holdCards)
  const holdCards = holdSlugs.map(slug => {
    const card = _holdCards[slug]
    return `<a href="/hold/${slug}" class="hold-card hold-card--with-bg reveal" data-link style="--card-bg: url('${getHoldCardImage(slug)}')"><div class="hold-card__name">${isDa ? card.name_da : card.name_en}</div><div class="hold-card__tagline">${isDa ? card.tagline_da : card.tagline_en}</div><div class="hold-card__age">${isDa ? card.age_da : card.age_en}</div><div class="hold-card__time">${isDa ? card.time_da : card.time_en}</div><div class="hold-card__boat">${isDa ? card.equipment_da : card.equipment_en}</div>${card.price_da ? `<div class="hold-card__price">${isDa ? card.price_da : card.price_en}</div>` : ''}</a>`
  }).join('')
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><span><span class="da">Hold</span><span class="en">Teams</span></span></nav>
      <h1 class="page-hero__title"><span class="da">Hold</span><span class="en">Teams</span></h1>
      <p class="page-hero__sub"><span class="da">Find det hold der passer til dig — uanset alder og niveau. KØS Sejlsport har et tilbud til alle mellem 6 og 25 år — aldersintervallerne beskriver de typiske aldersgrupper på holdene.</span><span class="en">Find the team that suits you — regardless of age and level. KØS Sejlsport has an offering for everyone between 6 and 25 years — the age ranges describe the typical age groups on the teams.</span></p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="hold-grid">${holdCards}</div>
    </div></section>
    ${renderContactFooter(_data)}
  `
}

// ── Page: Flåde Overview ──────────────────────────────────────────────────────

function renderFladeOverview(_data: SiteData): string {
  const isDa = getLang() === 'da'
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><span><span class="da">Flåde</span><span class="en">Fleet</span></span></nav>
      <h1 class="page-hero__title"><span class="da">Flåde</span><span class="en">Fleet</span></h1>
      <p class="page-hero__sub"><span class="da">Udforsk vores både — fra små joller til store kølbåde</span><span class="en">Explore our boats — from small dinghies to large keelboats</span></p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <p class="section-body"><span class="da">I KØS Sejlsport har vi mange forskellige joller (1- og 2-personers) og både (3-4 personers) der passer til de forskellige aktiviteter. Typisk startes der med joller, og når sejlteknik og fysik er god nok, kan kølbådene komme i spil.</span><span class="en">At KØS Sejlsport we have many different dinghies (1- and 2-person) and boats (3-4 person) suited to the various activities. Typically you start with dinghies, and when your sailing skills and physical ability are good enough, the keelboats come into play.</span></p>
      <div class="flade-grid">${getFladeCardsArray().map((f) => `<a href="/flade/${f.slug}" class="flade-card flade-card--with-bg reveal" data-link style="--card-bg: url('${getFladeCardImage(f.slug)}')"><div class="flade-card__name">${isDa ? f.name_da : f.name_en}</div><div class="flade-card__specs">${isDa ? f.specs_da : f.specs_en}</div><div class="flade-card__designer">${isDa ? f.designer_da : f.designer_en}</div></a>`).join('')}</div>
    </div></section>
    ${renderContactFooter(_data)}
  `
}

function renderHoldPage(_data: SiteData, params: Record<string, string>): string {
  const card = _holdCards[params.slug]
  if (!card) return renderNotFound()
  const isDa = getLang() === 'da'
  const cardName = isDa ? card.name_da : card.name_en
  const cardTagline = isDa ? card.tagline_da : card.tagline_en
  const cardAge = isDa ? card.age_da : card.age_en
  const cardTime = isDa ? card.time_da : card.time_en
  const cardSeason = isDa ? card.season_da : card.season_en
  const cardEquipment = isDa ? card.equipment_da : card.equipment_en
  const cardPrice = isDa ? card.price_da : card.price_en
  const cardDescription = isDa ? card.description_da : card.description_en
  const activities = (isDa ? card.activities_da : card.activities_en) || []
  const prerequisites = (isDa ? card.prerequisites_da : card.prerequisites_en) || ''
  const expectations = (isDa ? card.expectations_da : card.expectations_en) || []
  const coaches = isDa ? card.coaches_da : card.coaches_en
  const signupUrl = card.signup_url
  const signupWidget = card.signup_widget

  let equipmentHtml = cardEquipment
  if (card.boat_slugs && card.boat_slugs.length) {
    const boatNames = cardEquipment.split(',').map((s: string) => s.trim())
    equipmentHtml = boatNames.map((name: string, i: number) => {
      const slug = card.boat_slugs![i]
      if (slug && _fladeCards[slug]) {
        return `<a href="/flade/${slug}" class="flade-team-link" data-link>${name}</a>`
      }
      return name
    }).join(', ')
  }

  const activitiesHtml = activities.length ? `<div class="hold-detail-section"><h3 class="hold-detail-section__title"><span class="da">Aktiviteter</span><span class="en">Activities</span></h3><ul>${activities.map(a => `<li>${a}</li>`).join('')}</ul></div>` : ''
  const prerequisitesHtml = prerequisites ? `<div class="hold-detail-section"><h3 class="hold-detail-section__title"><span class="da">Forudsætninger</span><span class="en">Prerequisites</span></h3><p>${prerequisites}</p></div>` : ''
  const expectationsHtml = expectations.length ? `<div class="hold-detail-section"><h3 class="hold-detail-section__title"><span class="da">Forventninger</span><span class="en">Expectations</span></h3><ul>${expectations.map(e => `<li>${e}</li>`).join('')}</ul></div>` : ''
  const coachesHtml = coaches.length ? `<div class="hold-detail-section"><h3 class="hold-detail-section__title"><span class="da">Trænere</span><span class="en">Coaches</span></h3><ul>${coaches.map(c => `<li>${c}</li>`).join('')}</ul></div>` : ''
  const signupHtml = signupWidget
    ? `<div class="hold-detail-signup-widget"><iframe src="${signupWidget}" width="100%" height="800" frameborder="0" loading="lazy"></iframe><div class="powered-by-holdsport">Powered by Holdsport</div></div>`
    : signupUrl ? `<a href="${signupUrl}" class="btn btn--kos" target="_blank"><span class="da">Tilmeld</span><span class="en">Sign up</span></a>` : ''

  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><a href="/hold" data-link><span class="da">Hold</span><span class="en">Teams</span></a><span class="breadcrumb__sep">›</span><span>${cardName}</span></nav>
      <h1 class="page-hero__title">${cardName}</h1>
      ${cardTagline ? `<p class="page-hero__tagline">${cardTagline}</p>` : ''}
      <p class="page-hero__sub">${cardAge} · ${cardTime}</p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="hold-detail-top">
        <div class="hold-detail__info">
          <div class="info-grid info-grid--vertical">
            <div class="info-item"><span class="info-item__label"><span class="da">Alder</span><span class="en">Age</span></span><span class="info-item__value">${cardAge}</span></div>
            <div class="info-item"><span class="info-item__label"><span class="da">Tidspunkt</span><span class="en">Time</span></span><span class="info-item__value">${cardTime}</span></div>
            <div class="info-item"><span class="info-item__label"><span class="da">Sæson</span><span class="en">Season</span></span><span class="info-item__value">${cardSeason}</span></div>
            <div class="info-item"><span class="info-item__label"><span class="da">Båd</span><span class="en">Boat</span></span><span class="info-item__value flade-team-links">${equipmentHtml}</span></div>
            ${cardPrice ? `<div class="info-item"><span class="info-item__label"><span class="da">Pris</span><span class="en">Price</span></span><span class="info-item__value">${cardPrice}</span></div>` : ''}
          </div>
        </div>
        <div class="hold-detail__gallery">
          <div class="page-content__gallery" id="page-gallery" data-folders='${card.image_folders.join(",")}'></div>
        </div>
      </div>
      <div class="hold-detail-bottom">
        <div class="hold-detail-body">
          <div class="hold-detail-section">
            <h3 class="hold-detail-section__title"><span class="da">Beskrivelse</span><span class="en">Description</span></h3>
            <p class="hold-detail-section__description">${cardDescription}</p>
          </div>
          ${activitiesHtml}
          ${prerequisitesHtml}
          ${expectationsHtml}
          ${coachesHtml}
        </div>
        ${signupHtml ? `<div class="hold-detail__signup">${signupHtml}</div>` : ''}
      </div>
    </div></section>
    ${renderContactFooter(_data)}
  `
}

// ── Page: Flåde Detail ────────────────────────────────────────────────────────

function renderFladePage(_data: SiteData, params: Record<string, string>): string {
  const flade = _fladeCards[params.slug]
  if (!flade) return renderNotFound()
  const isDa = getLang() === 'da'
  const teamsHtml = flade.team_slugs.map((slug: string, i: number) => {
    const name = isDa ? flade.teams_da[i] : flade.teams_en[i]
    return `<a href="/hold/${slug}" class="flade-team-link" data-link>${name}</a>`
  }).join('')

  const linksHtml: string[] = []
  if (flade.manufacturer_url) {
    const label = isDa ? 'Producent / klasse' : 'Manufacturer / class'
    linksHtml.push(`<a href="${flade.manufacturer_url}" target="_blank" rel="noopener" class="flade-link">${label} ↗</a>`)
  }
  if (flade.class_url) {
    linksHtml.push(`<a href="${flade.class_url}" target="_blank" rel="noopener" class="flade-link">Dansk Sejlunion ↗</a>`)
  }

  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><a href="/flade" data-link><span class="da">Flåde</span><span class="en">Fleet</span></a><span class="breadcrumb__sep">›</span><span>${isDa ? flade.name_da : flade.name_en}</span></nav>
      <h1 class="page-hero__title">${isDa ? flade.name_da : flade.name_en}</h1>
      <p class="page-hero__sub">${isDa ? flade.specs_da : flade.specs_en}</p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="hold-detail-top">
        <div class="hold-detail__info">
          <div class="info-grid info-grid--vertical">
            ${flade.class_insignia ? `<div class="info-item info-item--insignia"><span class="info-item__label"><span class="da">Klassemærke</span><span class="en">Class insignia</span></span><span class="info-item__value"><img src="${flade.class_insignia}" alt="${isDa ? flade.name_da : flade.name_en} klassemærke" class="class-insignia" /></span></div>` : ''}
            <div class="info-item"><span class="info-item__label"><span class="da">Specifikationer</span><span class="en">Specifications</span></span><span class="info-item__value">${isDa ? flade.specs_da : flade.specs_en}</span></div>
            <div class="info-item"><span class="info-item__label"><span class="da">Designer / Producent</span><span class="en">Designer / Manufacturer</span></span><span class="info-item__value">${isDa ? flade.designer_da : flade.designer_en}</span></div>
            <div class="info-item"><span class="info-item__label"><span class="da">Bruges på hold</span><span class="en">Used on teams</span></span><span class="info-item__value flade-team-links">${teamsHtml}</span></div>
          </div>
        </div>
        <div class="hold-detail__gallery">
          <div class="page-content__gallery" id="page-gallery" data-folders='${flade.image_folder}'></div>
        </div>
      </div>
      <div class="hold-detail-bottom">
        <div class="hold-detail-body">
          <div class="hold-detail-section">
            <h3 class="hold-detail-section__title"><span class="da">Beskrivelse</span><span class="en">Description</span></h3>
            <p class="hold-detail-section__description">${isDa ? flade.description_da : flade.description_en}</p>
          </div>
          ${linksHtml.length ? `<div class="hold-detail-section">
            <h3 class="hold-detail-section__title"><span class="da">Links</span><span class="en">Links</span></h3>
            <div class="flade-links">${linksHtml.join('')}</div>
          </div>` : ''}
        </div>
      </div>
    </div></section>
    ${renderContactFooter(_data)}
  `
}

// ── Page: Events Overview ─────────────────────────────────────────────────────

function renderEventsOverview(_data: SiteData): string {
  const isDa = getLang() === 'da'
  const events = _events
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><span><span class="da">Events</span><span class="en">Events</span></span></nav>
      <h1 class="page-hero__title"><span class="da">Events</span><span class="en">Events</span></h1>
      <p class="page-hero__sub"><span class="da">Alle events og arrangementer i KØS Sejlsport</span><span class="en">All events and activities at KØS Sejlsport</span></p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="events-list">${events.map(e => renderEventTile(e, isDa)).join('')}</div>
    </div></section>
    ${renderContactFooter(_data)}
  `
}

// ── Page: Event Detail ────────────────────────────────────────────────────────

function renderEventPage(_data: SiteData, params: Record<string, string>): string {
  const event = _events.find(e => e.slug === params.slug)
  if (!event) return renderNotFound()
  const isDa = getLang() === 'da'
  const lang = isDa ? 'da' as const : 'en' as const
  const dateStr = formatDateRange(event, lang)
  const descRaw = isDa ? event.description_da : event.description_en
  const descHtml = descRaw.split('\n\n').map(p => `<p class="section-body">${p}</p>`).join('')
  const imageHtml = event.image ? `<img src="${event.image}" alt="${isDa ? event.name_da : event.name_en}" class="event-page__image" loading="lazy">` : ''
  const price = isDa ? event.price_da : event.price_en
  const optionalPrice = isDa ? event.optional_price_da : event.optional_price_en
  const signupHtml = event.signup_widget
    ? `<div class="hold-detail-signup-widget"><iframe src="${event.signup_widget}" width="100%" height="800" frameborder="0" loading="lazy"></iframe><div class="powered-by-holdsport">Powered by Holdsport</div></div>`
    : event.signup_url
    ? `<a href="${event.signup_url}" class="btn btn--primary" target="_blank" rel="noopener noreferrer"><span class="da">Tilmeld</span><span class="en">Sign up</span></a>`
    : ''
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><a href="/events" data-link><span class="da">Events</span><span class="en">Events</span></a><span class="breadcrumb__sep">›</span><span>${isDa ? event.name_da : event.name_en}</span></nav>
      <h1 class="page-hero__title">${isDa ? event.name_da : event.name_en}</h1>
      <p class="page-hero__sub">${dateStr || (isDa ? event.time_da : event.time_en)}</p>
      <p class="page-hero__tagline">${isDa ? event.tagline_da : event.tagline_en}</p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="page-content">
        <div class="page-content__text">
          ${descHtml}
          ${price ? `<p class="event-page__price"><strong>${price}</strong>${optionalPrice ? ` <span class="event-page__price-note">· ${optionalPrice}</span>` : ''}</p>` : ''}
          ${signupHtml}
        </div>
        <div class="page-content__sidebar">
          ${imageHtml ? `<div class="page-content__image">${imageHtml}</div>` : ''}
          ${event.image_folder ? `<div class="page-content__gallery" id="page-gallery" data-folders='${event.image_folder}'></div>` : ''}
        </div>
      </div>
    </div></section>
    ${renderContactFooter(_data)}
  `
}

// ── Page: Gallery ─────────────────────────────────────────────────────────────

function renderGalleryPage(_data: SiteData): string {
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><span><span class="da">Galleri</span><span class="en">Gallery</span></span></nav>
      <h1 class="page-hero__title"><span class="da">Galleri</span><span class="en">Gallery</span></h1>
      <p class="page-hero__tagline"><span class="da">Udforsk billeder fra alle vores aktiviteter</span><span class="en">Explore photos from all our activities</span></p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="gallery-folders" id="gallery-folders"></div>
      <div class="gallery-folder-view" id="gallery-folder-view" style="display:none">
        <button class="gallery-back-btn" id="gallery-back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          <span class="da">Tilbage til kategorier</span><span class="en">Back to categories</span>
        </button>
        <h2 class="gallery-folder-title" id="gallery-folder-title"></h2>
        <div class="page-content__gallery" id="page-gallery"></div>
      </div>
    </div></section>
    ${renderContactFooter(_data)}
  `
}

// ── Page: Infoscreen (kiosk display) ─────────────────────────────────────────

function renderInfoscreenPage(): string {
  return `<div class="infoscreen" id="infoscreen"></div>`
}

// ── Page: Caption Edit ────────────────────────────────────────────────────────

function renderCaptionEditPage(_data: SiteData): string {
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><span><span class="da">Rediger billedtekst</span><span class="en">Edit caption</span></span></nav>
      <h1 class="page-hero__title"><span class="da">Rediger billedtekst</span><span class="en">Edit caption</span></h1>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="caption-edit" id="captionEdit">
        <div class="caption-edit__loading"><span class="da">Indlæser...</span><span class="en">Loading...</span></div>
      </div>
    </div></section>
    ${renderContactFooter(_data)}
  `
}

// ── Page: Caption Review ──────────────────────────────────────────────────────

function renderCaptionReviewPage(_data: SiteData): string {
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><span><span class="da">Gennemgå forslag</span><span class="en">Review suggestions</span></span></nav>
      <h1 class="page-hero__title"><span class="da">Gennemgå billedtekst-forslag</span><span class="en">Review caption suggestions</span></h1>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="caption-review" id="captionReview">
        <div class="caption-edit__loading"><span class="da">Indlæser...</span><span class="en">Loading...</span></div>
      </div>
    </div></section>
    ${renderContactFooter(_data)}
  `
}

// ── Page: Om (About) ────────────────────────────────────────────────────────

function renderAboutSections(sections: { title: string; text: string }[] | undefined): string {
  if (!sections) return ''
  return sections.map(s => `
    <div class="about-subsection">
      <h3 class="about-subsection__title">${s.title}</h3>
      <p class="about-subsection__text">${s.text}</p>
    </div>
  `).join('')
}

function renderNybegynderPage(sections: { title: string; text: string }[], isDa: boolean): string {
  // Custom image mapping for each section
  // We'll use specific images for specific sections, and fall back to cycling for others
  const customImageMap: Record<number, string> = {
    3: '45DABFCC-252A-4CD0-AFAA-D8044EFFC800.jpg', // 👕 Tøj og varme
    8: '504379903_1063986395718834_8596789478345456645_n.jpg' // 🚩 God opstart
  }
  
  // General image pool for cycling through other sections
  const imagePool = [
    '491288651_987538236696984_5216933562702563713_n.jpg',
    '499784713_1017792300338244_2922351705909202044_n.jpg',
    '504378096_1037081355076005_6914104289461035240_n.jpg',
    '514340140_1063983295719144_8395703865714017596_n.jpg',
    '514917521_1037081375076003_8798524774020815478_n.jpg',
    '527500299_1060930106024463_2018805063777711299_n.jpg',
    '528470530_1062832979167509_5681808038088967856_n.jpg',
    '528613850_1061675425949931_8807038098988250457_n.jpg',
    '529700726_1063983375719136_453241296820112562_n.jpg',
    '586921763_1154016800049126_4586769144178668977_n.jpg',
    '591697516_1154016806715792_2862262999162887056_n.jpg',
    '591744585_1154016796715793_1748447747056941573_n.jpg',
    '591750349_1154656239985182_7425083467368490826_n.jpg',
    '591771283_1154016803382459_5237296944235722678_n.jpg'
  ]
  
  const sectionsHtml = sections.map((section, index) => {
    // Use custom image if defined, otherwise cycle through image pool
    let imageName: string
    if (customImageMap[index]) {
      imageName = customImageMap[index]
    } else {
      const poolIndex = index % imagePool.length
      imageName = imagePool[poolIndex]
    }
    
    const imageSrc = `/images/static/begynder/${imageName}`
    
    // Alternate layout pattern: text-left for even, text-right for odd
    const isAlternate = index % 2 === 1
    
    // Convert markdown table to HTML if present
    let textHtml = section.text
    // Simple markdown table conversion (basic support for the Beaufort table)
    if (section.text.includes('|')) {
      const lines = section.text.split('\n')
      let inTable = false
      let hasHeader = false
      const processedLines: string[] = []
      
      for (let line of lines) {
        if (line.trim().startsWith('|') && line.includes('|')) {
          if (!inTable) {
            // Start table
            processedLines.push('<table class="nybegynder-table">')
            inTable = true
          }
          // Parse table row
          const cells = line.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim())
          if (cells.length > 0) {
            if (line.includes('---') || line.includes('|--')) {
              // This is a separator row - skip it, we already have header
              continue
            } else if (!hasHeader) {
              // First non-separator row is the header
              processedLines.push('<thead><tr>' + cells.map(cell => `<th>${cell}</th>`).join('') + '</tr></thead><tbody>')
              hasHeader = true
            } else {
              // Normal data row
              processedLines.push('<tr>' + cells.map(cell => `<td>${cell}</td>`).join('') + '</tr>')
            }
          }
        } else {
          if (inTable) {
            processedLines.push('</tbody></table>')
            inTable = false
            hasHeader = false
          }
          processedLines.push(line)
        }
      }
      
      if (inTable) {
        processedLines.push('</tbody></table>')
      }
      
      textHtml = processedLines.join('\n')
    }
    
    // Replace markdown headers
    textHtml = textHtml.replace(/^##\s+(.+)$/gm, '<h4>$1</h4>')
    textHtml = textHtml.replace(/^###\s+(.+)$/gm, '<h5>$1</h5>')
    
    return `
    <div class="nybegynder-section ${isAlternate ? 'nybegynder-section--alternate' : ''}">
      <div class="nybegynder-section__inner">
        <div class="nybegynder-section__content">
          <h2 class="nybegynder-section__title">${section.title}</h2>
          <div class="nybegynder-section__text">${textHtml}</div>
        </div>
        <div class="nybegynder-section__image">
          <img src="${imageSrc}" alt="${section.title}" loading="lazy">
        </div>
      </div>
    </div>
    `
  }).join('')
  
  // Get mini-sejler and begynder hold cards for tiles
  const miniSejlerCard = _holdCards['mini-sejler']
  const begynderCard = _holdCards['begynder']
  
  // Function to get hold card image (similar to getHoldCardImage function)
  function getHoldTileImage(slug: string): string {
    return `/images-overview/hold-${slug}.jpg`
  }
  
  // Create tiles similar to hold overview page
  const tilesHtml = `
    <div class="nybegynder-tiles reveal">
      <h3 class="nybegynder-tiles__title">${isDa ? 'Kom i gang' : 'Get started'}</h3>
      <p class="nybegynder-tiles__description">${isDa ? 'Vælg det hold, der passer til alder og erfaring' : 'Choose the team that fits age and experience'}</p>
      <div class="nybegynder-tiles__grid">
        ${miniSejlerCard ? `
          <a href="/hold/mini-sejler" class="nybegynder-tile nybegynder-tile--with-bg" data-link style="--tile-bg: url('${getHoldTileImage('mini-sejler')}')">
            <div class="nybegynder-tile__name">${isDa ? miniSejlerCard.name_da : miniSejlerCard.name_en}</div>
            <div class="nybegynder-tile__tagline">${isDa ? miniSejlerCard.tagline_da : miniSejlerCard.tagline_en}</div>
            <div class="nybegynder-tile__age">${isDa ? miniSejlerCard.age_da : miniSejlerCard.age_en}</div>
            <div class="nybegynder-tile__time">${isDa ? miniSejlerCard.time_da : miniSejlerCard.time_en}</div>
            ${miniSejlerCard.price_da ? `<div class="nybegynder-tile__price">${isDa ? miniSejlerCard.price_da : miniSejlerCard.price_en}</div>` : ''}
          </a>
        ` : ''}
        ${begynderCard ? `
          <a href="/hold/begynder" class="nybegynder-tile nybegynder-tile--with-bg" data-link style="--tile-bg: url('${getHoldTileImage('begynder')}')">
            <div class="nybegynder-tile__name">${isDa ? begynderCard.name_da : begynderCard.name_en}</div>
            <div class="nybegynder-tile__tagline">${isDa ? begynderCard.tagline_da : begynderCard.tagline_en}</div>
            <div class="nybegynder-tile__age">${isDa ? begynderCard.age_da : begynderCard.age_en}</div>
            <div class="nybegynder-tile__time">${isDa ? begynderCard.time_da : begynderCard.time_en}</div>
            ${begynderCard.price_da ? `<div class="nybegynder-tile__price">${isDa ? begynderCard.price_da : begynderCard.price_en}</div>` : ''}
          </a>
        ` : ''}
      </div>
    </div>
  `
  
  return `
    <div class="nybegynder-alternating">
      ${sectionsHtml}
    </div>
    ${tilesHtml}
  `
}

function renderTilmeldingPage(_data: SiteData): string {
  return `
    <section class="page-hero"><div class="container">
      <h1 class="page-hero__title"><span class="da">Tilmelding</span><span class="en">Sign Up</span></h1>
      <p class="page-hero__tagline"><span class="da">Skriv dig på venteliste på et hold</span><span class="en">Join the waitlist for a team</span></p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="tilmelding-description">
        <p><span class="da">Her kan du skrive dig på venteliste på et hold, når du har gjort det vil du enten blive tilføjet holdet og få en velkomst besked eller blive kontaktet pr mail — når der er plads. Sejlsæsonen starter typisk i ugen omkring 1. Maj og varer til efterårsferien — men der er også aktiviteter gennem vinteren, dog betydeligt lavere end i sejlsæsonen.</span><span class="en">Here you can join the waitlist for a team. Once you do, you will either be added to the team and receive a welcome message, or be contacted by email when there is space. The sailing season typically starts around May 1st and lasts until the autumn holiday — but there are also activities during winter, though significantly fewer than during the sailing season.</span></p>
      </div>
      <div class="hold-detail-signup-widget">
        <iframe src="https://www.kossejlsport.dk/widgets/kos-sejlsport?mobile=false&hide_profile_mobile=false&hide_profile_email=false&content_type=team_application&team_id=355608,355609,204225,218884,559744,463392,751665,51433,521573,521574,777446,655027,655029,649114,655000,655001&show_price_type_table=false&allow_price_type_selection=false" width="100%" height="800" frameborder="0" loading="lazy"></iframe>
        <div class="powered-by-holdsport">Powered by Holdsport</div>
      </div>
    </div></section>
    ${renderContactFooter(_data)}
  `
}

function renderKalenderPage(_data: SiteData): string {
  return `
    <section class="page-hero"><div class="container">
      <h1 class="page-hero__title"><span class="da">Klub Kalender</span><span class="en">Club Calendar</span></h1>
      <p class="page-hero__tagline"><span class="da">Se klubbens aktiviteter og tilmeld dig direkte</span><span class="en">See club activities and sign up directly</span></p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="calendar-widget">
        <iframe src="https://www.kossejlsport.dk/widgets/kos-sejlsport?mobile=false&hide_profile_mobile=false&hide_profile_email=false&content_type=activities_table&show_price_type_table=false&allow_price_type_selection=false&activity_types=1,2,3,4,5,6,7,8,9,46232,1012,1144,110095&limit=25" width="100%" height="800" frameborder="0" loading="lazy"></iframe>
        <div class="powered-by-holdsport">Powered by Holdsport</div>
      </div>
    </div></section>
    ${renderContactFooter(_data)}
  `
}

const OM_PAGES = [
  { slug: 'vedtaegter', icon: '📋' },
  { slug: 'bestyrelsen', icon: '👥' },
  { slug: 'sikkerhed', icon: '🛟' },
  { slug: 'udmeldelse', icon: '👋' },
  { slug: 'nybegynder-til-jollesejlads', icon: '⛵' },
]

function renderOmOverview(data: SiteData): string {
  const isDa = getLang() === 'da'
  const { about } = data
  const cards = OM_PAGES.map(p => {
    const section = about[p.slug as keyof typeof about]
    const name = isDa ? section.title_da : section.title_en
    const firstSection = (isDa ? section.sections_da : section.sections_en)?.[0]
    let desc = ''
    if (p.slug === 'bestyrelsen') {
      desc = isDa ? 'Mød bestyrelsen bag KØS Sejlsport…' : 'Meet the board behind KØS Sejlsport…'
    } else if (p.slug === 'nybegynder-til-jollesejlads') {
      desc = isDa ? 'Introduktion til jollesejlads for helt nye sejlere og deres forældre…' : 'Introduction to dinghy sailing for complete beginners and their parents…'
    } else if (firstSection) {
      desc = firstSection.text.slice(0, 140) + '…'
    }
    return `<a href="/om/${p.slug}" class="om-card om-card--with-bg reveal" data-link style="--card-bg: var(--om-${p.slug}-bg)">
      <div class="om-card__icon">${p.icon}</div>
      <div class="om-card__name">${name}</div>
      <div class="om-card__desc">${desc}</div>
    </a>`
  }).join('')

  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><span><span class="da">Om KØS</span><span class="en">About KØS</span></span></nav>
      <h1 class="page-hero__title"><span class="da">Om KØS</span><span class="en">About KØS</span></h1>
      <p class="page-hero__sub"><span class="da">Vedtægter, bestyrelse, sikkerhed, nybegynder vejledning og praktisk info</span><span class="en">Constitution, board, safety, beginner guide and practical info</span></p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="om-grid">${cards}</div>
    </div></section>
    ${renderContactFooter(data)}
  `
}

let _bestyrelsenMembers: BestyrelsenMember[] | null = null

function renderOmSubPage(data: SiteData, params: Record<string, string>): string {
  const slug = params.slug
  const section = data.about[slug as keyof typeof data.about]
  if (!section) return renderNotFound()
  const isDa = getLang() === 'da'
  const name = isDa ? section.title_da : section.title_en
  const sections = isDa ? section.sections_da : section.sections_en
  const isBestyrelsen = slug === 'bestyrelsen'
  const isNybegynder = slug === 'nybegynder-til-jollesejlads'

  let contentHtml = ''
  if (isBestyrelsen && _bestyrelsenMembers) {
    contentHtml = `<div class="board-grid">${_bestyrelsenMembers.map(m => {
      const role = isDa ? m.role_da : m.role_en
      const bio = isDa ? m.bio_da : m.bio_en
      return `
      <div class="board-member reveal">
        <img src="${m.image}" alt="${m.name}" class="board-member__photo" loading="lazy">
        <div class="board-member__info">
          <div class="board-member__name">${m.name}</div>
          <div class="board-member__role">${role}</div>
          ${bio ? `<p class="board-member__bio">${bio}</p>` : ''}
          <div class="board-member__contact">
            ${m.phone ? `<a href="tel:${m.phone.replace(/\s/g, '')}" class="board-member__link">${m.phone}</a>` : ''}
            ${m.email ? `<a href="mailto:${m.email}" class="board-member__link">${m.email}</a>` : ''}
          </div>
        </div>
      </div>`
    }).join('')}</div>`
  } else if (isNybegynder && sections) {
    contentHtml = renderNybegynderPage(sections, isDa)
  } else if (sections) {
    contentHtml = `<div class="about-section__content">${renderAboutSections(sections)}</div>`
  }

  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><a href="/om" data-link><span class="da">Om KØS</span><span class="en">About KØS</span></a><span class="breadcrumb__sep">›</span><span>${name}</span></nav>
      <h1 class="page-hero__title">${name}</h1>
    </div></section>
    <section class="section section--mid"><div class="container">
      ${contentHtml}
    </div></section>
    ${renderContactFooter(data)}
  `
}

// ── Page: Not Found ───────────────────────────────────────────────────────────

function renderNotFound(): string {
  return `
    <section class="page-hero"><div class="container" style="text-align:center">
      <h1 class="page-hero__title">404</h1>
      <p class="page-hero__sub"><span class="da">Siden blev ikke fundet</span><span class="en">Page not found</span></p>
      <a href="/" class="btn btn--kos" data-link style="margin-top:2rem"><span class="da">Tilbage til forsiden</span><span class="en">Back to frontpage</span></a>
    </div></section>
  `
}

// ── Router init ───────────────────────────────────────────────────────────────

function getRouteMeta(path: string, data: SiteData, params: Record<string, string>): { title: string; description: string; ogImage?: string } {
  const isDa = getLang() === 'da'
  if (path === '/') return { title: isDa ? 'Hop om bord' : 'Come aboard', description: isDa ? 'KØS Sejlsport samler børn, unge og voksne i et sikkert, sjovt og læringsrigt miljø ved Svanemøllen Havn.' : 'KØS Sejlsport brings together children, youth and adults in a safe, fun environment at Svanemøllen Harbour.' }
  if (path === '/hold') return { title: isDa ? 'Hold' : 'Teams', description: isDa ? 'Find dit hold i KØS Sejlsport — fra Mini-Sejler til J70.' : 'Find your team at KØS Sejlsport — from Mini Sailor to J70.' }
  if (path === '/flade') return { title: isDa ? 'Flåde' : 'Fleet', description: isDa ? 'Udforsk vores både — fra små joller til store kølbåde.' : 'Explore our boats — from small dinghies to large keelboats.' }
  if (path === '/galleri') return { title: isDa ? 'Galleri' : 'Gallery', description: isDa ? 'Billeder fra livet på vandet i KØS Sejlsport.' : 'Photos from life on the water at KØS Sejlsport.' }
  if (path === '/kalender') return { title: isDa ? 'Kalender' : 'Calendar', description: isDa ? 'Se klubbens aktiviteter og tilmeld dig direkte.' : 'See club activities and sign up directly.' }
  if (path === '/tilmelding') return { title: isDa ? 'Tilmelding' : 'Sign Up', description: isDa ? 'Skriv dig på venteliste på et hold i KØS Sejlsport.' : 'Join the waitlist for a team at KØS Sejlsport.' }
  if (path === '/om') return { title: isDa ? 'Om KØS' : 'About KØS', description: isDa ? 'Vedtægter, bestyrelse, sikkerhed og praktisk info om KØS Sejlsport.' : 'Constitution, board, safety and practical info about KØS Sejlsport.' }
  if (path === '/events') return { title: isDa ? 'Events' : 'Events', description: isDa ? 'Kommende events og arrangementer i KØS Sejlsport.' : 'Upcoming events and activities at KØS Sejlsport.' }
  if (path === '/infoscreen') return { title: 'Infoscreen', description: isDa ? 'Infoskærm for KØS Sejlsport' : 'Infoscreen for KØS Sejlsport' }
  if (path === '/caption/edit') return { title: isDa ? 'Rediger billedtekst' : 'Edit caption', description: isDa ? 'Foreslå ny billedtekst' : 'Suggest a new caption' }
  if (path === '/caption/review') return { title: isDa ? 'Gennemgå forslag' : 'Review suggestions', description: isDa ? 'Gennemgå billedtekst-forslag' : 'Review caption suggestions' }

  const holdCard = _holdCards[params.slug]
  if (holdCard) return { title: isDa ? holdCard.name_da : holdCard.name_en, description: (isDa ? holdCard.description_da : holdCard.description_en).slice(0, 160), ogImage: getHoldCardImage(params.slug) }

  const flade = _fladeCards[params.slug]
  if (flade) return { title: isDa ? flade.name_da : flade.name_en, description: (isDa ? flade.description_da : flade.description_en).slice(0, 160), ogImage: getFladeCardImage(params.slug) }

  const event = _events.find(e => e.slug === params.slug)
  if (event) return { title: isDa ? event.name_da : event.name_en, description: (isDa ? event.description_da : event.description_en).slice(0, 160) }

  const aboutSection = data.about[params.slug as keyof typeof data.about]
  if (aboutSection) return { title: isDa ? aboutSection.title_da : aboutSection.title_en, description: (isDa ? aboutSection.sections_da?.[0]?.text : aboutSection.sections_en?.[0]?.text)?.slice(0, 160) || '' }

  return { title: '404', description: '' }
}

export async function initRouter(): Promise<void> {
  _holdCards = await loadHoldCards()
  _fladeCards = await loadFladeCards()
  _events = await loadEvents()
  _bestyrelsenMembers = await loadBestyrelsen()

  function handleRoute(): void {
    const path = getRoute()
    const match = matchRoute(path)
    const main = document.getElementById('app')
    if (!main) return
    if (match) {
      loadData().then(data => {
        main.innerHTML = match.page(data, match.params)
        const meta = getRouteMeta(path, data, match.params)
        updateMeta(meta.title, meta.description, path, meta.ogImage)
        initScrollReveal()
        if (path === '/') { initGallery(); initHeroParallax() }
        if (path === '/galleri') initGalleryFolders()
        if (path === '/infoscreen') { initInfoscreen(); document.body.classList.add('is-infoscreen') } else { document.body.classList.remove('is-infoscreen'); restoreLang() }
        if (path === '/caption/edit') initCaptionEdit()
        if (path === '/caption/review') initCaptionReview()
        const pageGallery = document.getElementById('page-gallery')
        if (pageGallery) loadPageGallery((pageGallery.dataset.folders || '').split(',').filter(Boolean)).then(() => rebindLightbox())
        window.scrollTo(0, 0)
        document.dispatchEvent(new Event('page-ready'))
      }).catch(() => { main.innerHTML = renderNotFound() })
    } else {
      main.innerHTML = renderNotFound()
    }
  }
  window.addEventListener('popstate', handleRoute)
  window.addEventListener('route-change', handleRoute)
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest('[data-link]') as HTMLAnchorElement
    if (!link) return
    const href = link.getAttribute('href') || ''
    if (href.startsWith('#')) {
      e.preventDefault()
      const target = document.getElementById(href.slice(1))
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        history.replaceState(null, '', href)
      }
      return
    }
    if (link.href.startsWith(window.location.origin)) {
      e.preventDefault()
      navigate(link.href.replace(window.location.origin, ''))
    }
  })
  handleRoute()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initScrollReveal(): void {
  const elements = document.querySelectorAll<HTMLElement>('.reveal')
  if (!elements.length) return
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) } })
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
  elements.forEach((el) => observer.observe(el))
}

function initHeroParallax(): void {
  const heroBg = document.getElementById('heroBg')
  if (!heroBg) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  let ticking = false
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollY = window.scrollY
        const heroHeight = heroBg.parentElement?.offsetHeight ?? window.innerHeight
        if (scrollY < heroHeight) heroBg.style.transform = `translateY(${scrollY * 0.35}px)`
        ticking = false
      }); ticking = true
    }
  }, { passive: true })
}

async function initGallery(): Promise<void> {
  const gallery = document.getElementById('gallery')
  if (!gallery) return
  try {
    const res = await fetch('/api/gallery/random?count=6')
    if (!res.ok) return
    const images = await res.json()
    if (!images.length) return
    const items = Array.from(gallery.querySelectorAll<HTMLElement>('.gallery__item'))
    items.forEach((item, i) => {
      const d = images[i]; if (!d) return
      item.innerHTML = ''
      const img = document.createElement('img'); img.src = d.url; img.alt = d.caption_da || d.folder; img.loading = 'lazy'
      item.dataset.captionDa = d.caption_da; item.dataset.captionEn = d.caption_en
      const cap = document.createElement('div'); cap.className = 'gallery__caption'
      cap.innerHTML = `<span class="da">${d.caption_da}</span><span class="en">${d.caption_en}</span>`
      item.appendChild(img); item.appendChild(cap)
    })
  } catch { /* ignore */ }
}

async function loadPageGallery(folders: string[], showAll = false): Promise<void> {
  if (!folders.length) return
  const container = document.getElementById('page-gallery')
  if (!container) return
  try {
    const allImages: { url: string; caption_da: string; caption_en: string; folder: string; filename?: string }[] = []
    const seenFilenames = new Set<string>()
    
    for (const folder of folders) {
      const res = await fetch(`/api/gallery/${folder}`)
      if (!res.ok) continue
      const data = await res.json()
      const images = data.images || []
      
      for (const img of images) {
        // Extract filename from URL for deduplication
        const filename = img.url.split('/').pop() || ''
        if (!seenFilenames.has(filename)) {
          seenFilenames.add(filename)
          allImages.push({...img, filename})
        }
        // If duplicate filename, skip it (already added)
      }
    }
    
    if (!allImages.length) { container.innerHTML = '<p class="gallery__empty">No images yet</p>'; return }
    const visible = showAll ? allImages : allImages.slice(0, 4)
    const remainder = allImages.length - 4
    container.dataset.allImages = JSON.stringify(allImages)
    container.innerHTML = `<div class="page-gallery-grid${showAll ? ' page-gallery-grid--full' : ''}">${visible.map((img: { url: string; caption_da: string; caption_en: string }, i: number) => {
      const overlay = (!showAll && i === 3 && remainder > 0) ? `<div class="page-gallery-item__count">+${remainder}</div>` : ''
      return `<div class="page-gallery-item" data-caption-da="${img.caption_da || ''}" data-caption-en="${img.caption_en || ''}"><img src="${img.url}" alt="${img.caption_da || ''}" loading="lazy" />${overlay}<div class="page-gallery-item__caption"><span class="da">${img.caption_da}</span><span class="en">${img.caption_en}</span></div></div>`
    }).join('')}</div>`
  } catch { /* ignore */ }
}

const FOLDER_NAMES: Record<string, { da: string; en: string }> = {
  'mini-sejler': { da: 'Mini-Sejler', en: 'Mini Sailor' },
  'begynder': { da: 'Begynder', en: 'Beginner' },
  'fortsaetter': { da: 'Fortsætter', en: 'Continuer' },
  'ovede': { da: 'Øvede', en: 'Advanced' },
  'undervisning': { da: 'Undervisning', en: 'Training' },
  'adventure': { da: 'Adventure', en: 'Adventure' },
  'rsfeva': { da: 'RS Feva', en: 'RS Feva' },
  'rstera': { da: 'RS Tera', en: 'RS Tera' },
  'rszest': { da: 'RS Zest', en: 'RS Zest' },
  'optimist': { da: 'Optimist', en: 'Optimist' },
  'j70': { da: 'J70', en: 'J70' },
  'socialt': { da: 'Socialt', en: 'Social' },
  'prepping': { da: 'Klargøring', en: 'Prepping' },
  'udflugt': { da: 'Udflugter', en: 'Excursions' },
  'provetimer': { da: 'Prøvetimer', en: 'Trials / Open house' },
  'parentsailing': { da: 'Forældresejlads', en: 'Parent sailing' },
  'klubtur': { da: 'Klubtur', en: 'Club trip' },
  'mini-regatta': { da: 'Mini-Regatta', en: 'Mini Regatta' },
}

function getFolderName(folder: string): { da: string; en: string } {
  return FOLDER_NAMES[folder] || { da: folder, en: folder }
}

async function initGalleryFolders(): Promise<void> {
  const container = document.getElementById('gallery-folders')
  if (!container) return
  try {
    const res = await fetch('/api/gallery')
    if (!res.ok) return
    const folders: { folder: string; count: number; cover_url: string }[] = await res.json()
    if (!folders.length) { container.innerHTML = '<p class="gallery__empty"><span class="da">Ingen billeder endnu</span><span class="en">No photos yet</span></p>'; return }
    container.innerHTML = `<div class="gallery-folder-grid">${folders.map(f => {
      const name = getFolderName(f.folder)
      return `<button class="gallery-folder-card gallery-folder-card--with-bg reveal" data-folder="${f.folder}" style="--card-bg: url('${f.cover_url}')">
        <div class="gallery-folder-card__name"><span class="da">${name.da}</span><span class="en">${name.en}</span></div>
        <div class="gallery-folder-card__count">${f.count} <span class="da">billeder</span><span class="en">photos</span></div>
      </button>`
    }).join('')}</div>`
    initScrollReveal()
    container.querySelectorAll<HTMLElement>('.gallery-folder-card').forEach(btn => {
      btn.addEventListener('click', () => openGalleryFolder(btn.dataset.folder || ''))
    })
  } catch { /* ignore */ }
}

async function openGalleryFolder(folder: string): Promise<void> {
  const foldersEl = document.getElementById('gallery-folders')
  const viewEl = document.getElementById('gallery-folder-view')
  const titleEl = document.getElementById('gallery-folder-title')
  const backBtn = document.getElementById('gallery-back-btn')
  const galleryEl = document.getElementById('page-gallery')
  if (!foldersEl || !viewEl || !titleEl || !backBtn || !galleryEl) return
  const name = getFolderName(folder)
  titleEl.innerHTML = `<span class="da">${name.da}</span><span class="en">${name.en}</span>`
  foldersEl.style.display = 'none'
  viewEl.style.display = 'block'
  backBtn.onclick = () => {
    viewEl.style.display = 'none'
    foldersEl.style.display = ''
    galleryEl.innerHTML = ''
  }
  
  // Special handling for Adventure gallery: include h-baad images too
  const foldersToLoad = folder === 'adventure' ? ['adventure', 'h-baad'] : [folder]
  await loadPageGallery(foldersToLoad, true).then(() => rebindLightbox())
}

// ── Caption Edit init ────────────────────────────────────────────────────────

async function initCaptionEdit(): Promise<void> {
  const container = document.getElementById('captionEdit')
  if (!container) return

  const params = new URLSearchParams(window.location.search)
  const folder = params.get('folder') || ''
  const image = params.get('image') || ''

  if (!folder || !image) {
    container.innerHTML = `<p class="section-body"><span class="da">Manglende parametre — brug linket fra infoskærmen.</span><span class="en">Missing parameters — use the link from the infoscreen.</span></p>`
    return
  }

  try {
    const res = await fetch(`/api/gallery/${folder}`)
    if (!res.ok) throw new Error('not found')
    const data = await res.json()
    const imgData = data.images?.find((i: { filename: string }) => i.filename === image)
    if (!imgData) throw new Error('image not found')

    container.innerHTML = `
      <div class="caption-edit__preview">
        <img src="${imgData.url}" alt="${imgData.caption_da || image}" class="caption-edit__image" />
      </div>
      <div class="caption-edit__form">
        <div class="caption-edit__field">
          <label for="captionDa">Dansk billedtekst</label>
          <textarea id="captionDa" rows="3">${imgData.caption_da || ''}</textarea>
        </div>
        <div class="caption-edit__field">
          <label for="captionEn">English caption</label>
          <textarea id="captionEn" rows="3">${imgData.caption_en || ''}</textarea>
        </div>
        <button class="btn btn--kos" id="captionSubmit"><span class="da">Indsend forslag</span><span class="en">Submit suggestion</span></button>
        <div class="caption-edit__status" id="captionStatus"></div>
      </div>
    `

    const submitBtn = document.getElementById('captionSubmit')
    submitBtn?.addEventListener('click', async () => {
      const captionDa = (document.getElementById('captionDa') as HTMLTextAreaElement).value
      const captionEn = (document.getElementById('captionEn') as HTMLTextAreaElement).value
      const statusEl = document.getElementById('captionStatus')
      try {
        const res = await fetch('/api/caption-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder, filename: image, caption_da: captionDa, caption_en: captionEn })
        })
        if (!res.ok) throw new Error()
        if (statusEl) statusEl.innerHTML = `<span class="da">Forslag indsendt — tak!</span><span class="en">Suggestion submitted — thanks!</span>`
        if (submitBtn) submitBtn.setAttribute('disabled', 'true')
      } catch {
        if (statusEl) statusEl.innerHTML = `<span class="da">Fejl ved indsendelse — prøv igen.</span><span class="en">Error submitting — try again.</span>`
      }
    })
  } catch {
    container.innerHTML = `<p class="section-body"><span class="da">Billedet blev ikke fundet.</span><span class="en">Image not found.</span></p>`
  }
}

// ── Caption Review init ──────────────────────────────────────────────────────

async function initCaptionReview(): Promise<void> {
  const container = document.getElementById('captionReview')
  if (!container) return

  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') || ''
  const isAdmin = !!token

  try {
    const res = await fetch('/api/caption-suggestions')
    if (!res.ok) throw new Error('fetch failed')
    const suggestions = await res.json()

    if (suggestions.length === 0) {
      container.innerHTML = `<p class="section-body"><span class="da">Ingen afventende forslag.</span><span class="en">No pending suggestions.</span></p>`
      return
    }

    const authHeader = `Bearer ${token}`

    const cards = suggestions.map((s: { id: string; folder: string; filename: string; caption_da: string; caption_en: string; submitted_at: string }) => `
      <div class="caption-review__card" data-id="${s.id}">
        <div class="caption-review__preview">
          <img src="/images/static/${s.folder}/${s.filename}" alt="${s.caption_da || s.filename}" class="caption-review__image" loading="lazy" />
        </div>
        <div class="caption-review__info">
          <div class="caption-review__meta">${s.folder} / ${s.filename}</div>
          <div class="caption-review__caption"><strong>DA:</strong> ${s.caption_da || '<em>tom</em>'}</div>
          <div class="caption-review__caption"><strong>EN:</strong> ${s.caption_en || '<em>empty</em>'}</div>
          <div class="caption-review__time">${s.submitted_at}</div>
          ${isAdmin ? `
            <div class="caption-review__actions">
              <button class="btn btn--kos caption-review__approve" data-id="${s.id}"><span class="da">Godkend</span><span class="en">Approve</span></button>
              <button class="btn btn--kos-outline caption-review__reject" data-id="${s.id}"><span class="da">Afvis</span><span class="en">Reject</span></button>
            </div>
          ` : `<p class="caption-review__readonly"><span class="da">Log ind med token for at godkende/afvise.</span><span class="en">Log in with a token to approve/reject.</span></p>`}
        </div>
      </div>
    `).join('')

    container.innerHTML = cards

    if (isAdmin) {
      container.querySelectorAll('.caption-review__approve').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = (btn as HTMLElement).dataset.id
          try {
            const res = await fetch(`/api/caption-suggestions/${id}/approve`, {
              method: 'PUT',
              headers: { 'Authorization': authHeader }
            })
            if (!res.ok) throw new Error()
            const card = container.querySelector(`.caption-review__card[data-id="${id}"]`)
            if (card) card.remove()
          } catch { /* ignore */ }
        })
      })
      container.querySelectorAll('.caption-review__reject').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = (btn as HTMLElement).dataset.id
          try {
            const res = await fetch(`/api/caption-suggestions/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': authHeader }
            })
            if (!res.ok) throw new Error()
            const card = container.querySelector(`.caption-review__card[data-id="${id}"]`)
            if (card) card.remove()
          } catch { /* ignore */ }
        })
      })
    }
  } catch {
    container.innerHTML = `<p class="section-body"><span class="da">Kunne ikke hente forslag.</span><span class="en">Could not load suggestions.</span></p>`
  }
}
