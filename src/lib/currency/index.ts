import { Currency } from "../db/types"

export const EXCHANGE_RATE_HKD_TO_USD = 0.128 // approximate

export function formatPrice(hkd: number, usd: number, currency: Currency) {
  if (currency === "HKD") return `HK$${hkd.toLocaleString()}`
  return `US$${usd.toFixed(2)}`
}

export function convertHKDToUSD(hkd: number) {
  return hkd * EXCHANGE_RATE_HKD_TO_USD
}
