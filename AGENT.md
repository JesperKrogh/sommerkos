# Agent Instructions

## Always Git Commit

After completing any task, create a git commit with a descriptive message. Use `git add .` to stage all changes, then `git commit -m "description"`.

## Project

- Vite-based project
- Run dev server: `npm run dev`
- Lint: `npm run lint` (if available)

## Testing

- Use Docker endpoint for testing: `http://localhost:8888/`
- The `sommer-i-kos-frontend-1` container serves the production build
- **After every code change**: rebuild AND restart with: `docker-compose build frontend && docker-compose restart frontend`
- Use `playwright-cli open http://localhost:8888/` to test
- Take screenshots with: `playwright-cli screenshot --filename <name>.png --full-page`
