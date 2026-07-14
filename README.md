# Boilerplate Frontend

Next.js 14 (App Router) + MUI + React Query + Google OAuth. Talks to the FastAPI backend in `boilerplate-backend`.

## Stack

- Next.js 14, React 18, TypeScript
- MUI (Material UI) for components
- @tanstack/react-query for server state
- @react-oauth/google for the Google sign-in button

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_API_URL and NEXT_PUBLIC_GOOGLE_CLIENT_ID
npm run dev
```

Requires the backend running (see `../boilerplate-backend`) with a matching `GOOGLE_CLIENT_ID`.

## Auth flow (client side)

1. `GoogleLogin` (from `@react-oauth/google`) returns a Google ID token — no backend round-trip needed to get it.
2. `app/login/page.tsx` POSTs that token to `POST /api/auth/google`.
3. The response's `access_token` (our JWT) is stored in `localStorage` (`lib/api.ts`).
4. `lib/api.ts`'s axios instance attaches `Authorization: Bearer <token>` to every request; a 401 response clears the token and redirects to `/login`.

## Adding a new page/resource

1. Add a route module in the backend (`src/api/routes/<name>_routes.py`).
2. Add a component under `components/` that uses `useQuery`/`useMutation` from `@tanstack/react-query` against `lib/api.ts`'s `api` client.
3. Add a page under `app/<route>/page.tsx`.
