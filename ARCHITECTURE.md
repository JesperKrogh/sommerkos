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
│  /              → SPA (try_files → /index.html)      │
│  /api/*         → proxy_pass to Flask API :5000      │
│  /images/       → static files from images-web/      │
│  /data/*        → site.json content data             │
│                                                       │
│  Security: X-Frame-Options, X-Content-Type-Options,  │
│  Referrer-Policy                                      │
│  Compression: gzip on                                 │
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
├── Dockerfile                  # Multi-stage: Node build → nginx serve
├── Dockerfile.api              # Python 3.12 + gunicorn
│
├── src/
│   ├── main.ts                 # Entry point — initialises nav, router, lightbox
│   ├── router.ts               # SPA router + all page templates (render*)
│   ├── data.ts                 # Data loading from /data/site.json + API
│   ├── style/
│   │   ├── base.css            # Reset, CSS custom properties (design tokens),
│   │   │                       # typography, layout, buttons
│   │   ├── pages.css           # Page-specific styles (page-hero, grids, cards,
│   │   │                       # nav, mobile menu, hamburger, lang-toggle)
│   │   ├── components.css      # Component styles (hero slideshow, gallery)
│   │   └── animations.css      # Keyframes (sail-drift, fade-up, countdown-tick,
│   │                           # fade-in) and animation applications
│   └── modules/
│       └── lightbox.ts          # Gallery lightbox with keyboard nav
│
├── data/
│   └── site.json               # All content: hold, flåde, events
│
├── api/
│   ├── app.py                  # Flask app — gallery endpoints
│   └── requirements.txt        # flask, flask-cors, gunicorn
│
├── images-web/                 # Source images (copied to /dist/images in Docker)
│   ├── optimist/
│   ├── j70/
│   ├── rsfeva/
│   ├── rstera/
│   ├── rszest/
│   ├── begynder/
│   ├── camp/
│   ├── mini-sejler/
│   ├── mini-regatta/
│   ├── provetimer/
│   ├── parentsailing/
│   ├── klubtur/
│   ├── socialt/
│   ├── undervisning/
│   ├── udflugt/
│   └── prepping/
│
├── public/
│   ├── favicon.svg             # Site favicon
│   └── logo-kos.png            # KØS logo (copied to dist/)
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
| `/` | `renderFrontpage` — Hero, intro, SommerCamp banner, hold/flåde overviews, events, gallery teaser, contact |
| `/hold` | `renderHoldOverview` — Grid of all teams |
| `/hold/:slug` | `renderHoldPage` — Team detail with info grid and gallery |
| `/flade` | `renderFladeOverview` — Grid of all boats |
| `/flade/:slug` | `renderFladePage` — Boat detail with gallery |
| `/events/:slug` | `renderEventPage` — Event detail (e.g., SommerCamp) with week cards |
| `/galleri` | `renderGalleryPage` — Gallery listing with link to static image browser |
| `*` | `renderNotFound` — 404 page |

Pages are rendered by calling the page function with site data from `data/site.json`, then injecting the HTML into `<main id="app">`. Language-specific content is stored as bilingual fields (e.g., `name_da` / `name_en`).

### Data Loading (`src/data.ts`)

- `loadData()` — Fetches `/data/site.json` (bundled at build time) and merges with runtime API data
- `getLang()` — Returns current language ('da' | 'en')
- `navigate()`, `getRoute()` — Client-side navigation helpers

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

### Image Metadata

Images can have optional `.md` sidecar files for bilingual captions:

```markdown
## Dansk
Billede tekst på dansk

## English
Image text in English
```

The API parses these with regex to extract `caption_da` and `caption_en`.

### Server

- **Gunicorn** with 2 workers, 30s timeout
- **Flask-CORS** enabled

---

## Deployment Architecture

### Docker Compose

Two services:

| Service | Build | Port | Volumes |
|---------|-------|------|---------|
| **api** | `Dockerfile.api` (Python/Flask) | 5000 (internal) | `./images-web:/app/images:ro` |
| **frontend** | `Dockerfile` (Node → nginx) | 8888:80 | `./images-web:/usr/share/nginx/images:ro` |

### Frontend Dockerfile (Multi-stage)

1. **Build stage**: `node:22-alpine` — `npm ci` then `npm run build`
2. **Serve stage**: `nginx:1.27-alpine` — copies built `dist/` and `nginx.conf`

The build stage copies `images-web/` to `dist/images/` and copies `data/` to `dist/data/`.

### nginx Configuration

- Proxies `/api/*` to Flask container
- Serves `/images/` directly from `images-web/` volume
- SPA fallback for `/` and `/images/`
- Aggressive caching for content-hashed assets (1 year, immutable)
- No caching for HTML files
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Gzip compression for text-based assets

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **No JS framework** | Simple club site doesn't need React/Vue — vanilla TS is lighter and faster |
| **Custom SPA router** | URL-based navigation with subpages for hold, flåde, events without a framework |
| **CSS-only i18n** | Simple class toggling avoids i18n library overhead for a 2-language site |
| **Sidecar .md for captions** | Non-developers can edit image captions without touching code |
| **Data in site.json** | All content (hold, flåde, events) in one file for easy updates |
| **Random gallery endpoint** | Homepage gallery shows variety across all categories automatically |
| **Multi-stage Docker build** | Production image contains only nginx + static files, no Node.js |
| **Rotating hero slideshow** | Engaging visual first impression with CSS keyframe animation |
| **prefers-reduced-motion** | Parallax/animations disabled for users who prefer reduced motion |
