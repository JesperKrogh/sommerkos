export interface SiteData {
  site: {
    name: string
    tagline_da: string
    tagline_en: string
    address: string
    email: string
    website: string
    facebook: string
  }
  about: AboutData
}

export interface AboutMember {
  name: string
  role: string
  bio: string
  phone: string
  email: string
}

export interface BestyrelsenMember {
  name: string
  role_da: string
  role_en: string
  bio_da: string
  bio_en: string
  image: string
  phone: string
  email: string
}

export interface AboutSection {
  title_da: string
  title_en: string
  content_da?: string
  content_en?: string
  sections_da?: { title: string; text: string }[]
  sections_en?: { title: string; text: string }[]
}

export interface AboutData {
  vedtaegter: AboutSection
  bestyrelsen: AboutSection
  sikkerhed: AboutSection
  udmeldelse: AboutSection
  'nybegynder-til-jollesejlads': AboutSection
}

export interface FladeCard {
  slug: string
  name_da: string
  name_en: string
  description_da: string
  description_en: string
  specs_da: string
  specs_en: string
  designer_da: string
  designer_en: string
  manufacturer_url: string
  class_url: string | null
  teams_da: string[]
  teams_en: string[]
  team_slugs: string[]
  image_folder: string
  class_insignia?: string
}

export type FladeCards = Record<string, FladeCard>

export interface Event {
  slug: string
  name_da: string
  name_en: string
  short_description_da: string
  short_description_en: string
  start_date: string | null
  end_date: string | null
  time_da: string
  time_en: string
  price_da: string | null
  price_en: string | null
  optional_price_da: string | null
  optional_price_en: string | null
  tagline_da: string
  tagline_en: string
  description_da: string
  description_en: string
  signup_url: string | null
  signup_widget?: string
  image_folder: string
  image: string | null
}

export type EventCards = Event[]

export interface HoldCard {
  name_da: string
  name_en: string
  tagline_da: string
  tagline_en: string
  age_da: string
  age_en: string
  time_da: string
  time_en: string
  season_da: string
  season_en: string
  equipment_da: string
  equipment_en: string
  description_da: string
  description_en: string
  activities_da?: string[]
  activities_en?: string[]
  prerequisites_da?: string
  prerequisites_en?: string
  expectations_da?: string[]
  expectations_en?: string[]
  coaches_da: string[]
  coaches_en: string[]
  signup_url: string
  signup_widget?: string
  price_da?: string
  price_en?: string
  image_folders: string[]
  boat_slugs?: string[]
}

export type HoldCards = Record<string, HoldCard>

let _data: SiteData | null = null
let _holdCards: HoldCards | null = null
let _fladeCards: FladeCards | null = null
let _events: EventCards | null = null
let _bestyrelsen: BestyrelsenMember[] | null = null

export async function loadData(): Promise<SiteData> {
  if (_data) return _data
  const res = await fetch('/data/site.json')
  if (!res.ok) throw new Error('Failed to load site data')
  _data = await res.json()
  return _data!
}

export async function loadHoldCards(): Promise<HoldCards> {
  if (_holdCards) return _holdCards
  const res = await fetch('/data/hold-cards.json')
  if (!res.ok) throw new Error('Failed to load hold cards data')
  const data = await res.json()
  _holdCards = data['hold-cards']
  return _holdCards!
}

export async function loadFladeCards(): Promise<FladeCards> {
  if (_fladeCards) return _fladeCards
  const res = await fetch('/data/flaade-cards.json')
  if (!res.ok) throw new Error('Failed to load flåde cards data')
  const data = await res.json()
  _fladeCards = data['flade-cards']
  return _fladeCards!
}

export async function loadEvents(): Promise<EventCards> {
  if (_events) return _events
  const res = await fetch('/data/events.json')
  if (!res.ok) throw new Error('Failed to load events data')
  const data = await res.json()
  _events = data['events']
  return _events!
}

export async function loadBestyrelsen(): Promise<BestyrelsenMember[]> {
  if (_bestyrelsen) return _bestyrelsen
  const res = await fetch('/data/bestyrelsen.json')
  if (!res.ok) throw new Error('Failed to load bestyrelsen data')
  const data = await res.json()
  _bestyrelsen = data.bestyrelsen.members
  return _bestyrelsen!
}

export function isEventPast(event: Event): boolean {
  if (!event.end_date) return false
  const endDate = new Date(event.end_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return endDate < today
}

export function getUpcomingEvents(events: EventCards): EventCards {
  return events.filter(e => !isEventPast(e))
}

export function formatDateRange(event: Event, lang: 'da' | 'en'): string {
  if (!event.start_date) return ''
  const start = new Date(event.start_date)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  const locale = lang === 'da' ? 'da-DK' : 'en-GB'
  const startStr = start.toLocaleDateString(locale, opts)
  if (!event.end_date) return startStr
  const end = new Date(event.end_date)
  const endStr = end.toLocaleDateString(locale, { ...opts, year: 'numeric' })
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}. – ${endStr}`
  }
  return `${startStr} – ${endStr}`
}

export function getLang(): 'da' | 'en' {
  return (document.documentElement.dataset.lang as 'da' | 'en') || 'da'
}

export function navigate(path: string): void {
  history.pushState(null, '', path)
  window.dispatchEvent(new CustomEvent('route-change', { detail: { path } }))
}

export function getRoute(): string {
  const path = window.location.pathname
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}
