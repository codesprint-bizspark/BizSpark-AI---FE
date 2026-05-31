# BizSpark AI — SaaS Dashboard (Frontend)

The merchant-facing **SaaS dashboard** for BizSpark AI: generate an AI website, manage a storefront, build a mobile app, run the AI social-media agent (Facebook/Instagram), read Google Reviews, manage the team, handle billing, and connect AI assistants via **AI Connect (MCP)**.

Next.js (App Router) + React + Tailwind. Talks to the NestJS backend (`Bizpark--AI-BE`).

**Live:** <https://bizspark.randitha.net> · **API:** same origin at `/api`

---

## Tech stack

- **Next.js** (App Router, `output: 'standalone'`) + **React** + **TypeScript**
- **Tailwind CSS** + shadcn/ui components
- Deployed as a **container** (`ghcr.io/codesprint-bizspark/bizpark-frontend`) on K3s, served at the apex `bizspark.randitha.net/` with the API on the same origin (`/api`).

## Key pages (`src/app/dashboard/`)

| Page | Purpose |
|---|---|
| `overview` | Business summary |
| `website` | AI website generation + storefront link |
| `mobile-app` | Mobile app build + QR (scan-to-open via `/m`) |
| `social-media` | AI Social Media Agent — connect FB/IG, generate & schedule posts |
| `google-reviews` | Google Business reviews (mock provider in dev) |
| `ai-connect` | Generate MCP API keys; Claude Desktop config + Claude.ai web URL |
| `team-management`, `domains`, `settings` | Team, domains, plan/billing |
| `src/app/m/page.tsx` | Public "open in app" bounce page for mobile QR deep-links |

## Local development

```bash
npm install
npm run dev      # http://localhost:9002
```

Create `.env.local` for the public (build-time) config:

```bash
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_COMMERCE_URL=http://localhost:3003
NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3004
NEXT_PUBLIC_MCP_URL=http://localhost:3005
```

## Environment variables (⚠️ build-time)

This is a Next.js **standalone** build, so all `NEXT_PUBLIC_*` values are **baked into the image at build time** — they are **not** read at runtime. In production they're supplied as **Docker build-args** (from GitHub repo *Variables*); changing one requires a **rebuild**, not just a pod restart.

| Variable | Prod value | Used for |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` | backend API (same origin) |
| `NEXT_PUBLIC_COMMERCE_URL` | `https://commerce.randitha.net` | commerce/storefront API |
| `NEXT_PUBLIC_STOREFRONT_URL` | `https://store.randitha.net` | "View storefront" link |
| `NEXT_PUBLIC_MCP_URL` | `https://admin.randitha.net` | AI Connect (MCP) base; `/sse` desktop, `/mcp` web |
| `NEXT_PUBLIC_MOBILE_INSTALL_URL` / `_SCHEME` | EAS build URL / `bizpark` | mobile QR install + deep link |

## Build & deploy

CI (`.github/workflows/`) builds `bizpark-frontend` on push to `main`, passing the `NEXT_PUBLIC_*` build-args, and publishes to GHCR. The image is pinned in the [`Infra`](https://github.com/codesprint-bizspark/Infra) repo's prod overlay and rolled out by ArgoCD.

```bash
# build locally (standalone)
docker build -t bizpark-frontend \
  --build-arg NEXT_PUBLIC_API_URL=/api \
  --build-arg NEXT_PUBLIC_COMMERCE_URL=https://commerce.randitha.net \
  --build-arg NEXT_PUBLIC_MCP_URL=https://admin.randitha.net .
```

## Related repos

- **Backend:** [`Bizpark--AI-BE`](https://github.com/codesprint-bizspark/Bizpark--AI-BE) — API, Admin, Commerce, Commerce.Web, Runner, MCP
- **Infra (GitOps):** [`Infra`](https://github.com/codesprint-bizspark/Infra)
