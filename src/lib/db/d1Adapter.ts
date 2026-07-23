/**
 * Cloudflare D1 Adapter - Plug-ready for production
 * 
 * TODO when you provision D1:
 * 1. wrangler d1 create cs12_db
 * 2. put database_id in wrangler.toml
 * 3. wrangler d1 execute cs12_db --file=./migrations/001_init.sql
 * 4. Replace LocalDBAdapter with D1Adapter in src/lib/db/index.ts
 * 
 * This file shows the exact interface mapping. Keeps same DBClient contract.
 */

import { DBClient } from "./client"
import { Product, User, Order, Coupon, GiftTier, PointsTransaction, BirthdayReward, SiteSettings, NewsletterSubscriber, InventoryLog, BackInStockWaitlist, SEOPageSettings, ProductVariant } from "./types"

type D1Binding = {
  prepare: (query: string) => {
    bind: (...args: any[]) => { first: <T>() => Promise<T | null>, all: <T>() => Promise<{ results: T[] }>, run: () => Promise<any> }
  }
}

export class D1Adapter implements DBClient {
  constructor(private db: D1Binding) {}

  // Products
  async getProducts(): Promise<Product[]> {
    const { results } = await this.db.prepare("SELECT * FROM products ORDER BY created_at DESC").bind().all<Product>()
    return results
  }
  async getProductBySlug(slug: string): Promise<Product | null> {
    return await this.db.prepare("SELECT * FROM products WHERE slug = ?").bind(slug).first<Product>()
  }
  async getProductById(id: string): Promise<Product | null> {
    return await this.db.prepare("SELECT * FROM products WHERE id = ?").bind(id).first<Product>()
  }
  async createProduct(p: Product): Promise<void> {
    await this.db.prepare(
      `INSERT INTO products (id, slug, name_zh, name_en, price_hkd, price_usd, data) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(p.id, p.slug, p.name_zh, p.name_en, p.price_hkd, p.price_usd, JSON.stringify(p)).run()
  }
  async updateProduct(id: string, patch: Partial<Product>): Promise<void> {
    const current = await this.getProductById(id)
    if (!current) return
    const merged = { ...current, ...patch }
    await this.db.prepare("UPDATE products SET data = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(JSON.stringify(merged), id).run()
  }
  async deleteProduct(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM products WHERE id = ?").bind(id).run()
  }

  // Product Variants
  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    const { results } = await this.db.prepare("SELECT * FROM product_variants WHERE product_id = ?").bind(productId).all<ProductVariant>()
    return results
  }
  async createProductVariant(variant: ProductVariant): Promise<void> {
    await this.db.prepare(
      `INSERT INTO product_variants (id, product_id, name_zh, name_en, sku, price_hkd, price_usd, stock, weight_kg, image, attributes, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(variant.id, variant.productId, variant.name_zh, variant.name_en, variant.sku, variant.price_hkd, variant.price_usd, variant.stock, variant.weight_kg || 0, variant.image || null, JSON.stringify(variant.attributes), variant.isDefault ? 1 : 0).run()
  }
  async updateProductVariant(variantId: string, patch: Partial<ProductVariant>): Promise<void> {
    const current = await this.db.prepare("SELECT * FROM product_variants WHERE id = ?").bind(variantId).first<ProductVariant>()
    if (!current) return
    const merged = { ...current, ...patch }
    await this.db.prepare("UPDATE product_variants SET data = ? WHERE id = ?").bind(JSON.stringify(merged), variantId).run()
  }
  async deleteProductVariant(variantId: string): Promise<void> {
    await this.db.prepare("DELETE FROM product_variants WHERE id = ?").bind(variantId).run()
  }

  // Users
  async getUsers(): Promise<User[]> {
    const { results } = await this.db.prepare("SELECT * FROM users").bind().all<User>()
    return results
  }
  async getUserById(id: string): Promise<User | null> {
    return await this.db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>()
  }
  async getUserByEmail(email: string): Promise<User | null> {
    return await this.db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<User>()
  }
  async createUser(u: User): Promise<void> {
    await this.db.prepare("INSERT INTO users (id, email, username, data) VALUES (?, ?, ?, ?)")
      .bind(u.id, u.email, u.username, JSON.stringify(u)).run()
  }
  async updateUser(id: string, patch: Partial<User>): Promise<void> {
    const cur = await this.getUserById(id)
    if (!cur) return
    const merged = { ...cur, ...patch }
    await this.db.prepare("UPDATE users SET data = ? WHERE id = ?").bind(JSON.stringify(merged), id).run()
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    const { results } = await this.db.prepare("SELECT * FROM orders ORDER BY created_at DESC").bind().all<Order>()
    return results
  }
  async getOrdersByUserId(userId: string): Promise<Order[]> {
    const { results } = await this.db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all<Order>()
    return results
  }
  async getOrderById(id: string): Promise<Order | null> {
    return await this.db.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first<Order>()
  }
  async createOrder(o: Order): Promise<void> {
    await this.db.prepare("INSERT INTO orders (id, user_id, data, total_hkd, status, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(o.id, o.userId, JSON.stringify(o), o.totalHKD, o.status, o.createdAt).run()
  }
  async updateOrder(id: string, patch: Partial<Order>): Promise<void> {
    const cur = await this.getOrderById(id)
    if (!cur) return
    const merged = { ...cur, ...patch }
    await this.db.prepare("UPDATE orders SET data = ?, status = ? WHERE id = ?").bind(JSON.stringify(merged), merged.status, id).run()
  }

  // Coupons
  async getCoupons(): Promise<Coupon[]> {
    const { results } = await this.db.prepare("SELECT * FROM coupons").bind().all<Coupon>()
    return results
  }
  async getCouponByCode(code: string): Promise<Coupon | null> {
    return await this.db.prepare("SELECT * FROM coupons WHERE code = ?").bind(code.toUpperCase()).first<Coupon>()
  }
  async createCoupon(c: Coupon): Promise<void> {
    await this.db.prepare("INSERT INTO coupons (code, data) VALUES (?, ?)").bind(c.code, JSON.stringify(c)).run()
  }
  async updateCoupon(code: string, patch: Partial<Coupon>): Promise<void> {
    const cur = await this.getCouponByCode(code)
    if (!cur) return
    const merged = { ...cur, ...patch }
    await this.db.prepare("UPDATE coupons SET data = ? WHERE code = ?").bind(JSON.stringify(merged), code).run()
  }

  // Gift Tiers
  async getGiftTiers(): Promise<GiftTier[]> {
    const { results } = await this.db.prepare("SELECT * FROM gift_tiers").bind().all<GiftTier>()
    return results
  }
  async updateGiftTiers(tiers: GiftTier[]): Promise<void> {
    // In real implementation, use transaction
    for (const tier of tiers) {
      await this.db.prepare("INSERT OR REPLACE INTO gift_tiers (id, data) VALUES (?, ?)").bind(tier.id, JSON.stringify(tier)).run()
    }
  }

  // Points
  async addPointsTransaction(tx: PointsTransaction): Promise<void> {
    await this.db.prepare("INSERT INTO points_ledger (id, user_id, amount, reason, data) VALUES (?, ?, ?, ?, ?)")
      .bind(tx.id, tx.userId, tx.amount, tx.reason, JSON.stringify(tx)).run()
  }

  // Birthday
  async getBirthdayRewards(userId: string): Promise<BirthdayReward[]> {
    const { results } = await this.db.prepare("SELECT * FROM birthday_rewards WHERE user_id = ?").bind(userId).all<BirthdayReward>()
    return results
  }
  async createBirthdayReward(r: BirthdayReward): Promise<void> {
    await this.db.prepare("INSERT INTO birthday_rewards (user_id, year, data) VALUES (?, ?, ?)")
      .bind(r.userId, r.year, JSON.stringify(r)).run()
  }

  // Site Settings
  async getSiteSettings(): Promise<SiteSettings> {
    const row = await this.db.prepare("SELECT * FROM site_settings LIMIT 1").bind().first<{ data: string }>()
    if (row?.data) return JSON.parse(row.data)
    throw new Error("Site settings not found")
  }
  async updateSiteSettings(patch: Partial<SiteSettings>): Promise<void> {
    const current = await this.getSiteSettings()
    const merged = { ...current, ...patch, updatedAt: new Date().toISOString() }
    await this.db.prepare("INSERT OR REPLACE INTO site_settings (id, data) VALUES (?, ?)").bind("main", JSON.stringify(merged)).run()
  }

  // Newsletter Subscribers
  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    const { results } = await this.db.prepare("SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC").bind().all<NewsletterSubscriber>()
    return results
  }
  async createNewsletterSubscriber(subscriber: NewsletterSubscriber): Promise<void> {
    await this.db.prepare("INSERT INTO newsletter_subscribers (id, email, source, subscribed_at, confirmed_at, unsubscribed_at, is_active, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(subscriber.id, subscriber.email, subscriber.source, subscriber.subscribedAt, subscriber.confirmedAt || null, subscriber.unsubscribedAt || null, subscriber.isActive ? 1 : 0, JSON.stringify(subscriber.tags || [])).run()
  }
  async updateNewsletterSubscriber(id: string, patch: Partial<NewsletterSubscriber>): Promise<void> {
    const cur = await this.db.prepare("SELECT * FROM newsletter_subscribers WHERE id = ?").bind(id).first<NewsletterSubscriber>()
    if (!cur) return
    const merged = { ...cur, ...patch }
    await this.db.prepare("UPDATE newsletter_subscribers SET data = ? WHERE id = ?").bind(JSON.stringify(merged), id).run()
  }
  async deleteNewsletterSubscriber(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM newsletter_subscribers WHERE id = ?").bind(id).run()
  }

  // Inventory Logs
  async getInventoryLogs(productId?: string): Promise<InventoryLog[]> {
    if (productId) {
      const { results } = await this.db.prepare("SELECT * FROM inventory_logs WHERE product_id = ? ORDER BY created_at DESC").bind(productId).all<InventoryLog>()
      return results
    }
    const { results } = await this.db.prepare("SELECT * FROM inventory_logs ORDER BY created_at DESC").bind().all<InventoryLog>()
    return results
  }
  async createInventoryLog(log: InventoryLog): Promise<void> {
    await this.db.prepare("INSERT INTO inventory_logs (id, product_id, variant_id, type, quantity, previous_stock, new_stock, reason, order_id, admin_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(log.id, log.productId, log.variantId || null, log.type, log.quantity, log.previousStock, log.newStock, log.reason || null, log.orderId || null, log.adminId || null, log.createdAt).run()
  }

  // Back in Stock Waitlist
  async getBackInStockWaitlist(productId?: string): Promise<BackInStockWaitlist[]> {
    if (productId) {
      const { results } = await this.db.prepare("SELECT * FROM back_in_stock_waitlist WHERE product_id = ? ORDER BY created_at ASC").bind(productId).all<BackInStockWaitlist>()
      return results
    }
    const { results } = await this.db.prepare("SELECT * FROM back_in_stock_waitlist ORDER BY created_at ASC").bind().all<BackInStockWaitlist>()
    return results
  }
  async addToWaitlist(entry: BackInStockWaitlist): Promise<void> {
    await this.db.prepare("INSERT INTO back_in_stock_waitlist (id, product_id, variant_id, email, notified_at, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(entry.id, entry.productId, entry.variantId || null, entry.email, entry.notifiedAt || null, entry.createdAt).run()
  }
  async markWaitlistNotified(id: string): Promise<void> {
    await this.db.prepare("UPDATE back_in_stock_waitlist SET notified_at = datetime('now') WHERE id = ?").bind(id).run()
  }

  // SEO Page Settings
  async getSEOPageSettings(): Promise<SEOPageSettings[]> {
    const { results } = await this.db.prepare("SELECT * FROM seo_pages").bind().all<SEOPageSettings>()
    return results
  }
  async upsertSEOPageSettings(settings: SEOPageSettings): Promise<void> {
    await this.db.prepare("INSERT OR REPLACE INTO seo_pages (path, data) VALUES (?, ?)").bind(settings.path, JSON.stringify(settings)).run()
  }
  async deleteSEOPageSettings(path: string): Promise<void> {
    await this.db.prepare("DELETE FROM seo_pages WHERE path = ?").bind(path).run()
  }
}
