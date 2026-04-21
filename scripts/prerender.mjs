import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import { stat, readFile } from 'fs/promises'
import { extname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = resolve(ROOT, 'dist')

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
const fladeData = JSON.parse(readFileSync(resolve(ROOT, 'data/flaade-cards.json'), 'utf-8'))
const eventsData = JSON.parse(readFileSync(resolve(ROOT, 'data/events.json'), 'utf-8'))

// Get about pages from data to be dynamic
const aboutPages = Object.keys(siteData.about)

const routes = [
  '/',
  '/hold',
  ...Object.keys(holdData['hold-cards']).map(s => `/hold/${s}`),
  '/flade',
  ...Object.keys(fladeData['flade-cards']).map(s => `/flade/${s}`),
  '/events',
  ...eventsData.events.map(e => `/events/${e.slug}`),
  '/galleri',
  '/kalender',
  '/tilmelding',
  '/om',
  ...aboutPages.map(slug => `/om/${slug}`),
  '/infoscreen',
  '/caption/edit',
  '/caption/review',
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

async function cleanHtml(html) {
  // Remove dev-mode Vite script tags
  const cleanHead = html
    .replace(/<script[^>]*src="\/src\/[^"]*"[^>]*><\/script>/g, '')
    .replace(/<link[^>]*href="\/src\/[^"]*"[^>]*>/g, '')
  return html.replace(/<head>([\s\S]*?)<\/head>/, `<head>${cleanHead}</head>`)
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
  const browser = await playwright.chromium.launch({ 
    headless: true, 
    executablePath: chromiumPath 
  })

  console.log(`Prerendering ${routes.length} routes with optimized timing...`)
  
  // Use a shared browser context but create new pages
  const context = await browser.newContext()
  
  for (const route of routes) {
    console.log(`  Prerendering ${route}...`)
    const page = await context.newPage()
    
    try {
      // Faster navigation - don't wait for network idle, just DOM ready
      await page.goto(`http://localhost:${port}${route}`, { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      })
      
      // Wait for app to have content - reduced from 3s to checking if content loaded
      try {
        await page.waitForFunction(() => {
          const app = document.querySelector('main#app')
          return app && app.children.length > 0 && app.textContent.trim().length > 10
        }, { timeout: 2000 })
      } catch {
        // If content check fails, wait a short time for any dynamic content
        await page.waitForTimeout(500)
      }
      
      const html = await page.content()
      
      let outPath
      if (route === '/') {
        outPath = resolve(DIST, 'index.html')
      } else {
        const dir = resolve(DIST, route.slice(1))
        mkdirSync(dir, { recursive: true })
        outPath = resolve(dir, 'index.html')
      }
      
      const fullHtml = await cleanHtml(html)
      writeFileSync(outPath, fullHtml, 'utf-8')
      console.log(`    ✓ ${outPath}`)
    } catch (err) {
      console.log(`    ⚠️ ${route}: ${err.message}`)
      console.log(`    ⚠️ Continuing with next route...`)
    } finally {
      await page.close()
    }
  }

  await context.close()
  await browser.close()
  server.close()
  console.log('Prerendering complete!')
}

prerender().catch(err => {
  console.error('Prerender failed:', err)
  process.exit(1)
})