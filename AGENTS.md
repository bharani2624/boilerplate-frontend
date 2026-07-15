# Frontend — Agent Instructions

Next.js 14 App Router + MUI + React Query. Talks to the FastAPI backend in
`../boilerplate-backend`. Read this before editing — it tells you where things live and
the pattern to follow so new code stays consistent with existing code.

## Stack

- Next.js 14 (App Router), React 18, TypeScript
- MUI (`@mui/material`) for all UI components — don't introduce another component library
- `@tanstack/react-query` for all server state (fetching/mutating backend data) — don't use `useEffect` + `fetch` for API calls
- `@react-oauth/google` for the Google sign-in button
- Plain `localStorage` + axios interceptor for the JWT session — no cookies, no next-auth

## System design overview (bird's-eye view)

```
 Browser  ──renders/hydrates──▶  Next.js server (Render, "node server.js")
    │                                     │
    │  Google OAuth (client-side, direct)│  serves static assets + SSR shell only
    ▼                                     │  (no database, no server secrets beyond
 Google Identity                          │   a *public* Google client id)
    │                                     ▼
    └──id_token──▶  Browser  ──JWT via Authorization header, cross-origin──▶  FastAPI backend
```

- **This app has no backend of its own.** `app/api/` is intentionally unused — there is
  no Next.js route handler proxying to FastAPI, no server action calling the database.
  Every data operation goes straight from the browser to the FastAPI service over
  plain HTTP via `lib/api.ts`. The Next.js server's only jobs are: serve the compiled
  JS/CSS, render the initial HTML shell, and get out of the way — it holds no secrets
  and touches no database, so there's nothing sensitive to leak if this service alone
  were compromised.
- **Cross-origin by design, not accident.** Frontend and backend are deployed as two
  separate Render services with two separate URLs — this is *why* auth uses a
  `localStorage` JWT + `Authorization` header (`lib/api.ts`) instead of a cookie: a
  same-site cookie wouldn't be sent cross-origin without extra `SameSite=None`/CORS
  credential plumbing on both sides. If you ever put both services behind one domain
  (e.g. a reverse proxy path-routing `/api/*` to the backend), a cookie becomes viable
  and slightly more secure (not readable by page JS) — not worth the setup cost for a
  builder-round boilerplate.
- **Stateless and horizontally scalable, same reasoning as the backend.** There's no
  server-side session here either — any Next.js instance can render any page for any
  user, so this scales the same trivial way (more instances, no sticky sessions). The
  practical bottleneck for the frontend is never this service — it's the one shared
  Postgres database behind the backend (see backend `AGENTS.md`'s "System design
  overview").
- **Trust boundary: this app holds nothing secret.** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is
  public by design (Google client ids are meant to be visible in browser JS — the
  `GOOGLE_CLIENT_ID` check that actually matters happens server-side, in the backend).
  There is no `GOOGLE_CLIENT_SECRET`, no database credential, no JWT signing key
  anywhere in this repo — if this codebase or its `.env.local` leaked entirely, an
  attacker still couldn't mint a valid session or read the database directly.
- **No SSR data fetching, on purpose.** Every page is `"use client"` and fetches via
  React Query after mount, rather than using Next.js server components/`fetch` with
  `cookies()`/`headers()` to pre-render authenticated data server-side. That would
  require the Next.js server to also hold/forward the JWT, adding a second place auth
  state lives. Keeping all data-fetching client-side keeps auth in exactly one place
  (`lib/api.ts`) — don't reach for server components for authenticated data without a
  specific reason (e.g. SEO on a public page), since it reintroduces that split.

## Where things live

```
app/layout.tsx           — root layout, wraps everything in AppProviders
app/page.tsx              — "/" — redirects to /dashboard or /login based on whether a token exists
app/login/page.tsx        — Google sign-in button, posts the Google ID token to the backend, stores the returned JWT
app/dashboard/page.tsx     — protected page (redirects to /login if no token); shows current user + ItemsPanel
components/AppProviders.tsx — QueryClientProvider + MUI ThemeProvider + GoogleOAuthProvider, wraps the whole app
components/ItemsPanel.tsx  — demo CRUD UI for the `items` backend resource — copy this file's shape for new resources
lib/api.ts                 — axios instance (`api`) with baseURL from NEXT_PUBLIC_API_URL, attaches Authorization header, redirects to /login on 401; also getToken/setToken/clearToken
tsconfig.json               — path aliases: @components/*, @lib/*, @app/*
next.config.js              — output: "standalone" (needed for the Dockerfile), lint/typecheck errors ignored at build time (don't rely on `next build` to catch type errors — run `tsc --noEmit` separately if needed)
Dockerfile                  — multi-stage build for Render; local dev does not need Docker (see README.md)
.env.local.example          — template; copy to .env.local, never commit .env.local
```

There is no `pages/` directory — this is App Router only. All new routes go under `app/`.

## Adding a new page/resource (follow this pattern)

1. Backend: add the route module first (see backend's AGENTS.md), confirm it works with `curl`.
2. Component: create `components/<Thing>Panel.tsx`. Fetch with `useQuery({ queryKey: [...], queryFn: async () => (await api.get("/...")).data.data })`. Mutate with `useMutation` + `queryClient.invalidateQueries({ queryKey: [...] })` on success. Always import the shared `api` client from `@lib/api` — never a raw `fetch`/new axios instance.
3. Page: create `app/<route>/page.tsx`, `"use client"` at the top, redirect to `/login` if `getToken()` is falsy (copy the `useEffect` guard in `app/dashboard/page.tsx`), then render the component.

## How a request actually flows (page → component → api client → interceptor → backend)

This is the exact call chain for the dashboard loading its items list, top to bottom —
every other data-fetching component follows the same shape:

1. **Page** (`app/dashboard/page.tsx`) — a `"use client"` component. On mount, its
   `useEffect` checks `getToken()`; if there's no token it redirects to `/login` and
   never renders further. If there is one, it sets `checked = true` and renders
   `<ItemsPanel />`. This check is a UX shortcut only — it prevents a flash of
   authenticated UI for a logged-out visitor, it is **not** the security boundary
   (the backend re-validates the JWT on every request regardless; see the backend's
   AGENTS.md `get_current_user` flow).
2. **Component** (`components/ItemsPanel.tsx`) — calls `useQuery({ queryKey: ["items"],
   queryFn: async () => (await api.get("/items")).data.data })`. React Query calls
   `queryFn` on mount (and dedupes/caches by `queryKey`).
3. **`api` client** (`lib/api.ts`) — `queryFn` calls `api.get("/items")`, which is an
   axios instance with `baseURL = "${NEXT_PUBLIC_API_URL}/api"`. Before the request
   leaves the browser, the request interceptor runs: it reads the JWT from
   `localStorage` via `getToken()` and sets `Authorization: Bearer <token>` on the
   outgoing request. Nothing in `ItemsPanel.tsx` ever touches headers directly.
4. **Network** — the request hits the FastAPI backend at
   `GET {NEXT_PUBLIC_API_URL}/api/items`, which runs its own `get_current_user`
   dependency (see backend AGENTS.md) and returns
   `{"status": "success", "data": [...], "count": N}`.
5. **Response interceptor** (`lib/api.ts`) — runs on every response. On success it's a
   no-op and the promise resolves normally. On a `401` specifically, it calls
   `clearToken()` and hard-redirects to `/login` via `window.location.href` — this is
   why `ItemsPanel.tsx` doesn't need its own error-handling for "token expired."
6. **Back in the component** — `useQuery`'s `data` becomes `res.data.data` (the `data`
   *field* of the backend's response envelope, not the whole axios response) — this
   double `.data` (`axios response.data` then backend envelope's `.data`) is
   intentional and consistent everywhere `api` is used.
7. **Render** — `ItemsPanel` maps over the array and renders MUI `ListItem`s.

Mutations (`createItem`, `deleteItem` in `ItemsPanel.tsx`) follow the same
component → api client → interceptor → backend path, except on success they call
`queryClient.invalidateQueries({ queryKey: ["items"] })`, which tells React Query the
cached list is stale and triggers step 2 again automatically — components never
manually refetch or merge the mutation's response into local state.

## Routing & rendering lifecycle (App Router mental model)

- Every file in `app/` named `page.tsx` is a route; the folder path is the URL path
  (`app/dashboard/page.tsx` → `/dashboard`). There is no `pages/` directory and no
  route config file — creating the file *is* creating the route.
- `app/layout.tsx` wraps every page exactly once, at the root. It renders
  `<AppProviders>{children}</AppProviders>` — so `QueryClientProvider`,
  `ThemeProvider`, and `GoogleOAuthProvider` (all set up in
  `components/AppProviders.tsx`) exist for every page without each page importing them.
- Every page and every component that uses hooks, state, or the `api` client starts
  with `"use client"`. Without it, Next.js treats the file as a React Server Component,
  which cannot use `useState`/`useQuery`/`useEffect` and will fail to build. If you add
  a new page, copy the `"use client"` line from an existing one (e.g.
  `app/dashboard/page.tsx`) — it's easy to forget and the resulting error message
  doesn't always make the cause obvious.
- Navigation between pages uses `useRouter()` from `next/navigation` (`router.replace(...)`,
  `router.push(...)`), not `<a href>` or `window.location` — the one exception is the
  hard `window.location.href` redirect in the 401 interceptor in `lib/api.ts`, which is
  deliberate: it forces a full reload so React Query's in-memory cache (which could
  contain another user's data) doesn't survive into the next session.

## State management (React Query) — how it's organized

- There is exactly one `QueryClient`, created once in `components/AppProviders.tsx` via
  `useState(() => new QueryClient())` and provided to the whole app. Components never
  create their own `QueryClient`.
- `queryKey` is the cache identity. Two components using `queryKey: ["items"]` share
  the same cached data; `queryKey: ["me"]` (used in `app/dashboard/page.tsx`) is
  separate. When adding a new resource, pick a queryKey that matches the backend
  resource name (`["items"]`, `["orders"]`, etc.) and use it consistently across every
  `useQuery`/`useMutation`/`invalidateQueries` call for that resource — a typo in the
  key silently creates a second, never-invalidated cache entry instead of erroring.
- Read = `useQuery`, write = `useMutation`. A mutation's `onSuccess` is where you call
  `queryClient.invalidateQueries({ queryKey: [...] })` to make reads reflect the write —
  there is no manual "refetch" call anywhere, and components don't hold their own
  `useState` copy of server data (`title`/`description` in `ItemsPanel.tsx` are form
  input state only, not a copy of fetched data).
- `enabled: checked` (in `app/dashboard/page.tsx`'s `useQuery` for `/auth/me`) is the
  pattern for "don't fire this query until some condition is true" — use it whenever a
  query depends on something not yet known on first render (here, whether a token
  exists at all), rather than gating the whole component's render on that condition.

## Auth flow (client side)

1. `GoogleLogin` (in `app/login/page.tsx`) returns a Google ID token directly in the browser — no backend call needed to obtain it.
2. That token is POSTed to `POST /api/auth/google`. The response's `access_token` (the backend's own JWT, not Google's) is saved via `setToken()` in `lib/api.ts`.
3. Every subsequent request through the `api` axios instance automatically attaches `Authorization: Bearer <token>`.
4. A 401 response anywhere clears the token and hard-redirects to `/login` (see the response interceptor in `lib/api.ts`) — you don't need to handle 401s per-call.

For the full mechanical step-by-step (which file does what, in what order), see
"How a request actually flows" above.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000, NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
npm run dev
```

Requires the backend running on the URL set in `NEXT_PUBLIC_API_URL`, with a matching
`GOOGLE_CLIENT_ID`. No Docker required for local dev — the Dockerfile is only for deploying
to Render.

## Deployment (Render)

Same flow as the backend (see its `AGENTS.md` "Deployment (Render)" section for the
GitHub-App-access and empty-env-var-row snags — both apply here too, since it's the
same Render account/GitHub connection). Deploy the **backend first** — this service's
`NEXT_PUBLIC_API_URL` needs the backend's live URL.

**Instance type: Free**, same reasoning as the backend — don't upgrade to a paid type
without being asked to. Free instances spin down on inactivity; expected, not a bug.

**Env vars to set on Render:**
```
NEXT_PUBLIC_API_URL=<backend's Render URL, no trailing slash>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same Google OAuth client id as the backend's GOOGLE_CLIENT_ID>
```

**After both services are live, two things need updating with the real URLs** (easy to
forget since they only exist after first deploy):
1. Backend's `API_CORS_ORIGINS` env var → add this frontend's Render URL (comma-separated
   alongside `http://localhost:3000`) → Render redeploys automatically on env var change.
2. Google Cloud Console → the OAuth client's **Authorized JavaScript origins** → add
   this frontend's Render URL. Without this, `GoogleLogin` will fail in production even
   though it worked locally — the origin allowlist is per-URL, not per-app.

**Known snag — `NEXT_PUBLIC_*` env vars set in Render's dashboard don't reach the
deployed app on their own.** Next.js inlines `NEXT_PUBLIC_*` variables into the client
JS bundle at `next build` time — they are not read at container runtime the way
`GOOGLE_CLIENT_ID` is on the backend. Render's dashboard env vars are only injected as
*runtime* environment variables into the running container; for a Docker-based service
they are **not** automatically available during the `docker build` step (where `RUN npm
run build` happens). Symptom: Google login fails in production with `Missing required
parameter: client_id` even though `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is correctly set in
Render's dashboard, and even though the exact same build works locally (where
`.env.local` is read directly by `next build`).

Fix (already applied in `Dockerfile`): declare `ARG NEXT_PUBLIC_API_URL` and `ARG
NEXT_PUBLIC_GOOGLE_CLIENT_ID` in the `builder` stage, then `ENV` them from those ARGs
immediately before `RUN npm run build`. Render automatically forwards every dashboard
env var as a Docker build arg — the Dockerfile just needs to explicitly opt each one in
via `ARG`/`ENV`, or it's silently `undefined` in the shipped bundle. **Adding a new
`NEXT_PUBLIC_*` variable later needs the same two-line treatment in the `Dockerfile`'s
builder stage** — setting it in Render's dashboard alone is not sufficient for anything
prefixed `NEXT_PUBLIC_`.
