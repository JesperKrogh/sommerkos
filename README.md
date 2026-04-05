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

# Build for production
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
- **Hero slideshow** — Full-screen rotating background images (4 images, 6s each) with centered glass-text box
- **Scroll animations** — Elements reveal on scroll with staggered timing
- **Photo gallery** — Dynamic gallery powered by the API with lightbox viewer
- **Responsive** — Mobile-first with hamburger menu and adaptive layouts
- **Accessible** — ARIA labels, keyboard navigation, `prefers-reduced-motion` support
- **Performance** — Multi-stage Docker build, aggressive caching, gzip compression

## Project Structure

```
├── index.html              # SPA shell with fixed navbar
├── src/
│   ├── main.ts             # Entry point
│   ├── router.ts           # SPA router + page templates
│   ├── data.ts             # Data loading utilities
│   └── style/              # CSS (base, pages, components, animations)
├── data/
│   └── site.json           # All content: hold, flåde, events
├── api/
│   ├── app.py              # Flask API for gallery images
│   └── requirements.txt
├── images-web/             # Source images by category
├── public/
│   └── logo-kos.png        # KØS logo
├── docker-compose.yml       # Frontend + API services
├── Dockerfile              # Frontend build (Node → nginx)
├── Dockerfile.api           # API build (Python + gunicorn)
└── nginx.conf               # Reverse proxy configuration
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed technical overview.

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Forside (Home)** | `/` | Hero slideshow, intro, SommerCamp banner, team/fleet overviews, events, gallery teaser, contact |
| **Hold (Teams)** | `/hold` | Grid of all teams |
| **Hold Detail** | `/hold/:slug` | Team info, timing, boat, gallery |
| **Flåde (Fleet)** | `/flade` | Grid of all boats |
| **Flåde Detail** | `/flåde/:slug` | Boat specs, description, gallery |
| **Events** | `/events/:slug` | Event detail with week cards (e.g., SommerCamp, Sommer i KØS) |
| **Galleri** | `/galleri` | Photo gallery with link to static image browser |

## Content Management

All content is stored in `data/site.json`:

```json
{
  "site": { "email": "...", "facebook": "..." },
  "hold": [{ "slug": "...", "name_da": "...", "name_en": "...", "age_da": "...", ... }],
  "flade": [{ "slug": "...", "name_da": "...", "specs_da": "...", ... }],
  "events": [{ "slug": "...", "name_da": "...", "weeks": [...], ... }]
}
```

## Adding Images

Images are organised in category folders under `images-web/`:

```
images-web/
├── optimist/
│   ├── photo1.jpg
│   └── photo1.md        # Optional bilingual caption
├── j70/
├── rsfeva/
├── socialt/
└── ...
```

### Caption Format

Create a `.md` file next to any `.jpg` with the same name:

```markdown
## Dansk
Beskrivende tekst på dansk

## English
Descriptive text in English
```

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
- **Backend**: Python, Flask, Flask-CORS, Gunicorn
- **Server**: nginx (reverse proxy + static file serving)
- **Containerisation**: Docker, Docker Compose

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | Run TypeScript type checking only |

## License

Private project for KØS Sejlsport.
