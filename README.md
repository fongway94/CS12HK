# CS12 Skincare Hong Kong — Full Migration (Cloudflare Ready)

This is the full working rebuild of https://cs12skincare.com.hk/ away from WordPress plugin hell, as requested.

## Why this architecture?

**Old problem:** WordPress + WooCommerce + many plugins → fragile, slow, constant conflicts.
**New solution:** 
- **Cloudflare Pages** hosting (global edge, HKD 0 scale)
- **Vite + React + TypeScript** frontend (no WP)
- **DB abstraction layer** ready for Cloudflare D1 (SQL) / KV (sessions) - currently runs on LocalStorage mock so you can develop without DB, then plug D1 with 2 lines change.
- **Hono-style Functions** under `/functions/api/*` for edge API when D1 is provisioned.

You asked for database later → code is already DB-ready. You can deploy now as static, then provision D1 without rewriting.

---

## Feature Parity Audit from cs12skincare.com.hk

Analyzed all live pages:

### 1. Catalog & Navigation
- Series: #CalmEX (7 products), #SoCalm (3), #CellRevEX, Other
- Facial categories: 面膜, 安瓶, 微精華, 精華, 面霜, 緊緻拉提, 煥亮美白, 防曬, 去角質, 卸妝潔面
- Skin types: 敏感肌, 泛紅/玫瑰痤瘡, 乾性肌, 油性/痘痘/暗瘡, 成熟肌, 暗沉/不均勻膚色
- Tags: 官網限定, 暢銷產品, 奇蹟面膜, 旅遊必備
- Filters + sorting: 熱銷度, 評分, 最新, 價格 low-high
- Search keyword

### 2. Product Detail (from cs12-miracle-mask-zh)
- Multi-image gallery, HKD/USD, stock count (72), SKU, weight 0.5kg
- Points earn: 638 points (1 HKD = 1 point)
- Tabs: Description (10 benefits), Additional Info, Reviews (0 placeholder)
- Related products
- Add to cart with qty

### 3. Bundles – 官網限定 (July campaign scraped)
- 4 Sets:
  - 夏日急救修護套裝 1198 (orig 1574) 買2送3
  - 急救修護套裝 1288 (orig 1826) 買2送3
  - 全效舒敏修護套裝 1788 (orig 2656) 買3送5 / 人氣推薦
  - 極致冰鎮修護套裝 2888 (orig 4474) 買5送11 / 超值之選
- Countdown to 2026-07-31
- How-to-choose guide
- Gift tiers: 
  - $2000 → 6 gifts value $975 (面膜3 + 安瓶5ml + awaken 5ml + 防曬96 6ml)
  - $3000 → 10 gifts value $1741 (面膜6 + 安瓶5mlx2 + awaken + 防曬)
- Why need: implemented as `giftTiers` in promotions engine

### 4. Cart & Checkout
- Empty state: "您的購物車裡還沒有任何商品。回到商店"
- Cart: qty +/- , remove, subtotal, coupon, shipping, gift tier progress bar
- Promotions:
  - NEWCS12: 15% OFF first order min $1500
  - Free shipping > $800 HKD / $100 USD (configurable)
  - Gift tiers auto-unlock
  - Points: Earn = HKD amount, Redeem 100 pts = HK$1

### 5. Auth & CRM
- Login: username/email + password, Facebook login placeholder, keep logged in, forgot password link
- Register: email* + password* + newsletter checkbox + birthday optional (for birthday special)
- Privacy note: data usage
- CRM fields mapped to `User`: id, email, username, passwordHash, role, birthday, newsletter, points, pointsHistory, totalSpent, totalOrders, tier, isFirstOrder, lastLogin
- Birthday special requirement: If birthday month == current month → unlock BIRTHDAY10 coupon + badge in account + double points hint. Fully implemented in `checkBirthdayMonth()`
- Tier system: Member <5000, VIP >=5000, Prestige >=10000

### 6. Points Accumulation
- Earned per product (field `points`)
- Transaction ledger `pointsHistory`
- Redeem in checkout: input points to deduct
- Tier unlock visual in account

### 7. Admin Panel (/admin)
- Protected: only role=admin (demo: admin@cs12skincare.com.hk / admin123)
- Tabs:
  - CRM: user list, tier, points, spent, orders, birthday with 🎂 detection, newsletter status, revenue, AOV
  - Products: CRUD table for products/bundles inventory
  - Orders: all orders with status, coupon, gift count
  - Coupons: list code, type, value, min amount, first-order-only, used count
  - Bundles: bundle cards with buy-get label
- Notes explaining promotion engine location

### 8. Other Orig Site Features
- Announcement bar top: "官網限定｜滿 HK$800 免費送貨 · 首購滿 HK$1,500 輸入 NEWCS12 享 15% OFF"
- Centered wordmark brand (Dior-inspired from previous prototype but upgraded)
- Language switch 繁 / EN (stored in localStorage, i18n in components)
- Currency switch HKD / USD (stored, formats price)
- Newsletter subscription footer
- Instagram link + WhatsApp float button (WA)
- 15% OFF card, Free shipping card

---

## Architecture / Code Structure

```
/src
  /lib/db/
    types.ts        → Product, User, Order, Coupon, GiftTier, PointsTransaction etc
    client.ts       → DBClient interface (contract)
    localAdapter.ts → LocalStorage + seed data (current, zero-backend)
    d1Adapter.ts    → Cloudflare D1 implementation (plug-ready, code commented)
  /lib/promotions/engine.ts → giftTier calc, coupon validation, shipping, birthday check
  /lib/points/engine.ts     → points earn/redeem + tier
  /lib/currency/            → HKD/USD format, conversion
  /data/products.ts         → 14 products incl 4 July bundles (mirrored live site)
  /data/promotions.ts       → coupons (NEWCS12, BIRTHDAY10), gift tiers, thresholds
  /stores/  → Zustand: useAuthStore, useCartStore, useAppStore (currency/lang)
  /components/
    layout/Header, Footer
    product/ProductCard
    ui/button
  /app/routes/
    Home (campaign banner, full-bleed hero, miracle story, 3-step SoCalm, collections wall, bestsellers, real results, offers)
    Shop (filters series/cat/skin/search/sort)
    ProductDetail (gallery, qty, points, tabs, related)
    Exclusive (July sets, gift tiers, countdown)
    Cart (tier progress, coupon, shipping)
    Auth (Login/Register with birthday)
    Account (CRM self view: birthday special, tier, points history, orders)
    Checkout (address, points redeem, payment placeholder, order creation)
    Admin (CRM dashboard, products, orders, coupons, bundles)
```

### DB Abstraction – How to plug real DB later

Current: `src/app/App.tsx` calls `initLocalDB()` and `setDBClient()`

Future (2 lines):
```ts
// in src/app/App.tsx or wrangler entry
import { D1Adapter } from "../lib/db/d1Adapter"
setDBClient(new D1Adapter(env.DB)) // env.DB from Cloudflare binding
```

And set `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "cs12_db"
database_id = "YOUR_ID"
```

Then run migration: `wrangler d1 execute cs12_db --file=./migrations/001_init.sql`

All stores/services call `getDBClient()` so no rewrite needed.

---

## Cloudflare Deployment

### Local Dev
```
npm install
npm run dev   # http://localhost:5173
```

### Build
```
npm run build # outputs to dist/
```

### Deploy to Cloudflare Pages
1. Connect this repo to Cloudflare Pages
2. Build command: `npm run build`
3. Output: `dist`
4. Node version: 22 (set in env)
5. Environment vars: none needed yet

### After Deploy, Provision D1 Later
```bash
wrangler d1 create cs12_db
# copy database_id to wrangler.toml
wrangler d1 execute cs12_db --file=./migrations/001_init.sql
# then switch adapter (see above)
```

Pages Functions automatically serve `/functions/api/*` as edge functions.

---

## What's Done vs Next

**Done (this branch):**
- ✅ Full product catalog with bundles
- ✅ Cart persistence, coupon, gift tier, free shipping logic
- ✅ Auth register/login with birthday & newsletter (CRM ready)
- ✅ Points earn/redeem, tier, history
- ✅ Birthday special (month detection + auto coupon)
- ✅ Checkout creates real Order, updates user spent/points/tier
- ✅ Admin panel CRM view (users, orders, revenue, AOV)
- ✅ Products CRUD interface (table + structure)
- ✅ Promotions admin (coupons + gift tiers explanation)
- ✅ HKD/USD switch, 繁/EN
- ✅ Cloudflare Pages + Functions + D1 migration files
- ✅ DB abstraction

**Next when DB provisioned (you said later):**
- Replace localAdapter with D1Adapter
- Real Stripe / PayPal / FPS integration in Checkout (search "Cloudflare Payments Ready" comment)
- Email sending for newsletter, order confirmation (Cloudflare Email or Resend)
- Real Facebook OAuth (replace placeholder)
- Image upload to R2 instead of hotlinking original WP images (currently using original URLs per your note "use live image assets")
- Elegant/premium design pass (you said deal later)

---

## Demo Accounts
- Admin: admin@cs12skincare.com.hk / admin123
- Create new customer via Register, try birthday = current month to see birthday special unlock.

Try flow: Shop → Add bundles → Cart → See gift tier progress → Apply NEWCS12 → Checkout → Account → See points + birthday badge → Admin → See CRM.

---

## Notes on Premium Design
Kept the Dior-inspired editorial direction from previous `index.html` prototype (centered wordmark, serif headlines, thin rules, champagne palette #FDFBF8/#F7F3EB/#211C19/#825F59) but now fully componentized with Tailwind. You said design far from elegant/premium and will deal later – structure is clean to plug new design tokens.

For Cloudflare, all static assets are cacheable, edge-local.

— Built for CS12HK migration branch arena/019f8cc8-cs12hk
