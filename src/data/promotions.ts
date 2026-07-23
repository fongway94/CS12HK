import { Coupon, GiftTier } from "../lib/db/types"

export const coupons: Coupon[] = [
  {
    code: "NEWCS12",
    type: "percent",
    value: 15,
    minAmountHKD: 1500,
    minAmountUSD: 192,
    validFrom: "2024-01-01",
    validTo: "2026-12-31",
    onlyFirstOrder: true,
    description_zh: "首次購物滿$1500享15% OFF",
    description_en: "15% OFF first order over $1500",
    isActive: true,
    usedCount: 0
  },
  {
    code: "BIRTHDAY10",
    type: "percent",
    value: 10,
    validFrom: "2024-01-01",
    validTo: "2026-12-31",
    description_zh: "生日月份10% OFF",
    description_en: "Birthday month 10% OFF",
    isActive: true,
    usedCount: 0
  },
  {
    code: "FREESHIP",
    type: "fixed",
    value: 0,
    description_zh: "免運費券",
    description_en: "Free shipping voucher",
    isActive: false,
    usedCount: 0,
    validFrom: "2024-01-01",
    validTo: "2026-12-31"
  }
]

export const giftTiers: GiftTier[] = [
  {
    id: "gift_tier_2000",
    thresholdHKD: 2000,
    thresholdUSD: 255,
    label_zh: "購滿 HK$2,000",
    label_en: "Spend over HK$2,000",
    giftValueHKD: 975,
    gifts: [
      { name_zh: "奇蹟抗敏面膜", name_en: "Miracle Mask", qty: 3 },
      { name_zh: "奇蹟抗敏安瓶 5ml", name_en: "Calming Ampoule 5ml", qty: 1 },
      { name_zh: "#SOCALM 1 awaken 肌底精華水 5ml", name_en: "#SOCALM 1 Awaken 5ml", qty: 1 },
      { name_zh: "水漾防曬 96號色 6ml", name_en: "Sun Protect 96 6ml", qty: 1 }
    ]
  },
  {
    id: "gift_tier_3000",
    thresholdHKD: 3000,
    thresholdUSD: 383,
    label_zh: "購滿 HK$3,000",
    label_en: "Spend over HK$3,000",
    giftValueHKD: 1741,
    gifts: [
      { name_zh: "奇蹟抗敏面膜", name_en: "Miracle Mask", qty: 6 },
      { name_zh: "奇蹟抗敏安瓶 5ml", name_en: "Calming Ampoule 5ml", qty: 2 },
      { name_zh: "#SOCALM 1 awaken 肌底精華水 5ml", name_en: "#SOCALM 1 Awaken 5ml", qty: 1 },
      { name_zh: "水漾防曬 96號色 6ml", name_en: "Sun Protect 96 6ml", qty: 1 }
    ]
  }
]

export const FREE_SHIPPING_THRESHOLD_HKD = 800
export const FREE_SHIPPING_THRESHOLD_USD = 100
