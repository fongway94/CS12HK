// Points system: 1 HKD = 1 point earned, 100 points = HKD 1 redeem? configurable
export const POINTS_PER_HKD = 1
export const POINTS_REDEEM_RATE = 100 // 100 points = 1 HKD

export function calcPointsEarned(subtotalHKD: number) {
  return Math.floor(subtotalHKD * POINTS_PER_HKD)
}

export function calcPointsDiscount(pointsToUse: number) {
  const hkd = pointsToUse / POINTS_REDEEM_RATE
  return { hkd, usd: hkd * 0.128 } // approx conversion
}

export function getTier(totalSpentHKD: number): "Member" | "VIP" | "Prestige" {
  if (totalSpentHKD >= 10000) return "Prestige"
  if (totalSpentHKD >= 5000) return "VIP"
  return "Member"
}
