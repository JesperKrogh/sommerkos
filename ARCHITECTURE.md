# sommer-i-kos — Architecture

## Overview

**sommer-i-kos** is the main website for **KØS Sejlsport** — a sailing club in Svanemøllen Havn, Copenhagen. The site showcases the club's teams (Hold), fleet (Flåde), events, and SommerCamp programs.

The project is a **vanilla TypeScript + Vite SPA** with a **Python/Flask API** backend, containerised with Docker and served behind **nginx**. The site is bilingual (Danish/English) with client-side language toggling.

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client Browser                    │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  index.html                                    │  │
│  │  ├── Fixed white navbar (logo + nav links)     │  │
│  │  ├── <main id="app"> (SPA content)             │  │
│  │  ├── Language toggle (DA/EN) via data-lang      │  │
│  │  └── Lightbox overlay                          │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  src/main.ts (entry point)                     │  │
│  │  ├── initNav()      → fixed nav, hamburger,    │  │
│  │  │                   i18n toggle              │  │
│  │  ├── initRouter()   → SPA client-side router  │  │
│  │  └── initLightbox() → gallery viewer           │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  src/router.ts (SPA page templates)            │  │
│  │  └── renderFrontpage, renderHoldPage, etc.     │  │
│  │      + updateMeta() for per-route SEO tags     │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  CSS (4 files, no framework)                   │  │
│  │  ├── style/base.css        → reset, tokens,    │  │
│  │  │                           typography       │  │
│  │  ├── style/pages.css       → page-specific    │  │
│  │  │                           styles           │  │
│  │  ├── style/components.css → component styles  │  │
│  │  │                           (hero, nav, etc) │  │
│  │  └── style/animations.css → keyframes &       │  │
│  │                              transitions       │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP
                       ▼
┌──────────────────────────────────────────────────────┐
│                  nginx (Docker)                       │
│                                                       │
│  /              → try_files $uri $uri/index.html      │
│                   /index.html (SPA fallback)           │
│  /api/*         → proxy_pass to Flask API :5000      │
│  /images/static/→ static files from images-web/       │
│  /images/       → SPA fallback (gallery sub-app)      │
│  /images-overview/ → static hold/flåde card images    │
│  /data/*        → static JSON content data             │
│                                                       │
│  Security: X-Frame-Options, X-Content-Type-Options,  │
│  Referrer-Policy                                      │
│  Compression: gzip on                                 │
│                                                       │
│  Prerendered HTML: each route has its own             │
│  /route/index.html (built at Docker build time),     │
│  served without trailing-slash redirect              │
└──────────┬───────────────────────────┬────────────────┘
             │                           │
             ▼                           ▼
┌─────────────────────┐   ┌──────────────────────────────┐
│  Flask API          │   │  /images/ (volume mount)      │
│  (Docker)           │   │                              │
│                     │   │  19 category folders:         │
│  GET /api/gallery   │   │  optimist, j70, rsfeva,       │
│  GET /api/gallery/  │   │  rstera, begynder, camp,      │
│    <folder>         │   │  socialt, undervisning, etc.  │
│  GET /api/gallery/  │   │                              │
│    random?count=N   │   │  Each image: .jpg +           │
│  GET /api/health    │   │  optional .md caption         │
│                     │   │  (bilingual)                  │
│  Gunicorn :5000     │   └──────────────────────────────┘
│  2 workers          │
└─────────────────────┘
```

---

## Directory Structure

```
sommer-i-kos/
├── index.html                  # SPA shell — fixed nav, main#app, lightbox
├── package.json                # Dependencies: vite, typescript
├── tsconfig.json               # Strict TS, ES2020 target
├── vite.config.ts              # Build config, output to dist/
├── nginx.conf                  # nginx reverse proxy + SPA routing
├── docker-compose.yml          # Two services: frontend + api
├── Dockerfile                  # Multi-stage: Node build → prerender → nginx serve
├── Dockerfile.api              # Python 3.12 + gunicorn
│
├── src/
│   ├── main.ts                 # Entry point — initialises nav, router, lightbox
│   ├── router.ts               # SPA router + all page templates (render*)
│   │                           # + updateMeta() for per-route SEO
│   ├── data.ts                 # Data loading, navigate(), getRoute()
│   ├── style/
│   │   ├── base.css            # Reset, CSS custom properties (design tokens),
│   │   │                       # typography, layout, buttons
│   │   ├── pages.css           # Page-specific styles (page-hero, grids, cards,
│   │   │                       # nav, mobile menu, hamburger, lang-toggle)
│   │   ├── components.css      # Component styles (hero slideshow, gallery)
│   │   └── animations.css      # Keyframes (sail-drift, fade-up, countdown-tick,
│   │                           # fade-in) and animation applications
│   └── modules/
│       ├── lightbox.ts          # Gallery lightbox with keyboard nav
│       ├── nav.ts               # Navigation module (imported by main.ts)
│       ├── gallery.ts           # Gallery module
│       ├── countdown.ts         # Countdown timer module
│       ├── hero.ts              # Hero module
│       └── scroll-reveal.ts     # Scroll reveal module
│
├── data/
│   ├── site.json               # All content: site, about, flåde, events
│   └── hold-cards.json         # Hold card data (loaded separately at runtime)
│
├── api/
│   ├── app.py                  # Flask app — gallery endpoints
│   └── requirements.txt        # flask, flask-cors, gunicorn
│
├── images/                      # Raw uploaded images (READ-ONLY, never edit directly)
│   ├── captions.md               # Centralised bilingual captions for ALL images
│   ├── optimist/
│   ├── j70/
│   ├── rsfeva/
│   └── ... (19 category folders, each with .jpg files)
│
├── images-web/                   # Processed & optimised images (generated by script)
│   │                              # NEVER edit manually - run scripts/generate_captions.py
│   ├── optimist/
│   ├── j70/
│   ├── rsfeva/
│   └── ... (same folder structure as images/, generated by generate_captions.py)
│
├── images-overview/              # Hold & flåde card images (static)
│
├── scripts/
│   ├── prerender.mjs            # Playwright-based prerendering of all routes
│   ├── generate-sitemap.mjs     # Generates public/sitemap.xml from route data
│   ├── generate_captions.py     # Processes images: resizes, optimizes, generates captions
│   └── .caption_progress.json   # Caption generation progress tracker
│
├── public/
│   ├── favicon.svg              # Site favicon
│   ├── robots.txt              # Search engine directives + sitemap URL
│   └── sitemap.xml             # Auto-generated (by generate-sitemap.mjs)
│
└── dist/                       # Build output (gitignored)
```

---

## Frontend Architecture

### Entry Point (`src/main.ts`)

A single entry module that initialises all features on `DOMContentLoaded`:

```
initNav() → initRouter() → initLightbox()
```

No framework — plain DOM manipulation with TypeScript.

### Router (`src/router.ts`)

The SPA uses a custom client-side router that renders page templates based on the URL path. Routes are defined with parameter support (e.g., `/hold/:slug`).

| Route | Page Function |
|-------|--------------|
| `/` | `renderFrontpage` — Hero, intro, hold/flåde overviews, events, gallery teaser, contact |
| `/hold` | `renderHoldOverview` — Grid of all teams |
| `/hold/:slug` | `renderHoldPage` — Team detail with info grid and gallery |
| `/flade` | `renderFladeOverview` — Grid of all boats |
| `/flade/:slug` | `renderFladePage` — Boat detail with gallery |
| `/events/:slug` | `renderEventPage` — Event detail with week cards |
| `/galleri` | `renderGalleryPage` — Gallery with folder browser |
| `/kalender` | `renderKalenderPage` — Calendar with Holdsport widget |
| `/tilmelding` | `renderTilmeldingPage` — Signup with Holdsport widget |
| `/om` | `renderOmOverview` — About section cards |
| `/om/:slug` | `renderOmSubPage` — About sub-page (vedtægter, bestyrelse, etc.) |
| `*` | `renderNotFound` — 404 page |

Pages are rendered by calling the page function with site data from `data/site.json` and hold cards from `data/hold-cards.json`, then injecting the HTML into `<main id="app">`. Language-specific content is stored as bilingual fields (e.g., `name_da` / `name_en`).

### Trailing-Slash Handling

The router normalises trailing slashes in `getRoute()` (`src/data.ts`). URLs like `/hold/` are normalised to `/hold` before matching routes. This prevents 404 errors on page reloads, since nginx's `try_files` serves prerendered HTML from `/hold/index.html` without redirecting to `/hold/`.

### Data Loading (`src/data.ts`)

- `loadData()` — Fetches `/data/site.json` (cached after first load)
- `loadHoldCards()` — Fetches `/data/hold-cards.json` (cached after first load, loaded separately since hold data is needed before routing)
- `getLang()` — Returns current language ('da' | 'en')
- `navigate(path)` — Pushes to history and dispatches `route-change` event
- `getRoute()` — Returns normalised pathname (trailing slash stripped)

### Internationalisation (i18n)

Client-side bilingual support using CSS class toggling:

- Every translatable text exists as both `<span class="da">` and `<span class="en">` in the HTML
- `html[data-lang="da"]` hides `.en`, `html[data-lang="en"]` hides `.da`
- Language preference stored in `localStorage`
- Language toggle button dispatches a `route-change` custom event to re-render the current page

### CSS Architecture

Four-file CSS structure with CSS custom properties as design tokens:

| File | Purpose |
|------|---------|
| **base.css** | Reset, design tokens (colors, fonts, spacing, shadows, motion), typography, layout primitives, button variants, scroll-reveal base styles |
| **pages.css** | Page-specific styles: page-hero, breadcrumb, page-content, info-grid, hold/flåde/event cards, feature-card, nav (links, actions, mobile menu, hamburger, lang-toggle) |
| **components.css** | Component styles: hero slideshow (rotating bg + glass box), intro images, sommercamp-banner, countdown, gallery, contact, lightbox |
| **animations.css** | All `@keyframes`: sail-drift, water-shimmer, scroll-bounce, fade-up, fade-in, countdown-tick, pulse-glow, wave-bg. Plus animation applications for hero title stagger, card hover, nav entrance, lightbox, hamburger |

### Design Tokens

Defined in `:root` of `base.css`:

- **Colors**: `--color-bg`, `--color-bg-alt`, `--color-bg-dark`, `--color-text`, `--color-text-muted`, `--color-accent` (KØS blue), plus legacy/ocean theme tokens for inner pages
- **Typography**: Montserrat (display), Inter (body), JetBrains Mono (mono)
- **Spacing**: `--space-xs` through `--space-2xl`
- **Borders**: `--radius-sm` through `--radius-pill`
- **Motion**: Custom easing curves and duration variables
- **Nav**: `--nav-height: 72px`

---

## Backend Architecture

### Flask API (`api/app.py`)

A minimal Flask application with 4 endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gallery` | GET | Lists all image folders with counts |
| `/api/gallery/<folder>` | GET | Returns images + captions for a specific folder |
| `/api/gallery/random?count=N` | GET | Returns N random images spread across folders (max 50) |
| `/api/health` | GET | Health check, returns `{"ok": true}` |

### Image Architecture

**Three-tier system:**

1. **`images/`** — Raw uploaded images (READ-ONLY)
   - Original full-resolution photos uploaded by club
   - Never modified or served directly
   - Organised in subdirectories by category (e.g., `images/j70/`, `images/optimist/`)

2. **`scripts/generate_captions.py`** — Image processor
   - Scans all `.jpg` files in `images/` subdirectories
   - Resizes images to max 1200px (preserving aspect ratio)
   - Compresses to JPEG quality 85
   - Sends each image to Gemini 2.5 Flash Image via OpenRouter to generate bilingual captions
   - Appends captions to the single `images/captions.md` file
   - Saves processed images to `images-web/<folder>/<filename>.jpg`
   - Tracks progress in `scripts/.caption_progress.json` (resumable)
   - Cleans up removed images from both `captions.md` and `images-web/`

3. **`images-web/`** — Processed images (served to users)
   - Only source for images served on the website
   - Generated by running `python scripts/generate_captions.py`
   - Mirrors the folder structure of `images/`

4. **`images/captions.md`** — Centralised caption file
   - All bilingual captions stored in a single file (not per-image sidecar files)
   - Parsed by the API (`api/app.py`) at startup to build a lookup dictionary keyed by filename
   - Each image entry uses `### filename.jpg` headings with `_Folder: folder_` metadata

**Caption format in `images/captions.md`:**

```markdown
### photo1.jpg
_Folder: j70_

## Dansk
Beskrivende tekst på dansk

## English
Descriptive text in English
```

The API parses this with regex (`re.split(r"(?=^### .+\.jpg$)", ...)`) to extract `caption_da` and `caption_en` for each filename.

### Server

- **Gunicorn** with 2 workers, 30s timeout
- **Flask-CORS** enabled

---

## SEO & Prerendering

### Problem

The site is a client-side SPA — without JavaScript, all routes return the same empty `<main id="app">` shell. Search engine crawlers and social media scrapers (Facebook, Twitter, etc.) often don't execute JavaScript, so they'd see a blank page instead of content.

### Solution: Build-Time Prerendering

During the Docker build, after Vite produces `dist/`, a Playwright-based prerendering script (`scripts/prerender.mjs`) runs:

1. Starts a local HTTP server serving the built `dist/` directory
2. Uses Playwright/Chromium to visit each route
3. Waits for the SPA to render (3s timeout for data loading + animations)
4. Captures the fully-rendered HTML
5. Cleans out Vite dev-mode `<script>` and `<link>` tags (production assets are already inlined/hashed)
6. Writes each route to `dist/<route>/index.html`

This produces pre-rendered HTML files for every route:

```
dist/
├── index.html                    # /
├── hold/
│   ├── index.html                # /hold
│   ├── mini-sejler/index.html    # /hold/mini-sejler
│   ├── begynder/index.html       # /hold/begynder
│   └── ...
├── flade/
│   ├── index.html                # /flade
│   ├── optimist/index.html       # /flade/optimist
│   └── ...
├── events/
│   └── ...
├── galleri/index.html
├── kalender/index.html
├── tilmelding/index.html
├── om/
│   ├── index.html                # /om
│   └── ...
└── assets/                        # Vite's hashed JS/CSS
```

**Key benefit**: When a crawler or social media scraper requests `/hold/begynder`, nginx serves the prerendered `/hold/begynder/index.html` — a complete HTML page with all content visible, no JavaScript execution required.

### nginx Serving Strategy

The nginx `try_files` directive is configured to serve prerendered pages without trailing-slash redirects:

```nginx
location / {
    try_files $uri $uri/index.html /index.html;
}
```

- `$uri` — matches hashed assets like `/assets/index-DGQg5kkg.js`
- `$uri/index.html` — serves prerendered pages (e.g., `/hold` → `/hold/index.html`) without redirecting to `/hold/`
- `/index.html` — final SPA fallback for client-side routes not prerendered

This avoids the common SPA problem where nginx redirects `/hold` → `/hold/`, causing the JS router to see `/hold/` and fail to match `^/hold$`.

### Sitemap Generation

`scripts/generate-sitemap.mjs` runs as the `prebuild` step (`npm run build`). It reads route data from `data/site.json` and `data/hold-cards.json`, then generates `public/sitemap.xml` with:

- All static routes (`/`, `/hold`, `/flade`, `/galleri`, etc.)
- All dynamic routes (`/hold/:slug`, `/flade/:slug`, `/events/:slug`, `/om/:slug`)
- Priority weights: homepage `1.0`, static pages `0.8`, detail pages `0.6`
- Change frequency: homepage `weekly`, everything else `monthly`

The sitemap is referenced in `public/robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://kossejlsport.krogh.cc/sitemap.xml
```

### Dynamic Meta Tags

Each route dynamically updates the page's `<head>` meta tags via `updateMeta()` in `src/router.ts`:

- `<title>` — e.g. "Mini-Sejler | KØS Sejlsport"
- `<meta name="description">` — Danish/English description based on language
- Open Graph tags: `og:title`, `og:description`, `og:url`, `og:image`, `og:site_name`, `og:locale`
- Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- `<link rel="canonical">` — e.g. `https://kossejlsport.krogh.cc/hold/mini-sejler`

Hold and flåde detail pages include OG images (e.g., `/images-overview/hold-mini-sejler.jpg`) for rich social media previews.

### Schema.org Structured Data

The `<head>` in `index.html` includes a JSON-LD block with `SportsActivityLocation` schema for the club, with name, description, URL, logo, address, geo coordinates, and sameAs links.

---

## Deployment Architecture

### Docker Compose

Two services:

| Service | Build | Port | Volumes |
|---------|-------|------|---------|
| **api** | `Dockerfile.api` (Python/Flask) | 5000 (internal) | `./images-web:/app/images:ro` |
| **frontend** | `Dockerfile` (Node → prerender → nginx) | 8888:80 | `./images-web:/usr/share/nginx/images:ro`, `./images-overview:/usr/share/nginx/images-overview:ro` |

### Frontend Dockerfile (Multi-stage)

1. **Build stage**: `node:22-alpine`
   - Installs Chromium + Playwright dependencies
   - Runs `npm ci` then `npm run build` (Vite build)
   - Copies data files, images, logo to `dist/`
   - Runs `scripts/prerender.mjs` to generate static HTML for each route
2. **Serve stage**: `nginx:1.27-alpine`
   - Copies `nginx.conf` and built `dist/` directory

### nginx Configuration

```nginx
# Static data files
location /data/ {
    alias /usr/share/nginx/html/data/;
    expires 1h;
}

# API proxy to Flask
location /api/ {
    proxy_pass http://api:5000;
}

# Static images (hero backgrounds, etc.)
location /images/static/ {
    alias /usr/share/nginx/images-web/;
    expires 30d;
}

# Hold/flåde card images
location /images-overview/ {
    alias /usr/share/nginx/html/images-overview/;
    expires 30d;
}

# Gallery SPA sub-app
location /images/ {
    try_files $uri /images/index.html;
}

# SEO files
location = /robots.txt { ... }
location = /sitemap.xml { ... }

# Main SPA — serves prerendered pages without trailing-slash redirect
location / {
    try_files $uri $uri/index.html /index.html;
}

# Long-term caching for Vite's content-hashed assets
location ~* \.(js|css|woff2|woff|ttf|webp|avif|svg|ico|gif)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# No caching for HTML entry points
location ~* \.html$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **No JS framework** | Simple club site doesn't need React/Vue — vanilla TS is lighter and faster |
| **Custom SPA router** | URL-based navigation with subpages for hold, flåde, events without a framework |
| **CSS-only i18n** | Simple class toggling avoids i18n library overhead for a 2-language site |
| **Sidecar .md for captions** | Non-developers can edit image captions without touching code |
| **Data in site.json + hold-cards.json** | All content in two JSON files for easy updates; hold cards loaded separately for faster initial route matching |
| **Random gallery endpoint** | Homepage gallery shows variety across all categories automatically |
| **Multi-stage Docker build** | Production image contains only nginx + static files, no Node.js |
| **Rotating hero slideshow** | Engaging visual first impression with CSS keyframe animation |
| **prefers-reduced-motion** | Parallax/animations disabled for users who prefer reduced motion |
| **Two-tier image system** | `images/` (raw, read-only) + `images-web/` (processed) keeps originals safe and allows reprocessing |
| **Prerendered SPA** | All routes are prerendered to static HTML at build time, so crawlers and social media scrapers get full content without JavaScript |
| **Trailing-slash normalization** | `getRoute()` strips trailing slashes, and nginx `try_files $uri $uri/index.html` serves prerendered pages without redirecting — prevents 404 on page reload |
| **Per-route meta tags** | Dynamic `<title>`, Open Graph, Twitter Card, and canonical URL tags are set per route for optimal SEO and social sharing |
| **Sitemap auto-generation** | `generate-sitemap.mjs` runs as prebuild step, producing `sitemap.xml` from data files — stays in sync with content automatically |