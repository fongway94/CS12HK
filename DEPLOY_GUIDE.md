# GitHub Pages First — No Cloudflare Needed

Yes. This repo works 100% on GitHub Pages as static site with LocalStorage mock DB.

## Option 1: One-click GitHub Pages (recommended)

1. On GitHub repo `fongway94/CS12HK` go to **Settings > Pages**
2. Source: **GitHub Actions** (not branch)
3. Push to `main` or this branch `arena/019f8cc8-cs12hk` — workflow `.github/workflows/deploy-github-pages.yml` will auto build and deploy.

Your URL will be: `https://fongway94.github.io/CS12HK/`

Because we switched to **HashRouter**, refresh and direct links work:
- `https://fongway94.github.io/CS12HK/#/` home
- `https://fongway94.github.io/CS12HK/#/shop` shop
- `https://fongway94.github.io/CS12HK/#/exclusive` bundles
- `https://fongway94.github.io/CS12HK/#/admin` admin panel

Works without any server config.

## Option 2: Deploy `dist/` manually to any static host

```bash
npm install
npm run build
# dist/ folder is your site — upload to:
# - GitHub Pages (branch gh-pages)
# - Netlify (drag & drop dist)
# - Vercel (vercel --prod)
# - Cloudflare Pages later when ready (same dist)
```

## Local dev (no hosting)

```bash
npm install
npm run dev
# http://localhost:5173
```

## Why it works without DB?

`src/lib/db/localAdapter.ts` stores:

- products (seeded from live site scraping)
- users (with admin demo)
- orders
- coupons NEWCS12, BIRTHDAY10
- gift tiers $2000/$3000
- points ledger

All in `localStorage`. When you want real DB later, just swap to `D1Adapter` (see `src/lib/db/d1Adapter.ts` + `migrations/001_init.sql` + `wrangler.toml`).

## Cloudflare later (when ready)

1. Pages dashboard > Create project > Connect same repo
2. Build: `npm run build` Output: `dist`
3. No env needed yet
4. Later add D1 binding `DB` and uncomment in `wrangler.toml`

You can keep **both** GitHub Pages and Cloudflare Pages hosting same build at same time — no conflict. HashRouter works on both.

## Troubleshooting GitHub Pages base path

If you see blank page or assets 404, check:

- `vite.config.ts` base = `/CS12HK/` when `GITHUB_PAGES=true` – workflow sets this env.
- `index.html` must reference `/src/main.tsx` (Vite handles)
- Ensure Settings > Pages > Build and deployment = GitHub Actions

## Demo login for testing on GitHub Pages

- Admin: admin@cs12skincare.com.hk / admin123 → visit /#/admin to see CRM
- Register new user at /#/register to test birthday special (set birthday = this month to see 🎂 banner unlock 10% off)
