import { loadData, getLang, navigate, getRoute, type SiteData } from './data'

type PageFn = (data: SiteData, params: Record<string, string>) => string

const routes: { pattern: RegExp; paramNames: string[]; page: PageFn }[] = []

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
addRoute('/events/:slug', renderEventPage)
addRoute('/galleri', renderGalleryPage)

// ── Page: Frontpage ───────────────────────────────────────────────────────────

function getHoldCardImage(folder: string): string {
  const imageMap: Record<string, string> = {
    'mini-sejler': '493080020_990637449720396_8459519070608298571_n.jpg',
    'begynder': '493080020_990637449720396_8459519070608298571_n.jpg',
    'provetimer': '494368337_994873475963460_6392584822740470859_n.jpg',
    'undervisning': '493010834_987538240030317_4017353076541010794_n.jpg',
    'adventure': '547669701_1093272722790201_6911747364417688967_n.jpg',
    'j70': '547784091_1093273136123493_1554396093967990186_n.jpg',
  }
  const img = imageMap[folder] || '547201391_1093273222790151_6353806278774509213_n.jpg'
  return `/images/${folder}/${img}`
}

function renderFrontpage(data: SiteData): string {
  const lang = getLang()
  const isDa = lang === 'da'
  const upcomingEvents = data.events.slice(0, 3)
  const holdCards = data.hold.map((h) => `<a href="/hold/${h.slug}" class="hold-card hold-card--with-bg reveal" data-link style="--card-bg: url('${getHoldCardImage(h.image_folder)}')"><div class="hold-card__name">${isDa ? h.name_da : h.name_en}</div><div class="hold-card__age">${isDa ? h.age_da : h.age_en}</div><div class="hold-card__time">${isDa ? h.time_da : h.time_en}</div></a>`).join('')

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
          <a href="/events/sommercamps" class="btn btn--kos" data-link><span class="da">SommerCamp 2026</span><span class="en">SummerCamp 2026</span></a>
        </div>
      </div>
    </section>

    <section class="section section--mid" id="intro">
      <div class="container">
        <div class="intro-grid">
          <div class="intro-text">
            <span class="section-label reveal"><span class="da">Velkommen til KØS</span><span class="en">Welcome to KØS</span></span>
            <h2 class="section-title reveal">
              <span class="da">Sommer, sol og vind på vandet</span>
              <span class="en">Summer, sun and wind on the water</span>
            </h2>
            <p class="section-body reveal">
              <span class="da">KØS Sejlsport er en ung og dynamisk sejlerklub i hjertet af København. Vi tilbyder sejlundervisning for børn, unge og voksne — uanset om du aldrig har prøvet det før eller allerede er en erfaren sejler.</span>
              <span class="en">KØS Sejlsport is a young and dynamic sailing club in the heart of Copenhagen. We offer sailing lessons for children, youth and adults — whether you've never tried it before or are already an experienced sailor.</span>
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
              <div class="intro-image intro-image--1" style="background-image: url('/images/j70/547201391_1093273222790151_6353806278774509213_n.jpg')"></div>
              <div class="intro-image intro-image--2" style="background-image: url('/images/rsfeva/547367784_1091568366293970_682452581349231292_n.jpg')"></div>
              <div class="intro-image intro-image--3" style="background-image: url('/images/socialt/492694740_986693480114793_4118764152267689699_n.jpg')"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--dark" id="sommercamp-cta">
      <div class="container">
        <div class="sommercamp-banner">
          <div class="sommercamp-banner__content">
            <span class="sommercamp-banner__label">
              <span class="da">🏖️ SommerCamp 2026</span>
              <span class="en">🏖️ SummerCamp 2026</span>
            </span>
            <h2 class="sommercamp-banner__title">
              <span class="da">6 ugers eventyr på vandet</span>
              <span class="en">6 weeks of adventure on the water</span>
            </h2>
            <p class="sommercamp-banner__text">
              <span class="da">Giv dit barn en sommer fuld af oplevelser, venskaber og sejlglæde. SommerCamp henvender sig til børn og unge fra 11 år — alle niveauer er velkomne!</span>
              <span class="en">Give your child a summer full of experiences, friendships and sailing joy. SommerCamp is for children and youth aged 11+ — all levels welcome!</span>
            </p>
            <a href="/events/sommercamps" class="btn btn--kos reveal" data-link><span class="da">Læs mere om SommerCamp</span><span class="en">Read more about SommerCamp</span></a>
          </div>
          <div class="sommercamp-banner__visual">
            <div class="countdown" id="countdown" aria-live="polite">
              <div class="countdown__unit"><span class="countdown__value" id="cd-days">--</span><span class="countdown__label"><span class="da">Dage</span><span class="en">Days</span></span></div>
              <span class="countdown__sep" aria-hidden="true">:</span>
              <div class="countdown__unit"><span class="countdown__value" id="cd-hours">--</span><span class="countdown__label"><span class="da">Timer</span><span class="en">Hours</span></span></div>
              <span class="countdown__sep" aria-hidden="true">:</span>
              <div class="countdown__unit"><span class="countdown__value" id="cd-minutes">--</span><span class="countdown__label"><span class="da">Min</span><span class="en">Min</span></span></div>
              <span class="countdown__sep" aria-hidden="true">:</span>
              <div class="countdown__unit"><span class="countdown__value" id="cd-seconds">--</span><span class="countdown__label"><span class="da">Sek</span><span class="en">Sec</span></span></div>
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
          ${data.flade.map((f) => `<a href="/flade/${f.slug}" class="flade-card reveal" data-link><div class="flade-card__name">${isDa ? f.name_da : f.name_en}</div><div class="flade-card__specs">${isDa ? f.specs_da : f.specs_en}</div><div class="flade-card__desc">${(isDa ? f.description_da : f.description_en).slice(0, 120)}…</div></a>`).join('')}
        </div>
      </div>
    </section>

    <section class="section section--deep" id="events-overview">
      <div class="container">
        <span class="section-label section-label--light reveal"><span class="da">Events</span><span class="en">Events</span></span>
        <h2 class="section-title section-title--light reveal"><span class="da">Kommende events</span><span class="en">Upcoming events</span></h2>
        <div class="events-grid">
          ${upcomingEvents.map(e => `<a href="/events/${e.slug}" class="event-card reveal" data-link><div class="event-card__date">${isDa ? e.date_da : e.date_en}</div><div class="event-card__name">${isDa ? e.name_da : e.name_en}</div><div class="event-card__tagline">${isDa ? e.tagline_da : e.tagline_en}</div></a>`).join('')}
        </div>
      </div>
    </section>

    <section class="section section--mid" id="gallery-teaser">
      <div class="container">
        <span class="section-label reveal"><span class="da">Galleri</span><span class="en">Gallery</span></span>
        <h2 class="section-title reveal"><span class="da">Billeder fra klubben</span><span class="en">Photos from the club</span></h2>
        <div class="gallery" id="gallery">
          <div class="gallery__item reveal" data-index="0"><div class="gallery__placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span class="da">Billeder indlæses...</span><span class="en">Loading photos...</span></div></div>
          <div class="gallery__item gallery__item--wide reveal" data-index="1"><div class="gallery__placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span class="da">Billeder indlæses...</span><span class="en">Loading photos...</span></div></div>
          <div class="gallery__item reveal" data-index="2"><div class="gallery__placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span class="da">Billeder indlæses...</span><span class="en">Loading photos...</span></div></div>
          <div class="gallery__item reveal" data-index="3"><div class="gallery__placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span class="da">Billeder indlæses...</span><span class="en">Loading photos...</span></div></div>
          <div class="gallery__item gallery__item--tall reveal" data-index="4"><div class="gallery__placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span class="da">Billeder indlæses...</span><span class="en">Loading photos...</span></div></div>
          <div class="gallery__item reveal" data-index="5"><div class="gallery__placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span class="da">Billeder indlæses...</span><span class="en">Loading photos...</span></div></div>
        </div>
        <div style="text-align:center;margin-top:2rem"><a href="/galleri" class="btn btn--kos-outline reveal" data-link><span class="da">Se hele galleriet</span><span class="en">See full gallery</span></a></div>
      </div>
    </section>

    <section class="section section--deep" id="contact">
      <div class="container">
        <div class="contact-wrap">
          <span class="section-label section-label--light reveal"><span class="da">Kontakt</span><span class="en">Contact</span></span>
          <h2 class="section-title section-title--light reveal"><span class="da">Kom forbi havnen</span><span class="en">Visit the harbour</span></h2>
          <p class="section-body section-body--light reveal">
            <span class="da">Vi holder til på Svaneknoppen 5 i Svanemøllen Havn. Kig forbi — vi er altid glade for at vise rundt og fortælle om mulighederne for at komme i gang med sejlads.</span>
            <span class="en">We're located at Svaneknoppen 5 in Svanemøllen Harbour. Drop by — we're always happy to show you around and tell you about the possibilities to start sailing.</span>
          </p>
          <div class="contact-links reveal">
            <a href="mailto:${data.site.email}" class="contact-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg><span>${data.site.email}</span></a>
            <a href="${data.site.facebook}" target="_blank" rel="noopener noreferrer" class="contact-link"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg><span><span class="da">Følg KØS på Facebook</span><span class="en">Follow KØS on Facebook</span></span></a>
          </div>
        </div>
      </div>
    </section>
  `
}

// ── Page: Hold Overview ───────────────────────────────────────────────────────

function renderHoldOverview(data: SiteData): string {
  const isDa = getLang() === 'da'
  const holdCards = data.hold.map((h) => `<a href="/hold/${h.slug}" class="hold-card hold-card--with-bg reveal" data-link style="--card-bg: url('${getHoldCardImage(h.image_folder)}')"><div class="hold-card__name">${isDa ? h.name_da : h.name_en}</div><div class="hold-card__age">${isDa ? h.age_da : h.age_en}</div><div class="hold-card__time">${isDa ? h.time_da : h.time_en}</div><div class="hold-card__boat">${isDa ? h.boat_da : h.boat_en}</div></a>`).join('')
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><span><span class="da">Hold</span><span class="en">Teams</span></span></nav>
      <h1 class="page-hero__title"><span class="da">Hold</span><span class="en">Teams</span></h1>
      <p class="page-hero__sub"><span class="da">Find det hold der passer til dig — uanset alder og niveau</span><span class="en">Find the team that suits you — regardless of age and level</span></p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="hold-grid">${holdCards}</div>
    </div></section>
  `
}

// ── Page: Flåde Overview ──────────────────────────────────────────────────────

function renderFladeOverview(data: SiteData): string {
  const isDa = getLang() === 'da'
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><span><span class="da">Flåde</span><span class="en">Fleet</span></span></nav>
      <h1 class="page-hero__title"><span class="da">Flåde</span><span class="en">Fleet</span></h1>
      <p class="page-hero__sub"><span class="da">Udforsk vores både — fra små joller til store kølbåde</span><span class="en">Explore our boats — from small dinghies to large keelboats</span></p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="flade-grid">${data.flade.map((f) => `<a href="/flade/${f.slug}" class="flade-card reveal" data-link><div class="flade-card__name">${isDa ? f.name_da : f.name_en}</div><div class="flade-card__specs">${isDa ? f.specs_da : f.specs_en}</div><div class="flade-card__desc">${(isDa ? f.description_da : f.description_en).slice(0, 150)}…</div></a>`).join('')}</div>
    </div></section>
  `
}

// ── Page: Hold Detail ─────────────────────────────────────────────────────────

function renderHoldPage(data: SiteData, params: Record<string, string>): string {
  const hold = data.hold.find(h => h.slug === params.slug)
  if (!hold) return renderNotFound()
  const isDa = getLang() === 'da'
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><a href="/hold" data-link><span class="da">Hold</span><span class="en">Teams</span></a><span class="breadcrumb__sep">›</span><span>${isDa ? hold.name_da : hold.name_en}</span></nav>
      <h1 class="page-hero__title">${isDa ? hold.name_da : hold.name_en}</h1>
      <p class="page-hero__sub">${isDa ? hold.age_da : hold.age_en} · ${isDa ? hold.time_da : hold.time_en}</p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="page-content">
        <div class="page-content__text">
          <p class="section-body">${isDa ? hold.description_da : hold.description_en}</p>
          <div class="info-grid">
            <div class="info-item"><span class="info-item__label"><span class="da">Alder</span><span class="en">Age</span></span><span class="info-item__value">${isDa ? hold.age_da : hold.age_en}</span></div>
            <div class="info-item"><span class="info-item__label"><span class="da">Tidspunkt</span><span class="en">Time</span></span><span class="info-item__value">${isDa ? hold.time_da : hold.time_en}</span></div>
            <div class="info-item"><span class="info-item__label"><span class="da">Sæson</span><span class="en">Season</span></span><span class="info-item__value">${isDa ? hold.season_da : hold.season_en}</span></div>
            <div class="info-item"><span class="info-item__label"><span class="da">Båd</span><span class="en">Boat</span></span><span class="info-item__value">${isDa ? hold.boat_da : hold.boat_en}</span></div>
          </div>
        </div>
        <div class="page-content__gallery" id="page-gallery" data-folder="${hold.image_folder}"></div>
      </div>
    </div></section>
  `
}

// ── Page: Flåde Detail ────────────────────────────────────────────────────────

function renderFladePage(data: SiteData, params: Record<string, string>): string {
  const flade = data.flade.find(f => f.slug === params.slug)
  if (!flade) return renderNotFound()
  const isDa = getLang() === 'da'
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><a href="/flade" data-link><span class="da">Flåde</span><span class="en">Fleet</span></a><span class="breadcrumb__sep">›</span><span>${isDa ? flade.name_da : flade.name_en}</span></nav>
      <h1 class="page-hero__title">${isDa ? flade.name_da : flade.name_en}</h1>
      <p class="page-hero__sub">${isDa ? flade.specs_da : flade.specs_en}</p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="page-content">
        <div class="page-content__text"><p class="section-body">${isDa ? flade.description_da : flade.description_en}</p></div>
        <div class="page-content__gallery" id="page-gallery" data-folder="${flade.image_folder}"></div>
      </div>
    </div></section>
  `
}

// ── Page: Event Detail ────────────────────────────────────────────────────────

function renderEventPage(data: SiteData, params: Record<string, string>): string {
  const event = data.events.find(e => e.slug === params.slug)
  if (!event) return renderNotFound()
  const isDa = getLang() === 'da'
  let weeksHtml = ''
  if (event.weeks && event.weeks.length) {
    weeksHtml = `<div class="weeks-grid">${event.weeks.map(w => `<div class="week-card reveal"><div class="week-card__uge"><span class="da">Uge</span><span class="en">Week</span> ${w.week}</div><div class="week-card__dates">${isDa ? w.dates_da : w.dates_en}</div><div class="week-card__body">${isDa ? w.desc_da : w.desc_en}</div></div>`).join('')}</div>`
  }
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><a href="/#events-overview" data-link><span class="da">Events</span><span class="en">Events</span></a><span class="breadcrumb__sep">›</span><span>${isDa ? event.name_da : event.name_en}</span></nav>
      <h1 class="page-hero__title">${isDa ? event.name_da : event.name_en}</h1>
      <p class="page-hero__sub">${isDa ? event.date_da : event.date_en}</p>
      <p class="page-hero__tagline">${isDa ? event.tagline_da : event.tagline_en}</p>
    </div></section>
    <section class="section section--mid"><div class="container">
      <div class="page-content">
        <div class="page-content__text">
          <p class="section-body">${isDa ? event.description_da : event.description_en}</p>
          ${weeksHtml}
          ${event.signup_url ? `<div style="margin-top:2rem"><a href="${event.signup_url}" target="_blank" rel="noopener noreferrer" class="btn btn--kos"><span class="da">Tilmeld dig</span><span class="en">Sign up</span></a></div>` : ''}
        </div>
        <div class="page-content__gallery" id="page-gallery" data-folder="${event.image_folder}"></div>
      </div>
    </div></section>
  `
}

// ── Page: Gallery ─────────────────────────────────────────────────────────────

function renderGalleryPage(): string {
  return `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/" data-link><span class="da">Forside</span><span class="en">Home</span></a><span class="breadcrumb__sep">›</span><span><span class="da">Galleri</span><span class="en">Gallery</span></span></nav>
      <h1 class="page-hero__title"><span class="da">Galleri</span><span class="en">Gallery</span></h1>
    </div></section>
    <section class="section section--mid"><div class="container">
      <p class="section-body reveal"><span class="da">Udforsk billeder fra alle vores aktiviteter — vælg en kategori i galleriet.</span><span class="en">Explore photos from all our activities — choose a category in the gallery.</span></p>
      <div style="text-align:center;margin-top:2rem"><a href="/images/" class="btn btn--kos" target="_blank"><span class="da">Åbn galleri</span><span class="en">Open gallery</span></a></div>
    </div></section>
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

export function initRouter(): void {
  function handleRoute(): void {
    const path = getRoute()
    const match = matchRoute(path)
    const main = document.getElementById('app')
    if (!main) return
    if (match) {
      loadData().then(data => {
        main.innerHTML = match.page(data, match.params)
        initScrollReveal()
        if (path === '/') { initGallery(); initCountdown(); initHeroParallax() }
        const pageGallery = document.getElementById('page-gallery')
        if (pageGallery) loadPageGallery(pageGallery.dataset.folder || '')
        window.scrollTo(0, 0)
      }).catch(() => { main.innerHTML = renderNotFound() })
    } else {
      main.innerHTML = renderNotFound()
    }
  }
  window.addEventListener('popstate', handleRoute)
  window.addEventListener('route-change', handleRoute)
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest('[data-link]') as HTMLAnchorElement
    if (link && link.href.startsWith(window.location.origin)) {
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

function initCountdown(): void {
  const DEPARTURE_DATE = new Date('2026-06-29T09:00:00')
  const elDays = document.getElementById('cd-days')
  const elHours = document.getElementById('cd-hours')
  const elMinutes = document.getElementById('cd-minutes')
  const elSeconds = document.getElementById('cd-seconds')
  if (!elDays || !elHours || !elMinutes || !elSeconds) return
  const pad = (n: number) => String(n).padStart(2, '0')
  const tick = () => {
    const diff = DEPARTURE_DATE.getTime() - Date.now()
    if (diff <= 0) { elDays.textContent = '00'; elHours.textContent = '00'; elMinutes.textContent = '00'; elSeconds.textContent = '00'; return }
    const s = Math.floor(diff / 1000)
    elDays.textContent = String(Math.floor(s / 86400))
    elHours.textContent = pad(Math.floor((s % 86400) / 3600))
    elMinutes.textContent = pad(Math.floor((s % 3600) / 60))
    elSeconds.textContent = pad(s % 60)
  }
  tick(); setInterval(tick, 1000)
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

async function loadPageGallery(folder: string): Promise<void> {
  if (!folder) return
  const container = document.getElementById('page-gallery')
  if (!container) return
  try {
    const res = await fetch(`/api/gallery/${folder}`)
    if (!res.ok) return
    const data = await res.json()
    const images = data.images || []
    if (!images.length) { container.innerHTML = '<p class="gallery__empty">No images yet</p>'; return }
    container.innerHTML = `<div class="page-gallery-grid">${images.map((img: { url: string; caption_da: string; caption_en: string }) => `<div class="page-gallery-item"><img src="${img.url}" alt="${img.caption_da || ''}" loading="lazy" /><div class="page-gallery-item__caption"><span class="da">${img.caption_da}</span><span class="en">${img.caption_en}</span></div></div>`).join('')}</div>`
  } catch { /* ignore */ }
}
