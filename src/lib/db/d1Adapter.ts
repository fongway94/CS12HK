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
import { Product, User, Order, Coupon, GiftTier, PointsTransaction, BirthdayReward } from "./types"

type D1Binding = {
  prepare: (query: string) => {
    bind: (...args: any[]) => { first: <T>() => Promise<T | null>, all: <T>() => Promise<{ results: T[] }>, run: () => Promise<any> }
  }
}

export class D1Adapter implements DBClient {
  constructor(private db: D1Binding) {}

  // Products example - full implementation would map all methods
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
    // For MVP: merge JSON in real impl use dynamic set builder
    const current = await this.getProductById(id)
    if (!current) return
    const merged = { ...current, ...patch }
    await this.db.prepare("UPDATE products SET data = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(JSON.stringify(merged), id).run()
  }
  async deleteProduct(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM products WHERE id = ?").bind(id).run()
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

  // Orders, Coupons, etc would follow same pattern
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

  async getGiftTiers(): Promise<GiftTier[]> {
    const { results } = await this.db.prepare("SELECT * FROM gift_tiers").bind().all<GiftTier>()
    return results
  }

  async addPointsTransaction(tx: PointsTransaction): Promise<void> {
    await this.db.prepare("INSERT INTO points_ledger (id, user_id, amount, reason, data) VALUES (?, ?, ?, ?, ?)")
      .bind(tx.id, tx.userId, tx.amount, tx.reason, JSON.stringify(tx)).run()
  }

  async getBirthdayRewards(userId: string): Promise<BirthdayReward[]> {
    const { results } = await this.db.prepare("SELECT * FROM birthday_rewards WHERE user_id = ?").bind(userId).all<BirthdayReward>()
    return results
  }
  async createBirthdayReward(r: BirthdayReward): Promise<void> {
    await this.db.prepare("INSERT INTO birthday_rewards (user_id, year, data) VALUES (?, ?, ?)")
      .bind(r.userId, r.year, JSON.stringify(r)).run()
  }
}
