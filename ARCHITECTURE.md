# sommer-i-kos — Architecture

## Overview

**sommer-i-kos** is a marketing/landing website for **KØS Sejlsport SommerCamp 2026** — a youth sailing camp running 6 weeks during the Danish school summer holidays at Svanemøllen Havn, Copenhagen.

The project is a **vanilla TypeScript + Vite** single-page application (SPA) with a **Python/Flask API** backend, containerised with Docker and served behind **nginx**. The site is bilingual (Danish/English) with client-side language toggling.

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client Browser                    │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  index.html (SPA shell)                       │  │
│  │  ├── Sections: Hero, About, Countdown,        │  │
│  │  │   Weeks, Gallery, Practical, Sign-up       │  │
│  │  └── Language toggle (DA/EN) via data-lang    │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  src/main.ts (entry point)                    │  │
│  │  ├── modules/nav.ts          → sticky nav,    │  │
│  │  │                             hamburger,     │  │
│  │  │                             i18n toggle    │  │
│  │  ├── modules/hero.ts         → parallax bg    │  │
│  │  ├── modules/countdown.ts    → live timer     │  │
│  │  ├── modules/scroll-reveal.ts→ Intersection   │  │
│  │  │                             Observer anims │  │
│  │  ├── modules/lightbox.ts     → gallery viewer │  │
│  │  └── modules/gallery.ts      → fetches images │  │
│  │                              from API         │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  CSS (3 files, no framework)                  │  │
│  │  ├── style/base.css        → reset, tokens,   │  │
│  │  │                           typography,       │  │
│  │  │                           layout            │  │
│  │  ├── style/components.css  → all component    │  │
│  │  │                           styles            │  │
│  │  └── style/animations.css  → keyframes &      │  │
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
│  /images/static/→ static files (30d cache)           │
│  /images/       → SPA fallback (gallery sub-routes)  │
│                                                       │
│  Security: X-Frame-Options, X-Content-Type-Options,  │
│  Referrer-Policy                                      │
│  Compression: gzip on                                 │
└──────────┬───────────────────────────┬────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────┐   ┌──────────────────────────┐
│  Flask API          │   │  /images/ (volume mount)  │
│  (Docker)           │   │                           │
│                     │   │  19 category folders:     │
│  GET /api/gallery   │   │  optimist, ilca-laser,   │
│  GET /api/gallery/  │   │  29er, rsfeva, j70,      │
│    <folder>         │   │  begynder, camp, ...      │
│  GET /api/gallery/  │   │                           │
│    random?count=N   │   │  Each image: .jpg +       │
│  GET /api/health    │   │  optional .md caption     │
│                     │   │  (bilingual, ## Dansk /   │
│  Gunicorn :5000     │   │   ## English)             │
│  2 workers          │   └──────────────────────────┘
└─────────────────────┘
```

---

## Directory Structure

```
sommer-i-kos/
├── index.html                  # SPA shell — all sections, nav, lightbox
├── package.json                # Dependencies: vite, typescript
├── tsconfig.json               # Strict TS, ES2020 target
├── vite.config.ts              # Build config, output to dist/
├── nginx.conf                  # nginx reverse proxy + SPA routing
├── docker-compose.yml          # Two services: frontend + api
├── Dockerfile                  # Multi-stage: Node build → nginx serve
├── Dockerfile.api              # Python 3.12 + gunicorn
│
├── src/
│   ├── main.ts                 # Entry point — initialises all modules
│   ├── modules/
│   │   ├── nav.ts              # Sticky scroll, hamburger menu, DA/EN toggle
│   │   ├── hero.ts             # Parallax background (respects reduced-motion)
│   │   ├── countdown.ts        # Live countdown to 2026-06-29
│   │   ├── scroll-reveal.ts    # IntersectionObserver-based reveal animations
│   │   ├── lightbox.ts         # Gallery lightbox with keyboard nav
│   │   └── gallery.ts          # Fetches random images from API, populates gallery
│   └── style/
│       ├── base.css            # Reset, CSS custom properties (design tokens),
│       │                       # typography, layout, buttons, wave dividers
│       ├── components.css      # Nav, hero, about, countdown, gallery, cards,
│       │                       # contact, footer, lightbox, week cards
│       └── animations.css      # Keyframes (sail-drift, shimmer, tick, etc.)
│
├── api/
│   ├── app.py                  # Flask app — gallery endpoints
│   └── requirements.txt        # flask, flask-cors, gunicorn
│
├── public/
│   └── favicon.svg             # Site favicon
│
└── images/                     # Source images (19 category folders)
    ├── optimist/
    ├── ilca-laser/
    ├── 29er/
    ├── rsfeva/
    ├── rstera/
    ├── rszest/
    ├── j70/
    ├── begynder/
    ├── camp/
    ├── mini-sejler/
    ├── mini-regatta/
    ├── provetimer/
    ├── forældresejlads/
    ├── klubtur/
    ├── socialt/
    ├── undervisning/
    ├── udflugt/
    ├── adventure/
    └── prepping/
```

---

## Frontend Architecture

### Entry Point (`src/main.ts`)

A single entry module that initialises all feature modules on `DOMContentLoaded`:

```
initNav() → initHero() → initCountdown() → initScrollReveal() → initLightbox()
```

No framework — plain DOM manipulation with TypeScript.

### Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| **nav.ts** | Sticky nav background on scroll, hamburger toggle for mobile menu, DA/EN language switcher with localStorage persistence |
| **hero.ts** | Parallax effect on hero background (skipped if `prefers-reduced-motion`) |
| **countdown.ts** | Live countdown timer to first camp week (2026-06-29T09:00), updates every second with tick animation |
| **scroll-reveal.ts** | IntersectionObserver that adds `.is-visible` class to `.reveal` elements with staggered delays |
| **lightbox.ts** | Opens/closes lightbox on gallery click, keyboard navigation (Escape, ArrowLeft/Right), language-aware captions via MutationObserver |
| **gallery.ts** | Fetches `/api/gallery/random?count=6`, replaces placeholder gallery items with real images, stores bilingual captions as data attributes |

### Internationalisation (i18n)

Client-side bilingual support using CSS class toggling:

- Every translatable text exists as both `<span class="da">` and `<span class="en">` in the HTML
- `html[data-lang="da"]` hides `.en`, `html[data-lang="en"]` hides `.da`
- Language preference stored in `localStorage`
- Lightbox captions update reactively via `MutationObserver` on `data-lang` attribute

### CSS Architecture

Three-file CSS structure with CSS custom properties as design tokens:

| File | Purpose |
|------|---------|
| **base.css** | Reset, design tokens (colors, fonts, spacing, shadows, motion), typography, layout primitives, button variants, wave dividers, scroll-reveal base styles |
| **components.css** | All component-specific styles: nav, hero, about grid, stat cards, countdown, timeline, gallery grid, cards, contact links, footer, lightbox, week cards |
| **animations.css** | All `@keyframes` and animation applications: sail-drift, water-shimmer, scroll-bounce, fade-up, countdown-tick, hamburger transitions, hover effects |

### Design Tokens

Defined in `:root` of `base.css`:

- **Colors**: KØS brand palette (ocean navy, sail yellow, foam lavender, etc.)
- **Typography**: Montserrat (display), Inter (body), JetBrains Mono (mono)
- **Spacing**: `--space-xs` through `--space-2xl`
- **Borders**: `--radius-sm` through `--radius-pill`
- **Motion**: Custom easing curves and duration variables

---

## Backend Architecture

### Flask API (`api/app.py`)

A minimal Flask application with 4 endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gallery` | GET | Lists all image folders with counts (for nav rendering) |
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
- **Flask-CORS** enabled (also proxied through nginx so CORS is not needed in production)

---

## Deployment Architecture

### Docker Compose

Two services:

| Service | Build | Port | Volumes |
|---------|-------|------|---------|
| **api** | `Dockerfile.api` (Python/Flask) | 5000 (internal) | `./images:/app/images:ro` |
| **frontend** | `Dockerfile` (Node → nginx) | 8888:80 | `./images:/usr/share/nginx/images:ro` |

### Frontend Dockerfile (Multi-stage)

1. **Build stage**: `node:22-alpine` — `npm ci` then `npm run build`
2. **Serve stage**: `nginx:1.27-alpine` — copies built `dist/` and `nginx.conf`

### nginx Configuration

- Proxies `/api/*` to Flask container
- Serves `/images/static/` directly with 30-day cache
- SPA fallback for `/` and `/images/`
- Aggressive caching for content-hashed assets (1 year, immutable)
- No caching for HTML files
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Gzip compression for text-based assets

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **No JS framework** | Landing page doesn't need React/Vue — vanilla TS is lighter and faster |
| **CSS-only i18n** | Simple class toggling avoids i18n library overhead for a 2-language site |
| **Sidecar .md for captions** | Non-developers can edit image captions without touching code |
| **Random gallery endpoint** | Homepage gallery shows variety across all categories automatically |
| **Multi-stage Docker build** | Production image contains only nginx + static files, no Node.js |
| **nginx image serving** | Static images bypass the Python API entirely for performance |
| **prefers-reduced-motion** | Parallax disabled for users who prefer reduced motion |
