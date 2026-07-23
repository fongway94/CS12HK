type Lang = "zh" | "en"

const labelTranslations: Record<string, string> = {
  // Product categories
  "面膜": "Masks",
  "安瓶": "Ampoules",
  "微精華": "Micro Essence",
  "精華": "Essence",
  "面霜": "Creams",
  "防曬": "Sun Care",
  "緊緻拉提": "Firming & Lifting",
  "煥亮美白": "Brightening & Whitening",
  "卸妝潔面": "Cleansing",
  "去角質": "Exfoliating",

  // Skin types
  "敏感肌": "Sensitive Skin",
  "泛紅/玫瑰痤瘡": "Redness / Rosacea",
  "泛紅 / 玫瑰痤瘡": "Redness / Rosacea",
  "乾性肌": "Dry Skin",
  "油性/痘痘/暗瘡": "Oily / Acne Prone",
  "油性 / 痘痘 / 暗瘡": "Oily / Acne Prone",
  "成熟肌": "Mature Skin",
  "暗沉/不均勻膚色": "Dullness / Uneven Tone",
  "暗沉 / 不均勻膚色": "Dullness / Uneven Tone",

  // Tags / collections
  "暢銷產品": "Bestsellers",
  "奇蹟面膜": "Miracle Mask",
  "旅遊必備": "Travel Essentials",
  "官網限定": "Online Exclusive",
  "體驗裝": "Trial Kit",
}

export function displayProductLabel(label: string, lang: Lang) {
  if (lang === "zh") return label
  return labelTranslations[label] || label
}

export function displayProductLabels(labels: string[], lang: Lang, separator = ", ") {
  return labels.map(label => displayProductLabel(label, lang)).join(separator)
}

export function displayBundleGiftLabel(label: string | undefined, lang: Lang) {
  if (!label) return ""
  if (lang === "zh") return label

  const match = label.match(/買\s*(\d+)\s*送\s*(\d+)/)
  if (match) return `Buy ${match[1]} Get ${match[2]}`

  return labelTranslations[label] || label
}
