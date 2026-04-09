# KØS Sejlsport — sommer-i-kos

A modern, bilingual (Danish/English) website for **KØS Sejlsport** — a sailing club in Svanemøllen Havn, Copenhagen. The site showcases the club's teams (Hold), fleet (Flåde), events, and SommerCamp programs.

## Quick Start

### Prerequisites

- Node.js 22+
- Python 3.12+ (for the API)
- Docker & Docker Compose (optional, for containerised deployment)

### Development

```bash
# Install dependencies
npm install

# Start the Vite dev server
npm run dev

# Run type checking
npm run typecheck

# Build for production (includes sitemap generation)
npm run build

# Preview production build
npm run preview
```

### With Docker

```bash
# Build and start both frontend and API
docker compose up --build

# Open in browser
open http://localhost:8888
```

The frontend is served at `http://localhost:8888` and the API is proxied through nginx at `http://localhost:8888/api/`.

## Features

- **Bilingual** — Toggle between Danish and English with persistent preference
- **Client-side routing** — Subpages for Hold, Flåde, Events, SommerCamp without page reloads
- **Prerendered SPA** — All routes pre-rendered to static HTML at build time for SEO
- **SEO optimized** — Per-route meta tags (title, description, Open Graph, Twitter Cards, canonical URLs)
- **Sitemap** — Auto-generated from content data, served at `/sitemap.xml`
- **Schema.org** — JSON-LD structured data for search engines
- **Hero slideshow** — Full-screen rotating background images (4 images, 6s each) with centered glass-text box
- **Scroll animations** — Elements reveal on scroll with staggered timing
- **Photo gallery** — Dynamic gallery powered by the API with lightbox viewer
- **Responsive** — Mobile-first with hamburger menu and adaptive layouts
- **Accessible** — ARIA labels, keyboard navigation, `prefers-reduced-motion` support
- **Performance** — Multi-stage Docker build, aggressive caching, gzip compression

## Project Structure

```
├── index.html              # SPA shell with fixed navbar + JSON-LD
├── src/
│   ├── main.ts             # Entry point
│   ├── router.ts           # SPA router + page templates + SEO meta
│   ├── data.ts             # Data loading, navigation, route helpers
│   ├── style/              # CSS (base, pages, components, animations)
│   └── modules/            # Lightbox, nav, gallery, countdown, hero, scroll-reveal
├── data/
│   ├── site.json           # All content: site, about, flåde, events
│   └── hold-cards.json     # Hold card data (loaded separately)
├── api/
│   ├── app.py              # Flask API for gallery images
│   └── requirements.txt
├── images-web/             # Processed & optimised images (served to users)
├── images-overview/        # Hold & flåde card images (static)
├── images/                 # Raw uploaded images (READ-ONLY)
├── scripts/
│   ├── prerender.mjs       # Playwright prerendering of all routes
│   ├── generate-sitemap.mjs # Generates sitemap.xml from content data
│   └── generate_captions.py # Image processing + AI caption generation
├── public/
│   ├── favicon.svg
│   ├── robots.txt          # Search engine directives + sitemap URL
│   └── sitemap.xml         # Auto-generated (prebuild step)
├── docker-compose.yml       # Frontend + API services
├── Dockerfile              # Frontend build (Node → prerender → nginx)
├── Dockerfile.api           # API build (Python + gunicorn)
└── nginx.conf               # Reverse proxy + SPA routing configuration
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed technical overview.

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Forside (Home)** | `/` | Hero slideshow, intro, hold/flåde overviews, events, gallery teaser, contact |
| **Hold (Teams)** | `/hold` | Grid of all teams |
| **Hold Detail** | `/hold/:slug` | Team info, timing, boat, gallery |
| **Flåde (Fleet)** | `/flade` | Grid of all boats |
| **Flåde Detail** | `/flade/:slug` | Boat specs, description, gallery |
| **Events** | `/events/:slug` | Event detail with week cards |
| **Galleri** | `/galleri` | Photo gallery with folder browser |
| **Kalender** | `/kalender` | Calendar with Holdsport widget |
| **Tilmelding** | `/tilmelding` | Signup with Holdsport widget |
| **Om KØS** | `/om` | About section cards |
| **Om Sub-pages** | `/om/:slug` | Vedtægter, bestyrelse, sikkerhed, udmeldelse |

## Content Management

All content is stored in two JSON files:

**`data/site.json`** — Site info, about sections, flåde, events:
```json
{
  "site": { "email": "...", "facebook": "..." },
  "about": { "vedtaegter": {...}, "bestyrelsen": {...}, ... },
  "flade": [{ "slug": "...", "name_da": "...", "name_en": "...", ... }],
  "events": [{ "slug": "...", "name_da": "...", "weeks": [...], ... }]
}
```

**`data/hold-cards.json`** — Hold card data:
```json
{
  "hold-cards": {
    "mini-sejler": { "name_da": "...", "name_en": "...", "age_da": "...", ... },
    "begynder": { ... },
    ...
  }
}
```

## SEO

The site implements comprehensive SEO:

- **Prerendering**: All routes are rendered to static HTML at Docker build time using Playwright. Crawlers and social media scrapers get full content without JavaScript execution.
- **Per-route meta tags**: `<title>`, `<meta name="description">`, Open Graph (`og:title`, `og:description`, `og:image`, `og:url`), Twitter Card tags, and `<link rel="canonical">` are set dynamically per route.
- **Sitemap**: Auto-generated by `scripts/generate-sitemap.mjs` (runs as `prebuild` step). Includes all static and dynamic routes with priority weights.
- **robots.txt**: Allows all crawlers, references the sitemap.
- **Schema.org**: JSON-LD `SportsActivityLocation` structured data in `index.html`.
- **Trailing-slash handling**: nginx serves prerendered HTML via `try_files $uri $uri/index.html /index.html` (no redirect to trailing slash), and the JS router normalises trailing slashes in `getRoute()`.

## Adding Images

Images are organised in category folders under `images/`. To add new images:

1. Place `.jpg` files in the appropriate category folder under `images/` (e.g., `images/j70/`)
2. Run `python scripts/generate_captions.py` to process them:
   - Resized copies are saved to `images-web/<folder>/<filename>.jpg`
   - Bilingual captions are generated using AI (Gemini 2.5 Flash Image) and appended to `images/captions.md`

### Caption Format

All captions are stored in a single file — `images/captions.md` — not as per-image sidecar files:

```markdown
### photo1.jpg
_Folder: j70_

## Dansk
Beskrivende tekst på dansk

## English
Descriptive text in English
```

Each entry has a `### filename.jpg` heading, a `_Folder: category_` line, then `## Dansk` and `## English` sections. The API parses this file at startup.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/gallery` | List all folders with image counts |
| `GET /api/gallery/<folder>` | Get images + captions for a folder |
| `GET /api/gallery/random?count=6` | Get N random images across folders |
| `GET /api/health` | Health check |

## Tech Stack

- **Frontend**: TypeScript, Vite, vanilla DOM (no framework)
- **Styling**: Plain CSS with custom properties (design tokens)
- **SEO**: Playwright prerendering, per-route meta tags, sitemap, JSON-LD
- **Backend**: Python, Flask, Flask-CORS, Gunicorn
- **Server**: nginx (reverse proxy + static file serving)
- **Containerisation**: Docker, Docker Compose

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Generate sitemap, type-check, and build for production |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | Run TypeScript type checking only |

## License

Private project for KØS Sejlsport.