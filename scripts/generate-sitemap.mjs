import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const BASE_URL = 'https://kossejlsport.krogh.cc'

const siteData = JSON.parse(readFileSync(resolve(ROOT, 'data/site.json'), 'utf-8'))
const holdData = JSON.parse(readFileSync(resolve(ROOT, 'data/hold-cards.json'), 'utf-8'))

const today = new Date().toISOString().split('T')[0]

const staticRoutes = [
  '/',
  '/hold',
  '/flade',
  '/galleri',
  '/kalender',
  '/tilmelding',
  '/om',
]

const holdSlugs = Object.keys(holdData['hold-cards'])
const fladeSlugs = siteData.flade.map(f => f.slug)
const eventSlugs = siteData.events.map(e => e.slug)
const omSlugs = ['vedtaegter', 'bestyrelsen', 'sikkerhed', 'udmeldelse']

const dynamicRoutes = [
  ...holdSlugs.map(s => `/hold/${s}`),
  ...fladeSlugs.map(s => `/flade/${s}`),
  ...eventSlugs.map(s => `/events/${s}`),
  ...omSlugs.map(s => `/om/${s}`),
]

const allRoutes = [...staticRoutes, ...dynamicRoutes]

const urls = allRoutes.map(route => {
  const priority = route === '/' ? '1.0'
    : staticRoutes.includes(route) ? '0.8'
    : '0.6'
  return `  <url>
    <loc>${BASE_URL}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${priority}</priority>
  </url>`
}).join('\n')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

const outPath = resolve(ROOT, 'public/sitemap.xml')
writeFileSync(outPath, sitemap, 'utf-8')
console.log(`Generated sitemap.xml with ${allRoutes.length} URLs`)
