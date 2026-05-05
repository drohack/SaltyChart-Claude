# SaltyChart — Rebuild Specification

You are being asked to rebuild an existing web app called **SaltyChart**
from scratch within this folder (don't make a new or different folder to host the project).
This document describes *what it does* and the *hard
constraints* on deployment. It deliberately does **not** prescribe a
language, framework, database, ORM, CSS system, bundler, or state
management approach — those are yours to pick.

Prioritise features that work end-to-end over partial polish on one
surface. Prefer boring and reliable over clever.

---

## 1. What the app is

A web application for:

1. Browsing the current season of anime (cover art, titles, summaries,
   trailers, genre/age tags).
2. Building a personal watchlist for each season, with optional custom
   nicknames per show.
3. Ranking shows before watching (pre-watch order) and after watching
   (post-watch rank).
4. Comparing your rankings with another user's rankings side-by-side.
5. Picking what to watch next via a spinning "wheel of fortune" over your
   unwatched entries.

Three pages, one global options modal, login/signup.

---

## 2. Hard deployment constraints

- Runs as Docker containers orchestrated by a `docker-compose.yml` at the
  repo root.
- Target host is an **Unraid server**. `docker compose up --build` must
  bring the app up cleanly with no manual post-install steps.
- Persistent data lives in a mounted volume and survives container
  restarts and image rebuilds.
- Database schema self-heals on startup. No manual migration command on
  deploy — a fresh DB and an existing DB must both boot successfully.
- The only external service the app depends on is the public **AniList**
  GraphQL API (https://graphql.anilist.co).
- Frontend and backend can be one service or two; your call. If two, the
  frontend must be health-gated on the backend being ready.

---

## 3. Out of scope

- **Trailer subtitle translation.** The previous implementation had both
  a server-side Whisper pipeline and a local GPU pipeline for translating
  Japanese trailer audio to English subtitles. Skip all of it. Trailers
  still play; just no translated-subtitle feature, no CC toggle, no
  subtitle cache table, no related endpoints or scripts.

---

## 4. Data source

- Seasonal anime metadata is fetched from **AniList** via GraphQL.
- The backend must proxy and cache AniList responses so the frontend
  never calls AniList directly. This protects the API key-less shared
  rate limit and hides latency.
- Cache should survive restarts (persist to the DB) and also have an
  in-memory fast path for repeat hits within a process lifetime.
- Respect AniList rate limits: on 429 responses, honour any retry-after
  header, back off, and retry.

Fields needed per anime, at minimum: id, titles (English / Romaji /
Native), cover image, description/summary, genres, age rating or adult
flag, trailer (YouTube video id is enough), sequel/prequel relation hints
for the "hide sequels" filter.

---

## 5. Pages

### 5.1 Home — seasonal grid

- Season toolbar with: season selector (Winter / Spring / Summer / Fall),
  year selector, client-side search box (fuzzy match is nice-to-have),
  and three toggles: "Hide 18+", "Hide sequels", "Hide entries already
  in my list".
- Grid of anime cards: cover art, title, small "18+" badge on adult
  entries.
- Title display respects the user's title-language preference.
- Clicking a card opens a detail view with summary, trailer playback,
  and genre tags.
- Authenticated users can add/remove the entry to their watchlist for
  the currently-viewed season/year.
- Cards for entries already in the user's list are visually
  distinguished with a **border highlight** (do not reduce opacity —
  that makes cover art unreadable).
- On first load, detect the current real-world season from today's date
  and display helper text such as "X days until next season".
- Remember the last-viewed season/year across navigations (within the
  session, and across logins if the user is signed in).

### 5.2 Randomize — pick what to watch next

- Shows a spinnable wheel whose segments are the user's **unwatched**
  entries for the currently-selected season/year.
- Spinning plays a ticking sound during rotation and fires a confetti
  burst when it lands.
- A loading spinner overlays the wheel while the list is fetching; do
  not flash an empty wheel.
- Drag-and-drop reordering area to rank shows **after** watching
  (post-watch rank). Persisted server-side.
- Each show has a context action ("hide from wheel") that sets a hidden
  flag; hidden entries are skipped by the wheel but still visible in
  your list.
- Selecting a show opens a popup that shows:
  - Your own nickname and rank for that show (if any).
  - Other users' nicknames and ranks for that show, for each user you
    have opted-in via the nickname user picker.
- A "Nicknames from" side panel lists other users. On entering the page
  or changing season/year, automatically check the users who have any
  entry for that season/year. Manual toggle changes are remembered only
  within the current season view and reset when the season changes.

### 5.3 Compare — side-by-side ranking

- Pick yourself and a second user (combobox). Pick season and year.
- For each show both users have in that season, render one card
  containing: cover thumbnail, a three-column rank strip
  `[your rank | diff badge | their rank]`, custom nicknames as the
  primary typography, canonical title as italic/faded secondary info.
- A **sticky** header bar pins `[your name | their name]` to the
  viewport top while cards scroll beneath it. (Note: if the layout uses
  a scroll container anywhere up the tree, sticky will break — use
  `overflow: clip` on the body/html if you need horizontal overflow
  suppression.)
- Controls: season/year row on top; below it, a two-column grid:
  - Left: your name + a "pre-watch order / post-watch rank" selector.
  - Right: the 2nd user combobox + their "pre-watch / post-watch"
    selector.
  The two pre/post selectors should bottom-align so they share a row.
- The two users' pre/post choices are **independent** — e.g. you can
  compare your pre-watch order vs their post-watch rank.
- Default sort is by *your* rank, not by diff magnitude.
- Desktop-only extras: a colour legend for the diff heatmap, and a
  "share as image" button that rasterises the comparison to PNG for
  download/share. Mobile hides both.

---

## 6. Global options (gear-icon modal)

Persisted per user when authenticated; fall back to localStorage for
guests. The modal contains:

- **Theme**: Light / Dark / System / High-contrast.
- **Title language**: English / Romaji / Native. Applies everywhere
  titles appear.
- **Video autoplay**: on/off. Controls whether trailers auto-play when
  a card is opened.
- **Hide my list from Compare**: when on, other users cannot select this
  user in Compare's second-user combobox.
- **Nickname user picker**: choose which other users' nicknames show up
  in popups. This is a many-check list of users.

---

## 7. Authentication

- Signup: unique username + password. Enforce reasonable password rules.
- Login: returns a token. Subsequent requests carry the token
  (`Authorization: Bearer …` is fine). Token survives browser restarts.
- Guests can browse the Home grid but cannot:
  - save a watchlist,
  - set ranks,
  - hide shows,
  - sync options server-side (localStorage is the fallback).
- An admin role exists (at minimum for one seeded user) but is **not**
  user-facing in this rebuild's scope — no admin UI is required.

---

## 8. Data model (conceptual, name as you like)

- **User**: id, username, password hash, role (user/admin).
- **Settings** (1:1 with User): theme, titleLanguage, autoplay,
  hideFromCompare, nicknameUserSelection (list of user ids whose
  nicknames the user wants to see).
- **WatchListEntry**: userId, animeId (AniList id), season, year,
  nickname (nullable), preWatchOrder (implicit from list order or
  explicit integer), watched (bool), watchedAt (nullable timestamp),
  postWatchRank (nullable integer, 0-based), hidden (bool).
- **SeasonCache**: key (season, year), payload (the cached AniList
  response), fetchedAt.

Indexes worth having from day one:
- WatchListEntry by userId (list a user's entries fast).
- WatchListEntry by (season, year) (who has entries this season).
- Settings by hideFromCompare (filter the user picker).

---

## 9. API surface (shape only — name as you like)

Group as you see fit. At minimum the backend must expose endpoints that
let the frontend do all of the following:

- Health check.
- Signup, login.
- Fetch seasonal anime list for (season, year). Cached.
- Get/update the current user's options.
- List users (for the Compare combobox and Randomize nickname panel),
  respecting `hideFromCompare`.
- List users who have any entry for a given (season, year).
- List users who have any custom nickname at all.
- Get another user's entries for a (season, year) — read-only, public.
- Get all nicknames + ranks for a given animeId across users — read-only,
  public. Feeds the Randomize popup.
- CRUD on the current user's own watchlist:
  - Replace the whole list for a (season, year) in one call.
  - Toggle watched + record timestamp.
  - Update post-watch rank.
  - Toggle hidden.
  - Update nickname.

### Rate limits
- General per-IP limiter on everything (something like 120 req/min).
- Stricter limiter on auth routes (signup/login brute-force protection).
- Separate limiter on the unauthenticated public-read endpoints
  (other-user list, cross-user nicknames, users-with-ratings).

### Error shape
- Every error response is `{ error: "human message", code: "CODE_NAME" }`.
- Codes the frontend will want to branch on include at least:
  `BAD_REQUEST`, `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `INVALID_TOKEN`,
  `USER_NOT_FOUND`, `USER_EXISTS`, `RATE_LIMITED`, `UPSTREAM_ERROR`,
  `SERVER_ERROR`.

---

## 10. Non-functional expectations

- Responsive: works on phone, tablet, desktop.
- Accessible: keyboard-navigable, colour-blind-friendly diff badges,
  high-contrast theme option actually provides contrast.
- Fast initial load on the Home grid for a typical season (~50–100
  shows). Covers can be lazy-loaded.
- No client-side calls to third-party services other than YouTube's
  iframe embed for trailer playback.
- Secrets (JWT signing key or equivalent) come from environment
  variables. Default dev values are fine for local; production reads
  from env.

---

## 11. You decide

Explicitly open questions — pick whatever you are most productive in
and whatever fits the constraints above:

- Backend language/framework.
- Frontend language/framework (SSR, SPA, or hybrid).
- Database engine. A single-file embedded DB is fine; so is a
  containerised Postgres. Just make sure the persistence volume story
  is clean on Unraid.
- ORM vs query builder vs raw SQL.
- Auth token format (JWT, opaque session, whatever).
- CSS approach (utility-first, component styles, CSS modules…).
- Monorepo vs polyrepo layout.
- Build tool / package manager.
- How to structure caching (DB-backed with in-memory LRU in front is
  one reasonable answer).

Document your choices and the reason for each in a top-level `README.md`
so the next contributor can orient quickly.

---

## 12. Definition of done

- `docker compose up --build` on a clean checkout produces a working
  app reachable in a browser.
- A new user can sign up, log in, add shows to a watchlist for the
  current season, mark them watched, rank them, hide one from the
  wheel, set options, and have all of it survive a container restart.
- Two users can use Compare against each other's lists and see diffs.
- Randomize spins, plays sound, shows confetti, and respects hidden
  entries.
- AniList 429s are handled with backoff rather than surfacing as errors.
- All three pages are usable on a phone-sized viewport.
