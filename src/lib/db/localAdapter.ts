import { DBClient } from "./client"
import { Product, User, Order, Coupon, GiftTier, PointsTransaction, BirthdayReward } from "./types"
import { products as seedProducts } from "../../data/products"
import { coupons as seedCoupons, giftTiers as seedGiftTiers } from "../../data/promotions"

const LS_PRODUCTS = "cs12_products"
const LS_USERS = "cs12_users"
const LS_ORDERS = "cs12_orders"
const LS_COUPONS = "cs12_coupons"
const LS_GIFT_TIERS = "cs12_gift_tiers"
const LS_POINTS = "cs12_points"
const LS_BIRTHDAY = "cs12_birthday"

function isBrowser() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  } catch {
    return false
  }
}

function load<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {}
  return fallback
}
function save(key: string, v: any) {
  if (!isBrowser()) return
  try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
}

export class LocalDBAdapter implements DBClient {
  private products: Product[]
  private users: User[]
  private orders: Order[]
  private coupons: Coupon[]
  private giftTiers: GiftTier[]
  private points: PointsTransaction[]
  private birthday: BirthdayReward[]

  constructor() {
    const hasInitiated = (() => {
      try { return isBrowser() && !!localStorage.getItem(LS_PRODUCTS) }
      catch { return false }
    })()
    if (!hasInitiated) {
      this.products = seedProducts
      this.users = [
        {
          id: "admin_001",
          email: "admin@cs12skincare.com.hk",
          username: "admin",
          passwordHash: "admin123", // plain for mock
          role: "admin",
          newsletter: true,
          points: 0,
          pointsHistory: [],
          createdAt: new Date().toISOString(),
          totalSpentHKD: 0,
          totalOrders: 0,
          tier: "Prestige",
          isFirstOrder: false
        }
      ]
      this.orders = []
      this.coupons = seedCoupons
      this.giftTiers = seedGiftTiers
      this.points = []
      this.birthday = []
      this.persist()
    } else {
      this.products = load<Product[]>(LS_PRODUCTS, seedProducts)
      this.users = load<User[]>(LS_USERS, [])
      this.orders = load<Order[]>(LS_ORDERS, [])
      this.coupons = load<Coupon[]>(LS_COUPONS, seedCoupons)
      this.giftTiers = load<GiftTier[]>(LS_GIFT_TIERS, seedGiftTiers)
      this.points = load<PointsTransaction[]>(LS_POINTS, [])
      this.birthday = load<BirthdayReward[]>(LS_BIRTHDAY, [])
      // Merge new seed products not in stored to allow updates
      const existingIds = new Set(this.products.map(p => p.id))
      for (const p of seedProducts) {
        if (!existingIds.has(p.id)) this.products.push(p)
      }
    }
  }

  private persist() {
    save(LS_PRODUCTS, this.products)
    save(LS_USERS, this.users)
    save(LS_ORDERS, this.orders)
    save(LS_COUPONS, this.coupons)
    save(LS_GIFT_TIERS, this.giftTiers)
    save(LS_POINTS, this.points)
    save(LS_BIRTHDAY, this.birthday)
  }

  async getProducts() { return [...this.products] }
  async getProductBySlug(slug: string) { return this.products.find(p => p.slug === slug) || null }
  async getProductById(id: string) { return this.products.find(p => p.id === id) || null }
  async createProduct(p: Product) { this.products.push(p); this.persist() }
  async updateProduct(id: string, patch: Partial<Product>) {
    const idx = this.products.findIndex(p => p.id === id)
    if (idx >= 0) { this.products[idx] = { ...this.products[idx], ...patch }; this.persist() }
  }
  async deleteProduct(id: string) { this.products = this.products.filter(p => p.id !== id); this.persist() }

  async getUsers() { return [...this.users] }
  async getUserById(id: string) { return this.users.find(u => u.id === id) || null }
  async getUserByEmail(email: string) { return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null }
  async createUser(u: User) { this.users.push(u); this.persist() }
  async updateUser(id: string, patch: Partial<User>) {
    const idx = this.users.findIndex(u => u.id === id)
    if (idx >= 0) { this.users[idx] = { ...this.users[idx], ...patch }; this.persist() }
  }

  async getOrders() { return [...this.orders] }
  async getOrdersByUserId(userId: string) { return this.orders.filter(o => o.userId === userId) }
  async getOrderById(id: string) { return this.orders.find(o => o.id === id) || null }
  async createOrder(o: Order) { this.orders.unshift(o); this.persist() }
  async updateOrder(id: string, patch: Partial<Order>) {
    const idx = this.orders.findIndex(o => o.id === id)
    if (idx >= 0) { this.orders[idx] = { ...this.orders[idx], ...patch }; this.persist() }
  }

  async getCoupons() { return [...this.coupons] }
  async getCouponByCode(code: string) { return this.coupons.find(c => c.code.toUpperCase() === code.toUpperCase()) || null }
  async createCoupon(c: Coupon) { this.coupons.push(c); this.persist() }
  async updateCoupon(code: string, patch: Partial<Coupon>) {
    const idx = this.coupons.findIndex(c => c.code === code)
    if (idx >= 0) { this.coupons[idx] = { ...this.coupons[idx], ...patch }; this.persist() }
  }

  async getGiftTiers() { return [...this.giftTiers] }

  async addPointsTransaction(tx: PointsTransaction) { this.points.push(tx); this.persist() }

  async getBirthdayRewards(userId: string) { return this.birthday.filter(r => r.userId === userId) }
  async createBirthdayReward(r: BirthdayReward) { this.birthday.push(r); this.persist() }
}

// initializer to be called from app startup
export function initLocalDB() {
  return new LocalDBAdapter()
}
