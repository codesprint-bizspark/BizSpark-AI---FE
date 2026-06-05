# syntax=docker/dockerfile:1
# Production image for the BizSpark dashboard (Next.js standalone).

# ── deps ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* are inlined at build time, so they must be passed as build args.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_COMMERCE_URL
ARG NEXT_PUBLIC_COMMERCE_WEB_URL
ARG NEXT_PUBLIC_MCP_URL
ARG NEXT_PUBLIC_MOBILE_INSTALL_URL
ARG NEXT_PUBLIC_MOBILE_SCHEME
ARG NEXT_PUBLIC_BASE_PATH
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_COMMERCE_URL=$NEXT_PUBLIC_COMMERCE_URL \
    NEXT_PUBLIC_COMMERCE_WEB_URL=$NEXT_PUBLIC_COMMERCE_WEB_URL \
    NEXT_PUBLIC_MCP_URL=$NEXT_PUBLIC_MCP_URL \
    NEXT_PUBLIC_MOBILE_INSTALL_URL=$NEXT_PUBLIC_MOBILE_INSTALL_URL \
    NEXT_PUBLIC_MOBILE_SCHEME=$NEXT_PUBLIC_MOBILE_SCHEME \
    NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone server bundle + static assets.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
