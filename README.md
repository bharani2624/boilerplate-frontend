# Promo Engine Frontend

Next.js 14 (App Router) + MUI + React Query + Google OAuth. Talks to the FastAPI promo backend in `boilerplate-backend`.

## Stack

- Next.js 14, React 18, TypeScript
- MUI (Material UI) for components
- @tanstack/react-query for server state
- @react-oauth/google for the Google sign-in button

## What you get

After login, `/dashboard` is a simple checkout:

- Product list with add / qty controls
- Cart summary (line items, subtotal)
- Promo code field + Apply (rejection reason shown inline)
- Discount + final total (never negative — enforced on the backend)

Seed codes to try: `SAVE10`, `FIVEOFF`, `EXPIRED`, `BIGSPEND`.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_GOOGLE_CLIENT_ID
npm run dev
```

Requires the backend running (`../boilerplate-backend`) with a matching `GOOGLE_CLIENT_ID`.

## Auth flow (client side)

1. `GoogleLogin` returns a Google ID token in the browser.
2. `app/login/page.tsx` POSTs it to `POST /api/auth/google`.
3. JWT is stored in `localStorage` (`lib/api.ts`).
4. Axios attaches `Authorization: Bearer <token>`; 401 clears token and redirects to `/login`.
