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
}

export interface User {
  id: string
  email: string
  username: string
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
    name: string
    phone: string
    address: string
    district: string
    region: string
  }
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
  fontFamily: string
  fontFamilySerif: string
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

  primaryColor: "#111111",
  secondaryColor: "#825F59",
  accentColor: "#D8C6A6",
  backgroundColor: "#FDFBF8",
  cardColor: "#FFFFFF",
  textColor: "#111111",
  mutedTextColor: "#8F8881",
  borderColor: "#ECE6DF",
  fontFamily: "Instrument Sans",
  fontFamilySerif: "Cormorant Garamond",
  fontSizeBase: 16,
  fontSizeScale: 1.0,

  firstOrderCouponCode: "NEWCS12",
  firstOrderDiscountPercent: 15,
  firstOrderMinAmountHKD: 1500,

  maintenanceMode: false,
  maintenanceMessage_zh: "網站維護中，請稍後再訪",
  maintenanceMessage_en: "We are performing maintenance. Please check back soon.",

  updatedAt: new Date().toISOString()
}
