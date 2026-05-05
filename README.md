# SaltyChart

A personal seasonal anime tracker. Browse AniList seasonal data, maintain a watchlist, rank shows pre/post-watch, compare rankings with friends, and spin a randomizer wheel to pick what to watch next.

## Running the app

```bash
docker compose up --build
```

Open http://localhost:4000 in your browser.

Persistent data lives in `./data/saltychart.db` (mounted into the container at `/data/saltychart.db`).

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `/data/saltychart.db` | Path to SQLite database file |
| `JWT_SECRET` | `changeme-replace-in-production` | Secret for signing JWT tokens — **change this in production** |
| `PORT` | `4000` | Port the server listens on |

## Stack

| Concern | Choice | Reason |
|---|---|---|
| Runtime | Node.js 22 LTS + TypeScript | One language everywhere; LTS = stable; TS catches bugs early |
| Web framework | Express | Minimal, no magic, well-understood |
| Database | SQLite (`better-sqlite3`) | Zero additional container; single file on Unraid volume mount; synchronous API keeps code simple |
| Migrations | Numbered SQL files + tracker table | Self-healing on startup — works on fresh DB and existing DB without a manual migration step |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` | Stateless tokens survive browser restarts; standard approach |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v3 | Vite builds integrate cleanly into multi-stage Docker; Tailwind avoids CSS sprawl |
| Deployment | Single Docker container (multi-stage build) | Eliminates health-gating complexity; simpler `docker-compose.yml`; one log stream |
| Cache | In-memory `Map` + `SeasonCache` SQLite table | `Map` = sub-ms repeat hits within a process; SQLite = survives restarts |
| Rate limiting | `express-rate-limit` | Zero-config, well-maintained |
| Drag-drop | `@dnd-kit/core` | Accessible, actively maintained |
| Confetti | `canvas-confetti` | Tiny, purpose-built |
| Share as image | `html2canvas` | DOM → PNG without a headless browser |
| Tests | Vitest + Supertest (backend), Vitest + Testing Library (frontend) | Same ecosystem as Vite; fast; TypeScript-native; real in-memory SQLite for API tests |

## Development

```bash
# Backend (requires Node 22)
cd backend
npm install
npm run dev

# Frontend (in a separate terminal)
cd frontend
npm install
npm run dev
```

Frontend dev server proxies `/api` to `http://localhost:4000`.

## Tests

```bash
cd backend && npm test
cd frontend && npm test
```

## Architecture

```
/
├── backend/
│   ├── migrations/     # SQL migration files (run in order on startup)
│   ├── src/
│   │   ├── db.ts       # SQLite connection + migration runner
│   │   ├── index.ts    # Express entry point
│   │   └── routes/     # Route handlers
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── data/               # SQLite DB file (git-ignored, volume-mounted)
├── Dockerfile          # Multi-stage: Vite build → Express server
└── docker-compose.yml
```
