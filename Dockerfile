# Production image for Render. Not needed for local dev — see README.md for running
# with `npm run dev` instead. Multi-stage build so the final image only contains the
# compiled output, not the full node_modules/build toolchain.

FROM node:20-alpine AS base

# deps stage: install once, cached separately from source-code changes so editing app
# code doesn't force a full npm install on every rebuild.
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# builder stage: compiles the app. output: "standalone" in next.config.js is what makes
# .next/standalone exist below — without it there'd be nothing to copy into runner.
#
# NEXT_PUBLIC_* vars are inlined into the client JS bundle at `next build` time, not
# read at runtime — so they must be passed in as Docker build ARGs (Render forwards
# every dashboard env var as a build arg automatically) and re-exposed as ENV here so
# `npm run build` below can see them. Adding a new NEXT_PUBLIC_* var later? Add it in
# both places below, or it'll silently be undefined in the deployed bundle.
FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# runner stage: the actual image that ships — just the standalone server + static
# assets, running as a non-root user (nextjs) rather than root.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
