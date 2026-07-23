import { DBClient } from "./client"
import { Product, User, Order, Coupon, GiftTier, PointsTransaction, BirthdayReward, SiteSettings, DEFAULT_SITE_SETTINGS, NewsletterSubscriber, InventoryLog, BackInStockWaitlist, SEOPageSettings, ProductVariant } from "./types"
import { products as seedProducts } from "../../data/products"
import { coupons as seedCoupons, giftTiers as seedGiftTiers } from "../../data/promotions"

const LS_PRODUCTS = "cs12_products"
const LS_USERS = "cs12_users"
const LS_ORDERS = "cs12_orders"
const LS_COUPONS = "cs12_coupons"
const LS_GIFT_TIERS = "cs12_gift_tiers"
const LS_POINTS = "cs12_points"
const LS_BIRTHDAY = "cs12_birthday"
const LS_SETTINGS = "cs12_site_settings"
const LS_NEWSLETTER = "cs12_newsletter"
const LS_INVENTORY_LOG = "cs12_inventory_log"
const LS_WAITLIST = "cs12_waitlist"
const LS_SEO_PAGES = "cs12_seo_pages"
const LS_VARIANTS = "cs12_variants"

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

// Older newsletter forms stored plain email strings under the database key.
// Convert those records so existing sign-ups are not lost and the admin table
// always receives NewsletterSubscriber objects.
function normalizeNewsletter(value: unknown): NewsletterSubscriber[] {
  if (!Array.isArray(value)) return []

  const subscribers = new Map<string, NewsletterSubscriber>()
  for (const item of value) {
    const legacyEmail = typeof item === "string" ? item : undefined
    const record = item && typeof item === "object" ? item as Partial<NewsletterSubscriber> : undefined
    const email = (legacyEmail || record?.email || "").trim().toLowerCase()
    if (!email || subscribers.has(email)) continue

    subscribers.set(email, {
      id: record?.id || `newsletter_migrated_${subscribers.size}_${Date.now()}`,
      email,
      source: record?.source || "legacy-form",
      subscribedAt: record?.subscribedAt || new Date().toISOString(),
      confirmedAt: record?.confirmedAt,
      unsubscribedAt: record?.unsubscribedAt,
      isActive: record?.isActive !== false,
      tags: Array.isArray(record?.tags) ? record.tags : []
    })
  }
  return [...subscribers.values()]
}

export class LocalDBAdapter implements DBClient {
  private products: Product[]
  private users: User[]
  private orders: Order[]
  private coupons: Coupon[]
  private giftTiers: GiftTier[]
  private points: PointsTransaction[]
  private birthday: BirthdayReward[]
  private siteSettings: SiteSettings
  private newsletter: NewsletterSubscriber[]
  private inventoryLogs: InventoryLog[]
  private waitlist: BackInStockWaitlist[]
  private seoPages: SEOPageSettings[]
  private variants: ProductVariant[]

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
      this.siteSettings = DEFAULT_SITE_SETTINGS
      this.newsletter = []
      this.inventoryLogs = []
      this.waitlist = []
      this.seoPages = []
      this.variants = []
      this.persist()
    } else {
      this.products = load<Product[]>(LS_PRODUCTS, seedProducts)
      this.users = load<User[]>(LS_USERS, [])
      this.orders = load<Order[]>(LS_ORDERS, [])
      this.coupons = load<Coupon[]>(LS_COUPONS, seedCoupons)
      this.giftTiers = load<GiftTier[]>(LS_GIFT_TIERS, seedGiftTiers)
      this.points = load<PointsTransaction[]>(LS_POINTS, [])
      this.birthday = load<BirthdayReward[]>(LS_BIRTHDAY, [])
      this.siteSettings = { ...DEFAULT_SITE_SETTINGS, ...load<Partial<SiteSettings>>(LS_SETTINGS, DEFAULT_SITE_SETTINGS) }
      this.newsletter = normalizeNewsletter(load<unknown>(LS_NEWSLETTER, []))
      // Persist the normalized shape immediately to repair data written by the
      // old homepage/footer implementations.
      save(LS_NEWSLETTER, this.newsletter)
      this.inventoryLogs = load<InventoryLog[]>(LS_INVENTORY_LOG, [])
      this.waitlist = load<BackInStockWaitlist[]>(LS_WAITLIST, [])
      this.seoPages = load<SEOPageSettings[]>(LS_SEO_PAGES, [])
      this.variants = load<ProductVariant[]>(LS_VARIANTS, [])
      // Always ensure the latest seed products exist (by id).
      // This fixes the case where bundles were added after a user first visited.
      const existingIds = new Set(this.products.map(p => p.id))
      for (const p of seedProducts) {
        if (!existingIds.has(p.id)) {
          this.products.push(p)
        }
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
    save(LS_SETTINGS, this.siteSettings)
    save(LS_NEWSLETTER, this.newsletter)
    save(LS_INVENTORY_LOG, this.inventoryLogs)
    save(LS_WAITLIST, this.waitlist)
    save(LS_SEO_PAGES, this.seoPages)
    save(LS_VARIANTS, this.variants)
  }

  // Products
  async getProducts() { return [...this.products] }
  async getProductBySlug(slug: string) { return this.products.find(p => p.slug === slug) || null }
  async getProductById(id: string) { return this.products.find(p => p.id === id) || null }
  async createProduct(p: Product) { this.products.push(p); this.persist() }
  async updateProduct(id: string, patch: Partial<Product>) {
    const idx = this.products.findIndex(p => p.id === id)
    if (idx >= 0) { this.products[idx] = { ...this.products[idx], ...patch }; this.persist() }
  }
  async deleteProduct(id: string) { this.products = this.products.filter(p => p.id !== id); this.persist() }

  // Product Variants
  async getProductVariants(productId: string) { return this.variants.filter(v => v.productId === productId) }
  async createProductVariant(variant: ProductVariant) { this.variants.push(variant); this.persist() }
  async updateProductVariant(variantId: string, patch: Partial<ProductVariant>) {
    const idx = this.variants.findIndex(v => v.id === variantId)
    if (idx >= 0) { this.variants[idx] = { ...this.variants[idx], ...patch }; this.persist() }
  }
  async deleteProductVariant(variantId: string) { this.variants = this.variants.filter(v => v.id !== variantId); this.persist() }

  // Users
  async getUsers() { return [...this.users] }
  async getUserById(id: string) { return this.users.find(u => u.id === id) || null }
  async getUserByEmail(email: string) { return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null }
  async createUser(u: User) { this.users.push(u); this.persist() }
  async updateUser(id: string, patch: Partial<User>) {
    const idx = this.users.findIndex(u => u.id === id)
    if (idx >= 0) { this.users[idx] = { ...this.users[idx], ...patch }; this.persist() }
  }

  // Orders
  async getOrders() { return [...this.orders] }
  async getOrdersByUserId(userId: string) { return this.orders.filter(o => o.userId === userId) }
  async getOrderById(id: string) { return this.orders.find(o => o.id === id) || null }
  async createOrder(o: Order) { this.orders.unshift(o); this.persist() }
  async updateOrder(id: string, patch: Partial<Order>) {
    const idx = this.orders.findIndex(o => o.id === id)
    if (idx >= 0) { this.orders[idx] = { ...this.orders[idx], ...patch }; this.persist() }
  }

  // Coupons
  async getCoupons() { return [...this.coupons] }
  async getCouponByCode(code: string) { return this.coupons.find(c => c.code.toUpperCase() === code.toUpperCase()) || null }
  async createCoupon(c: Coupon) { this.coupons.push(c); this.persist() }
  async updateCoupon(code: string, patch: Partial<Coupon>) {
    const idx = this.coupons.findIndex(c => c.code === code)
    if (idx >= 0) { this.coupons[idx] = { ...this.coupons[idx], ...patch }; this.persist() }
  }
  async deleteCoupon(code: string) {
    this.coupons = this.coupons.filter(c => c.code !== code)
    this.persist()
  }

  // Gift Tiers
  async getGiftTiers() { return [...this.giftTiers] }
  async updateGiftTiers(tiers: GiftTier[]) { this.giftTiers = tiers; this.persist() }

  // Points
  async addPointsTransaction(tx: PointsTransaction) { this.points.push(tx); this.persist() }

  // Birthday
  async getBirthdayRewards(userId: string) { return this.birthday.filter(r => r.userId === userId) }
  async createBirthdayReward(r: BirthdayReward) { this.birthday.push(r); this.persist() }

  // Site Settings
  async getSiteSettings() { return { ...this.siteSettings } }
  async updateSiteSettings(patch: Partial<SiteSettings>) {
    this.siteSettings = { ...this.siteSettings, ...patch, updatedAt: new Date().toISOString() }
    this.persist()
  }

  // Newsletter Subscribers
  async getNewsletterSubscribers() { return [...this.newsletter] }
  async createNewsletterSubscriber(subscriber: NewsletterSubscriber) {
    if (this.newsletter.some(item => item.email.toLowerCase() === subscriber.email.toLowerCase())) return
    this.newsletter.push(subscriber)
    this.persist()
  }
  async updateNewsletterSubscriber(id: string, patch: Partial<NewsletterSubscriber>) {
    const idx = this.newsletter.findIndex(s => s.id === id)
    if (idx >= 0) { this.newsletter[idx] = { ...this.newsletter[idx], ...patch }; this.persist() }
  }
  async deleteNewsletterSubscriber(id: string) { this.newsletter = this.newsletter.filter(s => s.id !== id); this.persist() }

  // Inventory Logs
  async getInventoryLogs(productId?: string) {
    if (productId) return this.inventoryLogs.filter(l => l.productId === productId)
    return [...this.inventoryLogs]
  }
  async createInventoryLog(log: InventoryLog) { this.inventoryLogs.unshift(log); this.persist() }

  // Back in Stock Waitlist
  async getBackInStockWaitlist(productId?: string) {
    if (productId) return this.waitlist.filter(w => w.productId === productId)
    return [...this.waitlist]
  }
  async addToWaitlist(entry: BackInStockWaitlist) {
    const duplicate = this.waitlist.some(item =>
      item.productId === entry.productId &&
      item.email.toLowerCase() === entry.email.toLowerCase() &&
      !item.notifiedAt
    )
    if (duplicate) return
    this.waitlist.push(entry)
    this.persist()
  }
  async markWaitlistNotified(id: string) {
    const idx = this.waitlist.findIndex(w => w.id === id)
    if (idx >= 0) { this.waitlist[idx] = { ...this.waitlist[idx], notifiedAt: new Date().toISOString() }; this.persist() }
  }

  // SEO Page Settings
  async getSEOPageSettings() { return [...this.seoPages] }
  async upsertSEOPageSettings(settings: SEOPageSettings) {
    const idx = this.seoPages.findIndex(s => s.path === settings.path)
    if (idx >= 0) this.seoPages[idx] = settings
    else this.seoPages.push(settings)
    this.persist()
  }
  async deleteSEOPageSettings(path: string) { this.seoPages = this.seoPages.filter(s => s.path !== path); this.persist() }
}

// initializer to be called from app startup
export function initLocalDB() {
  return new LocalDBAdapter()
}