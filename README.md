# SommerCamp 2026 — KØS Sejlsport

A modern, bilingual (Danish/English) landing page for **KØS Sejlsport SommerCamp 2026** — a youth sailing camp at Svanemøllen Havn, Copenhagen.

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
- **Live countdown** — Real-time countdown to the first camp week
- **Scroll animations** — Elements reveal on scroll with staggered timing
- **Photo gallery** — Dynamic gallery powered by the API with lightbox viewer
- **Responsive** — Mobile-first with hamburger menu and adaptive layouts
- **Accessible** — ARIA labels, keyboard navigation, `prefers-reduced-motion` support
- **Performance** — Multi-stage Docker build, aggressive caching, gzip compression

## Project Structure

```
├── index.html              # Single-page application shell
├── src/
│   ├── main.ts             # Entry point
│   ├── modules/            # Feature modules (nav, hero, countdown, etc.)
│   └── style/              # CSS (base, components, animations)
├── api/
│   ├── app.py              # Flask API for gallery images
│   └── requirements.txt
├── images/                 # Source images organised by category
├── public/                 # Static assets (favicon)
├── docker-compose.yml      # Frontend + API services
├── Dockerfile              # Frontend build (Node → nginx)
├── Dockerfile.api          # API build (Python + gunicorn)
└── nginx.conf              # Reverse proxy configuration
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed technical overview.

## Sections

The landing page consists of these sections:

| Section | ID | Description |
|---------|-----|-------------|
| **Navigation** | `#nav` | Sticky nav with logo, language toggle, CTA button, hamburger menu |
| **Hero** | `#hero` | Full-screen hero with title, CTAs, animated boat SVG, parallax |
| **About** | `#om-campen` | Camp description with key stats (6 weeks, 11+, 09–15, location) |
| **Countdown** | `#nedtaelling` | Live countdown timer to first camp week (June 29, 2026) |
| **Camp Weeks** | `#uger` | 6 week cards (week 27–32) with dates and descriptions |
| **Gallery** | `#galleri` | Dynamic photo gallery with lightbox (populated via API) |
| **Practical Info** | `#praktisk` | Who can join, what to bring, safety information |
| **Sign Up** | `#tilmelding` | Links to registration, email, and Facebook |
| **Footer** | — | KØS branding and copyright |

## Adding Images

Images are organised in category folders under `images/`:

```
images/
├── optimist/
│   ├── photo1.jpg
│   └── photo1.md        # Optional bilingual caption
├── ilca-laser/
├── begynder/
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

The API reads these captions and serves them alongside image URLs.

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
