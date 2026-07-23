# Host on Cloudflare — Later Step (Full Guide)

You asked if you can run on GitHub Pages first — yes, and this doc is exactly what to do **later** when you want to move to Cloudflare (which you mentioned as final hosting).

You have 2 phases:

---

## Phase 1: Static hosting on Cloudflare NOW (no DB needed — same as GitHub Pages)

This is what you have **today** — works with LocalStorage mock DB, zero backend. You can deploy right now alongside GitHub Pages, same code.

### 1.1 Create Cloudflare Pages project

1. Go to https://dash.cloudflare.com → **Workers & Pages → Create application → Pages → Connect to Git**
2. Select repo `fongway94/CS12HK`
3. Branch: `arena/019f8cc8-cs12hk` (or `main` after you merge)
4. Build settings:
   - Framework: `Vite` (or None)
   - Build command: `npm run build`
   - Output directory: `dist`
   - Node version: Set env var `NODE_VERSION = 22`
5. **Do NOT set `GITHUB_PAGES` env** — for Cloudflare you want base `/` (GitHub Pages workflow sets it to `/CS12HK/`). Our `vite.config.ts` already handles this:
   ```ts
   base: process.env.GITHUB_PAGES === 'true' ? '/CS12HK/' : '/'
   ```
6. Deploy → URL `https://cs12hk.pages.dev` (or your custom)

Custom domain:
- Pages → Custom domains → Add `cs12skincare.com.hk` → Follow DNS steps → Cloudflare auto SSL.

That's it. Same `dist` as GitHub Pages, works everywhere because we use **HashRouter** (`/#/shop` not `/shop`). HashRouter avoids needing server rewrite rules.

> If you later want clean URLs without `#`, switch back to BrowserRouter + keep `_routes.json` we already created (Cloudflare uses it to SPA fallback). But HashRouter is safer for both hosts.

---

## Phase 2: Plug real database later (when you're ready)

Your code is already built for this. Today `src/app/App.tsx` does:

```ts
import { initLocalDB } from "../lib/db/localAdapter"
setDBClient(initLocalDB()) // localStorage mock
```

When you have D1, change 2 lines:

```ts
import { D1Adapter } from "../lib/db/d1Adapter"
setDBClient(new D1Adapter(env.DB)) // env.DB is Cloudflare binding
```

But step-by-step:

### 2.1 Provision Cloudflare D1 (SQL)

```bash
npm install -g wrangler
wrangler login

wrangler d1 create cs12_db
# → it outputs database_id, copy it

# Put into wrangler.toml (uncomment section):
[[d1_databases]]
binding = "DB"
database_name = "cs12_db"
database_id = "YOUR_ID_FROM_ABOVE"
```

### 2.2 Run migrations (tables we prepared)

```bash
wrangler d1 execute cs12_db --file=./migrations/001_init.sql --remote
```

This creates:
- `products`, `users`, `orders`, `coupons`, `gift_tiers`, `points_ledger`, `birthday_rewards`

Check: `wrangler d1 execute cs12_db --command="SELECT name FROM sqlite_master WHERE type='table'" --remote`

### 2.3 Seed initial data (products, coupons, gift tiers)

You can either:
- Run a seed script (we can add `npm run seed:d1`)
- Or let `localAdapter` export and import: copy from `src/data/products.ts` and `promotions.ts` into D1 via INSERT.

Quick seed example:
```bash
wrangler d1 execute cs12_db --command="INSERT INTO products (id, slug, name_zh, name_en, price_hkd, price_usd, data) VALUES ('p_001_miracle_mask', 'cs12-miracle-mask-zh', '抗敏奇蹟面膜', 'Miracle Mask', 638, 81.54, '{\"full\": \"json\"}')" --remote
```

Better to build a seed API in `functions/api/seed.ts` (protected by admin key).

### 2.4 Switch adapter in code

Edit `src/app/App.tsx`:

```ts
// For Pages Functions, env is available in context
// Option A: still frontend-only D1 via API (recommended)
// Keep localAdapter but API routes call D1

// Option B: full edge DB client (if using Workers)
// In functions/api/[[route]].ts we already have placeholder
```

Simplest path we designed:

- Keep frontend using `getDBClient()` abstract.
- When D1 exists, `functions/api/` will serve real data.
- Your frontend can start calling `/api/products` instead of local.

**Implementation we prepared:**

`src/lib/db/d1Adapter.ts` is fully typed example that shows how to map:
```ts
getProducts() → SELECT * FROM products
getUserByEmail() → SELECT * FROM users WHERE email=?
createOrder() → INSERT INTO orders...
```

You only need to change `src/app/App.tsx` to detect env:

```ts
if (import.meta.env.PROD && (window as any).env?.DB) {
  setDBClient(new D1Adapter((window as any).env.DB))
} else {
  setDBClient(initLocalDB())
}
```

Or with Cloudflare Pages Functions binding, you access `env.DB` in `functions/api/` and frontend fetches it.

### 2.5 KV for sessions (optional)

In `wrangler.toml` we left placeholder:

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-id"
```

Create: `wrangler kv:namespace create SESSIONS`

Use for: faster session tokens, cart sync, rate limiting.

### 2.6 R2 for images (replace hotlinked WP images)

Today we hotlink `https://cs12skincare.com.hk/wp-content/...` (as per your earlier prototype note). For Cloudflare:

```bash
wrangler r2 bucket create cs12-images
```

Upload and replace URLs in `src/data/products.ts` with `/images/...` or R2 public URL.

### 2.7 Payments

Checkout page has comment `// Cloudflare Payments Ready`. To add real Stripe:

- Add `functions/api/create-payment-intent.ts`:
```ts
export const onRequestPost = async ({ request, env }) => {
  const stripe = new Stripe(env.STRIPE_SECRET)
  const { amount, currency } = await request.json()
  const intent = await stripe.paymentIntents.create({ amount, currency })
  return Response.json({ clientSecret: intent.client_secret })
}
```

- Set secret: `wrangler pages secret put STRIPE_SECRET`

- Frontend: use Stripe Elements to confirm.

Same for PayPal, FPS, PayMe.

---

## Summary Checklist

**Now (GitHub Pages or Cloudflare static):**
- [x] Code already built with localAdapter — no DB needed
- [x] HashRouter → works on both hosts
- [x] `npm run build` → `dist`
- [ ] Cloudflare Pages: Connect repo, build `npm run build`, output `dist`
- [ ] Add custom domain `cs12skincare.com.hk` in Cloudflare dashboard

**Later (when you want real CRM/DB/Orders):**
- [ ] `wrangler d1 create cs12_db` → copy id to `wrangler.toml`
- [ ] `wrangler d1 execute ... --file=./migrations/001_init.sql --remote`
- [ ] Create KV `SESSIONS`, R2 `cs12-images` if needed
- [ ] Seed products/users
- [ ] Switch adapter from `localAdapter` to `D1Adapter` (2 lines)
- [ ] Add Stripe secret and implement `functions/api/create-payment-intent`
- [ ] Add email service (Resend/MailChannels) for order confirmation + newsletter
- [ ] Change HashRouter → BrowserRouter if you want clean URLs (optional)

---

## Why this architecture saves you from WP plugin hell

- No WP, no WooCommerce, no Elementor, no 30 plugins
- Edge-hosted, auto-scaled, no PHP
- D1 is SQLite at edge, not MySQL server to maintain
- DB abstraction → you dev on LocalStorage today, prod on D1 tomorrow without rewrite
- Functions are just JS files in `/functions/api/` — deploy with Pages automatically

If you want, next step I can add:
- Seed script `npm run seed:d1`
- Stripe checkout integration
- Real admin product editor (currently table, can add form + R2 upload)

You are good to stay on GitHub Pages as long as you want. Cloudflare is same `dist` drop-in when ready.
