# Agent Instructions

## Always Git Commit

After completing any task, create a git commit with a descriptive message. Use `git add .` to stage all changes, then `git commit -m "description"`.

## Project

- Vite-based project (vanilla TypeScript, no framework)
- Run dev server: `npm run dev`
- Type check: `npm run typecheck`

## Build & Deploy

After every code change, rebuild and recreate the frontend container:

```
docker compose build frontend && docker compose up -d --force-recreate frontend
```

**Important:** Use `--force-recreate` (not just `restart`) to ensure the new image is used.
If builds seem stale, use `--no-cache`:

```
docker compose build --no-cache frontend && docker compose up -d --force-recreate frontend
```

### Build pipeline

The build runs these steps in order:

1. **`npm run build`** — runs `prebuild` (sitemap generation) → `tsc` → `vite build`
2. **Dockerfile build stage** — copies data/images, then runs `scripts/prerender.mjs` with Playwright/Chromium to generate static HTML for every route
3. **Dockerfile serve stage** — copies built `dist/` + `nginx.conf` into nginx image

### Prerendering

All routes are prerendered to static HTML during the Docker build using Playwright. This means:

- Crawlers and social media scrapers get full content without JS execution
- Each route gets its own `/route/index.html` file with complete rendered content
- The prerender script fails gracefully (|| true) — if Playwright isn't available, the SPA fallback still works

### nginx serving

nginx uses `try_files $uri $uri/index.html /index.html` to serve prerendered pages without trailing-slash redirects. The JS router in `getRoute()` also normalises trailing slashes. This prevents the common SPA 404-on-reload bug.

## Testing

- Use Docker endpoint for testing: `http://localhost:8888/`
- Use `playwright-cli open http://localhost:8888/` to test
- Take screenshots with: `playwright-cli screenshot --filename <name>.png --full-page`
- Always test page reloads on subpages (e.g., `/hold`, `/hold/begynder`) to verify the trailing-slash fix works