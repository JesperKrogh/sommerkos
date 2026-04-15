import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import { stat, readFile } from 'fs/promises'
import { extname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = resolve(ROOT, 'dist')
const BASE_URL = 'https://kossejlsport.krogh.cc'

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
}

const siteData = JSON.parse(readFileSync(resolve(ROOT, 'data/site.json'), 'utf-8'))
const holdData = JSON.parse(readFileSync(resolve(ROOT, 'data/hold-cards.json'), 'utf-8'))

const routes = [
  '/',
  '/hold',
  ...Object.keys(holdData['hold-cards']).map(s => `/hold/${s}`),
  '/flade',
  ...siteData.flade.map(f => `/flade/${f.slug}`),
  ...siteData.events.map(e => `/events/${e.slug}`),
  '/galleri',
  '/kalender',
  '/tilmelding',
  '/om',
  '/om/vedtaegter',
  '/om/bestyrelsen',
  '/om/sikkerhed',
  '/om/udmeldelse',
]

async function startServer(port) {
  const server = createServer(async (req, res) => {
    let urlPath = req.url?.split('?')[0] || '/'

    let filePath
    if (urlPath.startsWith('/data/') || urlPath.startsWith('/images-overview/')) {
      filePath = resolve(ROOT, urlPath.slice(1))
    } else if (urlPath.startsWith('/api/')) {
      res.writeHead(404)
      res.end('Not found')
      return
    } else {
      filePath = resolve(DIST, urlPath === '/' ? 'index.html' : urlPath.slice(1))
    }

    try {
      const fileStat = await stat(filePath)
      if (fileStat.isDirectory()) {
        filePath = join(filePath, 'index.html')
        await stat(filePath)
      }
    } catch {
      filePath = resolve(DIST, 'index.html')
    }

    try {
      const content = await readFile(filePath)
      const ext = extname(filePath)
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
      res.end(content)
    } catch {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  return new Promise(resolve => {
    server.listen(port, () => resolve(server))
  })
}

async function prerender() {
  const port = 9876
  const server = await startServer(port)
  console.log(`Prerender server started on port ${port}`)

  let playwright
  try {
    const pw = await import('playwright')
    playwright = pw
  } catch {
    console.log('Playwright not installed, skipping prerendering.')
    console.log('Install with: npm install --save-dev playwright && npx playwright install chromium')
    server.close()
    return
  }

  const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  const browser = await playwright.chromium.launch({ headless: true, executablePath: chromiumPath })
  const context = await browser.newContext()
  const indexHtml = readFileSync(resolve(DIST, 'index.html'), 'utf-8')

  for (const route of routes) {
    console.log(`  Prerendering ${route}...`)
    const page = await context.newPage()
    try {
      await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(3000)

      const html = await page.content()

      let outPath
      if (route === '/') {
        outPath = resolve(DIST, 'index.html')
      } else {
        const dir = resolve(DIST, route.slice(1))
        mkdirSync(dir, { recursive: true })
        outPath = resolve(dir, 'index.html')
      }

      const fullHtml = html.replace(/<head>([\s\S]*?)<\/head>/, (match, headContent) => {
        const cleanHead = headContent
          .replace(/<script[^>]*src="\/src\/[^"]*"[^>]*><\/script>/g, '')
          .replace(/<link[^>]*href="\/src\/[^"]*"[^>]*>/g, '')
        return `<head>${cleanHead}</head>`
      })

      writeFileSync(outPath, fullHtml, 'utf-8')
      console.log(`    ✓ ${outPath}`)
    } catch (err) {
      console.error(`    ✗ Failed: ${err}`)
    } finally {
      await page.close()
    }
  }

  await browser.close()
  server.close()
  console.log('Prerendering complete!')
}

prerender().catch(err => {
  console.error('Prerender failed:', err)
  process.exit(1)
})
