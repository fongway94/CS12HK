/**
 * Cloudflare D1 Adapter - plug-ready persistence implementation.
 *
 * The schema stores a few indexed columns plus the full entity JSON in `data`.
 * This adapter keeps the same DBClient contract as LocalDBAdapter, so UI and
 * business logic can switch persistence without changing route/store code.
 */

import { DBClient } from "./client"
import { Product, User, Order, Coupon, GiftTier, PointsTransaction, BirthdayReward } from "./types"

type D1Statement = {
  bind: (...args: any[]) => {
    first: <T>() => Promise<T | null>
    all: <T>() => Promise<{ results: T[] }>
    run: () => Promise<any>
  }
}

type D1Binding = {
  prepare: (query: string) => D1Statement
}

type JsonRow<T> = T | ({ data?: string } & Record<string, any>)

function fromJsonRow<T>(row: JsonRow<T> | null): T | null {
  if (!row) return null
  const maybe = row as any
  if (typeof maybe.data === "string") {
    try { return JSON.parse(maybe.data) as T } catch {}
  }
  return row as T
}

function fromJsonRows<T>(rows: JsonRow<T>[]): T[] {
  return rows.map(r => fromJsonRow<T>(r)).filter(Boolean) as T[]
}

export class D1Adapter implements DBClient {
  constructor(private db: D1Binding) {}

  async getProducts(): Promise<Product[]> {
    const { results } = await this.db.prepare("SELECT data FROM products ORDER BY created_at DESC").bind().all<JsonRow<Product>>()
    return fromJsonRows<Product>(results)
  }
  async getProductBySlug(slug: string): Promise<Product | null> {
    const row = await this.db.prepare("SELECT data FROM products WHERE slug = ?").bind(slug).first<JsonRow<Product>>()
    return fromJsonRow<Product>(row)
  }
  async getProductById(id: string): Promise<Product | null> {
    const row = await this.db.prepare("SELECT data FROM products WHERE id = ?").bind(id).first<JsonRow<Product>>()
    return fromJsonRow<Product>(row)
  }
  async createProduct(p: Product): Promise<void> {
    await this.db.prepare(
      `INSERT INTO products (id, slug, name_zh, name_en, price_hkd, price_usd, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(p.id, p.slug, p.name_zh, p.name_en, p.price_hkd, p.price_usd, JSON.stringify(p), p.createdAt, new Date().toISOString()).run()
  }
  async updateProduct(id: string, patch: Partial<Product>): Promise<void> {
    const current = await this.getProductById(id)
    if (!current) return
    const merged = { ...current, ...patch }
    await this.db.prepare("UPDATE products SET slug = ?, name_zh = ?, name_en = ?, price_hkd = ?, price_usd = ?, data = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(merged.slug, merged.name_zh, merged.name_en, merged.price_hkd, merged.price_usd, JSON.stringify(merged), id).run()
  }
  async deleteProduct(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM products WHERE id = ?").bind(id).run()
  }

  async getUsers(): Promise<User[]> {
    const { results } = await this.db.prepare("SELECT data FROM users ORDER BY created_at DESC").bind().all<JsonRow<User>>()
    return fromJsonRows<User>(results)
  }
  async getUserById(id: string): Promise<User | null> {
    const row = await this.db.prepare("SELECT data FROM users WHERE id = ?").bind(id).first<JsonRow<User>>()
    return fromJsonRow<User>(row)
  }
  async getUserByEmail(email: string): Promise<User | null> {
    const row = await this.db.prepare("SELECT data FROM users WHERE lower(email) = lower(?)").bind(email).first<JsonRow<User>>()
    return fromJsonRow<User>(row)
  }
  async createUser(u: User): Promise<void> {
    await this.db.prepare("INSERT INTO users (id, email, username, data, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(u.id, u.email, u.username, JSON.stringify(u), u.createdAt).run()
  }
  async updateUser(id: string, patch: Partial<User>): Promise<void> {
    const cur = await this.getUserById(id)
    if (!cur) return
    const merged = { ...cur, ...patch }
    await this.db.prepare("UPDATE users SET email = ?, username = ?, data = ? WHERE id = ?").bind(merged.email, merged.username, JSON.stringify(merged), id).run()
  }

  async getOrders(): Promise<Order[]> {
    const { results } = await this.db.prepare("SELECT data FROM orders ORDER BY created_at DESC").bind().all<JsonRow<Order>>()
    return fromJsonRows<Order>(results)
  }
  async getOrdersByUserId(userId: string): Promise<Order[]> {
    const { results } = await this.db.prepare("SELECT data FROM orders WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all<JsonRow<Order>>()
    return fromJsonRows<Order>(results)
  }
  async getOrderById(id: string): Promise<Order | null> {
    const row = await this.db.prepare("SELECT data FROM orders WHERE id = ?").bind(id).first<JsonRow<Order>>()
    return fromJsonRow<Order>(row)
  }
  async createOrder(o: Order): Promise<void> {
    await this.db.prepare("INSERT INTO orders (id, user_id, data, total_hkd, status, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(o.id, o.userId, JSON.stringify(o), o.totalHKD, o.status, o.createdAt).run()
  }
  async updateOrder(id: string, patch: Partial<Order>): Promise<void> {
    const cur = await this.getOrderById(id)
    if (!cur) return
    const merged = { ...cur, ...patch }
    await this.db.prepare("UPDATE orders SET data = ?, total_hkd = ?, status = ? WHERE id = ?").bind(JSON.stringify(merged), merged.totalHKD, merged.status, id).run()
  }

  async getCoupons(): Promise<Coupon[]> {
    const { results } = await this.db.prepare("SELECT data FROM coupons ORDER BY code").bind().all<JsonRow<Coupon>>()
    return fromJsonRows<Coupon>(results)
  }
  async getCouponByCode(code: string): Promise<Coupon | null> {
    const row = await this.db.prepare("SELECT data FROM coupons WHERE code = ?").bind(code.toUpperCase()).first<JsonRow<Coupon>>()
    return fromJsonRow<Coupon>(row)
  }
  async createCoupon(c: Coupon): Promise<void> {
    const normalized = { ...c, code: c.code.toUpperCase() }
    await this.db.prepare("INSERT OR REPLACE INTO coupons (code, data) VALUES (?, ?)").bind(normalized.code, JSON.stringify(normalized)).run()
  }
  async updateCoupon(code: string, patch: Partial<Coupon>): Promise<void> {
    const cur = await this.getCouponByCode(code)
    if (!cur) return
    const merged = { ...cur, ...patch, code: (patch.code || cur.code).toUpperCase() }
    await this.db.prepare("UPDATE coupons SET data = ? WHERE code = ?").bind(JSON.stringify(merged), code.toUpperCase()).run()
  }
  async deleteCoupon(code: string): Promise<void> {
    await this.db.prepare("DELETE FROM coupons WHERE code = ?").bind(code.toUpperCase()).run()
  }

  async getGiftTiers(): Promise<GiftTier[]> {
    const { results } = await this.db.prepare("SELECT data FROM gift_tiers").bind().all<JsonRow<GiftTier>>()
    return fromJsonRows<GiftTier>(results)
  }
  async createGiftTier(tier: GiftTier): Promise<void> {
    await this.db.prepare("INSERT OR REPLACE INTO gift_tiers (id, data) VALUES (?, ?)").bind(tier.id, JSON.stringify(tier)).run()
  }
  async updateGiftTier(id: string, patch: Partial<GiftTier>): Promise<void> {
    const tiers = await this.getGiftTiers()
    const cur = tiers.find(t => t.id === id)
    if (!cur) return
    const merged = { ...cur, ...patch }
    await this.db.prepare("UPDATE gift_tiers SET data = ? WHERE id = ?").bind(JSON.stringify(merged), id).run()
  }
  async deleteGiftTier(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM gift_tiers WHERE id = ?").bind(id).run()
  }

  async addPointsTransaction(tx: PointsTransaction): Promise<void> {
    await this.db.prepare("INSERT INTO points_ledger (id, user_id, amount, reason, data, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(tx.id, tx.userId, tx.amount, tx.reason, JSON.stringify(tx), tx.createdAt).run()
  }

  async getBirthdayRewards(userId: string): Promise<BirthdayReward[]> {
    const { results } = await this.db.prepare("SELECT data FROM birthday_rewards WHERE user_id = ?").bind(userId).all<JsonRow<BirthdayReward>>()
    return fromJsonRows<BirthdayReward>(results)
  }
  async createBirthdayReward(r: BirthdayReward): Promise<void> {
    await this.db.prepare("INSERT OR REPLACE INTO birthday_rewards (user_id, year, data) VALUES (?, ?, ?)")
      .bind(r.userId, r.year, JSON.stringify(r)).run()
  }
}
