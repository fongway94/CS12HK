import { GiftTier, Coupon, Currency } from "../db/types"
import { FREE_SHIPPING_THRESHOLD_HKD, FREE_SHIPPING_THRESHOLD_USD } from "../../data/promotions"

export function calcSubtotal(items: { priceHKD: number; priceUSD: number; qty: number }[]) {
  let hkd = 0, usd = 0
  for (const it of items) { hkd += it.priceHKD * it.qty; usd += it.priceUSD * it.qty }
  return { hkd, usd }
}

export function getGiftTier(subtotalHKD: number, subtotalUSD: number, tiers: GiftTier[], currency: Currency) {
  // sort descending threshold to get highest eligible
  const sorted = [...tiers].sort((a,b)=> b.thresholdHKD - a.thresholdHKD)
  for (const t of sorted) {
    const threshold = currency === "HKD" ? t.thresholdHKD : t.thresholdUSD
    const sub = currency === "HKD" ? subtotalHKD : subtotalUSD
    if (sub >= threshold) return t
  }
  return null
}

type CouponContext = {
  isFirstOrder?: boolean
  isBirthdayMonth?: boolean
}

export function calcCouponDiscount(
  subtotalHKD: number,
  subtotalUSD: number,
  coupon: Coupon | null,
  currency: Currency,
  contextOrFirstOrder: CouponContext | boolean = {}
) {
  const context: CouponContext = typeof contextOrFirstOrder === "boolean"
    ? { isFirstOrder: contextOrFirstOrder }
    : contextOrFirstOrder
  const isFirstOrder = context.isFirstOrder ?? true
  const isBirthdayMonth = context.isBirthdayMonth ?? false

  if (!coupon || !coupon.isActive) return { discountHKD: 0, discountUSD: 0, valid: false, reason: "Invalid" }
  const now = new Date()
  if (new Date(coupon.validFrom) > now || new Date(coupon.validTo) < now) return { discountHKD: 0, discountUSD: 0, valid: false, reason: "Expired" }
  if (coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) return { discountHKD: 0, discountUSD: 0, valid: false, reason: "Usage limit reached" }
  if (coupon.onlyFirstOrder && !isFirstOrder) return { discountHKD: 0, discountUSD: 0, valid: false, reason: "First order only" }
  if (coupon.code.toUpperCase().includes("BIRTHDAY") && !isBirthdayMonth) return { discountHKD: 0, discountUSD: 0, valid: false, reason: "Birthday month only" }

  const minHKD = coupon.minAmountHKD ?? 0
  const minUSD = coupon.minAmountUSD ?? 0
  if (currency === "HKD" && subtotalHKD < minHKD) return { discountHKD: 0, discountUSD: 0, valid: false, reason: `Min HK$${minHKD}` }
  if (currency === "USD" && subtotalUSD < minUSD) return { discountHKD: 0, discountUSD: 0, valid: false, reason: `Min $${minUSD}` }

  let discountHKD = 0, discountUSD = 0
  if (coupon.type === "percent") {
    discountHKD = subtotalHKD * coupon.value / 100
    discountUSD = subtotalUSD * coupon.value / 100
  } else {
    // Keep both currencies populated for order records and admin reporting.
    discountHKD = coupon.currency === "USD" ? coupon.value / 0.128 : coupon.value
    discountUSD = coupon.currency === "USD" ? coupon.value : coupon.value * 0.128
  }

  discountHKD = Math.min(subtotalHKD, Math.max(0, Number(discountHKD.toFixed(2))))
  discountUSD = Math.min(subtotalUSD, Math.max(0, Number(discountUSD.toFixed(2))))
  return { discountHKD, discountUSD, valid: true, reason: "OK" }
}

export function calcShipping(subtotalHKD: number, subtotalUSD: number, currency: Currency) {
  const threshHKD = FREE_SHIPPING_THRESHOLD_HKD
  const threshUSD = FREE_SHIPPING_THRESHOLD_USD
  const sub = currency === "HKD" ? subtotalHKD : subtotalUSD
  const thresh = currency === "HKD" ? threshHKD : threshUSD
  if (sub >= thresh) return { shippingHKD: 0, shippingUSD: 0, free: true }
  // flat 80 HKD or 15 USD
  return { shippingHKD: currency === "HKD" ? 80 : 0, shippingUSD: currency === "USD" ? 15 : 0, free: false }
}

export function checkBirthdayMonth(birthday?: string) {
  if (!birthday) return false
  const b = new Date(birthday)
  if (Number.isNaN(b.getTime())) return false
  const now = new Date()
  return b.getMonth() === now.getMonth()
}
