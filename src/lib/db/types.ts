export type Currency = "HKD" | "USD"

export interface Product {
  id: string
  slug: string
  name_zh: string
  name_en: string
  description_zh: string
  description_en: string
  price_hkd: number
  price_usd: number
  original_price_hkd?: number
  original_price_usd?: number
  sku: string
  stock: number
  weight_kg: number
  images: string[]
  series: "CalmEX" | "SoCalm" | "CellRevEX" | "Other"
  category: string[] // facial type
  skinType: string[]
  tags: string[] // e.g. bestseller, miracle, travel
  points: number // earned
  isBundle?: boolean
  bundleItems?: { productId: string; qty: number }[]
  bundleGiftLabel?: string // e.g. Buy 2 Get 3
  rating: number
  reviewsCount: number
  createdAt: string

  // SEO per product
  seoTitle_zh?: string
  seoTitle_en?: string
  seoDescription_zh?: string
  seoDescription_en?: string
  seoImage?: string

  // Product variants (size, color, etc.)
  variants?: ProductVariant[]
  hasVariants?: boolean
}

export interface ProductVariant {
  id: string
  productId: string
  name_zh: string
  name_en: string
  sku: string
  price_hkd: number
  price_usd: number
  stock: number
  weight_kg?: number
  image?: string
  attributes: Record<string, string> // e.g. { size: "30ml", color: "Ivory" }
  isDefault?: boolean
}

export interface SEOPageSettings {
  path: string
  title_zh: string
  title_en: string
  description_zh: string
  description_en: string
  image?: string
  noIndex?: boolean
  noFollow?: boolean
}

export interface User {
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  passwordHash?: string // in real DB hashed
  role: "customer" | "admin"
  birthday?: string // ISO date YYYY-MM-DD
  newsletter: boolean
  points: number
  pointsHistory: PointsTransaction[]
  createdAt: string
  lastLogin?: string
  totalSpentHKD: number
  totalOrders: number
  tier: "Member" | "VIP" | "Prestige"
  isFirstOrder: boolean
}

export interface PointsTransaction {
  id: string
  userId: string
  amount: number // positive earn, negative spend
  reason: string // e.g. "Order #123", "Birthday Bonus", "Review"
  orderId?: string
  createdAt: string
  [key: string]: any // allow extra fields for flexibility
}

export interface OrderItem {
  productId: string
  qty: number
  priceHKDAtPurchase: number
  priceUSDAtPurchase: number
}

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  subtotalHKD: number
  subtotalUSD: number
  discountHKD: number
  discountUSD: number
  shippingHKD: number
  shippingUSD: number
  totalHKD: number
  totalUSD: number
  currency: Currency
  couponCode?: string
  giftTier?: "tier1_2000" | "tier2_3000" | null
  gifts: string[] // gift product ids or description
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
  pointsEarned: number
  pointsUsed: number
  shippingAddress: {
    email: string
    firstName: string
    lastName: string
    company?: string
    name: string
    phone: string
    address: string
    address2?: string
    district: string
    region: string
  }
  billingAddress?: {
    email: string
    firstName: string
    lastName: string
    company?: string
    name: string
    phone: string
    address: string
    address2?: string
    district: string
    region: string
  }
  notes?: string
  createdAt: string
}

export interface Coupon {
  code: string
  type: "percent" | "fixed"
  value: number // e.g. 15 for 15% or 100 for HKD 100
  currency?: Currency
  minAmountHKD?: number
  minAmountUSD?: number
  maxUses?: number
  usedCount: number
  validFrom: string
  validTo: string
  onlyFirstOrder?: boolean
  description_zh: string
  description_en: string
  isActive: boolean
}

export interface GiftTier {
  id: string
  thresholdHKD: number
  thresholdUSD: number
  label_zh: string
  label_en: string
  giftValueHKD: number
  gifts: { name_zh: string; name_en: string; qty: number; image?: string }[]
}

export interface PromotionBundle {
  id: string
  name_zh: string
  name_en: string
  description_zh: string
  description_en: string
  productIds: string[]
  priceHKD: number
  priceUSD: number
  originalPriceHKD: number
  originalPriceUSD: number
  tag: string // e.g. 敏感肌首選
  buyGetLabel: string // 買2送3
  validUntil: string
}

export interface BirthdayReward {
  userId: string
  year: number
  rewarded: boolean
  couponCode: string
  discountPercent: number
  validFrom: string
  validTo: string
}

export interface NewsletterSubscriber {
  id: string
  email: string
  source: string // e.g. "homepage", "checkout", "popup", "account"
  subscribedAt: string
  confirmedAt?: string
  unsubscribedAt?: string
  isActive: boolean
  tags?: string[] // e.g. "vip", "birthday-month", "new-customer"
}

export interface InventoryLog {
  id: string
  productId: string
  variantId?: string
  type: "restock" | "sale" | "adjustment" | "return" | "damaged" | "initial"
  quantity: number // positive for in, negative for out
  previousStock: number
  newStock: number
  reason?: string
  orderId?: string
  adminId?: string
  createdAt: string
}

export interface BackInStockWaitlist {
  id: string
  productId: string
  variantId?: string
  email: string
  notifiedAt?: string
  createdAt: string
}

export interface RecentlyViewedProduct {
  productId: string
  viewedAt: string
}

export interface SiteSettings {
  // Store Info
  storeName: string
  storeTagline_zh: string
  storeTagline_en: string
  contactEmail: string
  contactPhone: string
  whatsappNumber: string
  address_zh: string
  address_en: string

  // Social Links
  instagramUrl: string
  facebookUrl: string
  whatsappUrl: string

  // Announcement Bar
  announcementBar_zh: string
  announcementBar_en: string
  announcementBarActive: boolean

  // Shipping Settings
  freeShippingThresholdHKD: number
  freeShippingThresholdUSD: number
  flatShippingFeeHKD: number
  flatShippingFeeUSD: number

  // Points Settings
  pointsPerHKD: number
  pointsRedemptionRate: number // 100 points = HK$1
  birthdayBonusPoints: number
  birthdayDiscountPercent: number

  // Tier Thresholds
  vipThresholdHKD: number
  prestigeThresholdHKD: number

  // Theme / Appearance
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  cardColor: string
  textColor: string
  mutedTextColor: string
  borderColor: string
  // CS12 brand gold used for the black/dark UI accents (buttons, links,
  // badges, highlighted headings) across the site. Defaults to the CS12
  // logo gold (#9E7428).
  brandAccentColor: string
  // Kept for backward-compatibility with older saved settings / DB rows.
  // New code should prefer the language-specific fields below.
  fontFamily: string
  fontFamilySerif: string

  // English fonts
  fontFamilyEnBody: string
  fontFamilyEnHeading: string
  // Traditional Chinese fonts
  fontFamilyZhBody: string
  fontFamilyZhHeading: string

  fontSizeBase: number // in px
  fontSizeScale: number // multiplier

  // First Order Coupon
  firstOrderCouponCode: string
  firstOrderDiscountPercent: number
  firstOrderMinAmountHKD: number

  // Maintenance Mode
  maintenanceMode: boolean
  maintenanceMessage_zh: string
  maintenanceMessage_en: string

  // SEO / Meta Settings
  seoDefaultTitle_zh: string
  seoDefaultTitle_en: string
  seoDefaultDescription_zh: string
  seoDefaultDescription_en: string
  seoDefaultImage: string
  seoTwitterHandle: string
  seoFacebookAppId: string
  googleAnalyticsId: string
  gtmContainerId: string

  updatedAt: string
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  storeName: "CS12",
  storeTagline_zh: "敏感肌修復專家",
  storeTagline_en: "Skin Experts",
  contactEmail: "info@cs12skincare.com.hk",
  contactPhone: "+852 1234 5678",
  whatsappNumber: "85200000000",
  address_zh: "香港九龍旺角",
  address_en: "Mong Kok, Kowloon, Hong Kong",

  instagramUrl: "https://instagram.com/cs12skincare_hk",
  facebookUrl: "https://facebook.com/cs12skincare",
  whatsappUrl: "https://wa.me/85200000000",

  announcementBar_zh: "官網限定｜滿 HK$800 免費送貨 · 首購滿 HK$1,500 輸入 NEWCS12 享 15% OFF",
  announcementBar_en: "ONLINE EXCLUSIVE | FREE SHIPPING OVER HK$800 · 15% OFF FIRST ORDER CODE NEWCS12",
  announcementBarActive: true,

  freeShippingThresholdHKD: 800,
  freeShippingThresholdUSD: 100,
  flatShippingFeeHKD: 80,
  flatShippingFeeUSD: 15,

  pointsPerHKD: 1,
  pointsRedemptionRate: 100,
  birthdayBonusPoints: 200,
  birthdayDiscountPercent: 10,

  vipThresholdHKD: 5000,
  prestigeThresholdHKD: 10000,

  primaryColor: "#9E7428",
  secondaryColor: "#825F59",
  accentColor: "#D8C6A6",
  backgroundColor: "#FDFBF8",
  cardColor: "#FFFFFF",
  textColor: "#111111",
  mutedTextColor: "#8F8881",
  borderColor: "#ECE6DF",
  brandAccentColor: "#9E7428",
  fontFamily: "Instrument Sans",
  fontFamilySerif: "Cormorant Garamond",

  fontFamilyEnBody: "Instrument Sans",
  fontFamilyEnHeading: "Cormorant Garamond",
  fontFamilyZhBody: "Noto Sans TC",
  fontFamilyZhHeading: "Noto Serif TC",

  fontSizeBase: 16,
  fontSizeScale: 1.0,

  firstOrderCouponCode: "NEWCS12",
  firstOrderDiscountPercent: 15,
  firstOrderMinAmountHKD: 1500,

  maintenanceMode: false,
  maintenanceMessage_zh: "網站維護中，請稍後再訪",
  maintenanceMessage_en: "We are performing maintenance. Please check back soon.",

  // SEO / Meta Settings
  seoDefaultTitle_zh: "CS12 Skincare | 敏感肌修復專家",
  seoDefaultTitle_en: "CS12 Skincare | Sensitive Skin Repair Specialist",
  seoDefaultDescription_zh: "CS12 為敏感肌而生的溫和醫研修護品牌，源自德國頂尖醫美科技，累計銷量突破百萬片。官網限定修護套裝、滿額贈品、會員積分獎勵。",
  seoDefaultDescription_en: "CS12 - Gentle clinical skincare for sensitive skin. German dermatological technology, 1M+ masks sold. Exclusive bundles, gift-with-purchase, loyalty rewards.",
  seoDefaultImage: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/CS12-LOGO_White-Background-800x800_t.png",
  seoTwitterHandle: "@cs12skincare",
  seoFacebookAppId: "",
  googleAnalyticsId: "",
  gtmContainerId: "",

  updatedAt: new Date().toISOString()
}
