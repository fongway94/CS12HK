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
