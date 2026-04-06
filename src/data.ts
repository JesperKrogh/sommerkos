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
  flade: Flade[]
  events: Event[]
}

export interface Flade {
  slug: string
  name_da: string
  name_en: string
  description_da: string
  description_en: string
  specs_da: string
  specs_en: string
  image_folder: string
}

export interface Event {
  slug: string
  name_da: string
  name_en: string
  date_da: string
  date_en: string
  tagline_da: string
  tagline_en: string
  description_da: string
  description_en: string
  weeks?: { week: number; dates_da: string; dates_en: string; desc_da: string; desc_en: string }[]
  signup_url: string | null
  image_folder: string
}

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
  activities_da: string[]
  activities_en: string[]
  prerequisites_da: string
  prerequisites_en: string
  expectations_da: string[]
  expectations_en: string[]
  coaches_da: string[]
  coaches_en: string[]
  signup_url: string
  image_folder: string
}

export type HoldCards = Record<string, HoldCard>

let _data: SiteData | null = null
let _holdCards: HoldCards | null = null

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

export function getLang(): 'da' | 'en' {
  return (document.documentElement.dataset.lang as 'da' | 'en') || 'da'
}

export function navigate(path: string): void {
  history.pushState(null, '', path)
  window.dispatchEvent(new CustomEvent('route-change', { detail: { path } }))
}

export function getRoute(): string {
  return window.location.pathname
}
