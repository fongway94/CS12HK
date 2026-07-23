import { create } from "zustand"
import { SiteSettings, DEFAULT_SITE_SETTINGS } from "../lib/db/types"
import { getDBClient } from "../lib/db/client"

interface ThemeState {
  settings: SiteSettings
  isLoaded: boolean
  loadSettings: () => Promise<void>
  applyTheme: () => void
}

function applyCSS(settings: SiteSettings) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.style.setProperty("--bg", settings.backgroundColor)
  root.style.setProperty("--paper", settings.cardColor)
  root.style.setProperty("--ink", settings.textColor)
  root.style.setProperty("--muted", settings.mutedTextColor)
  root.style.setProperty("--line", settings.borderColor)
  root.style.setProperty("--primary", settings.primaryColor)
  root.style.setProperty("--secondary", settings.secondaryColor)
  root.style.setProperty("--accent", settings.accentColor)
  root.style.setProperty("--font-base", `${settings.fontSizeBase}px`)
  // Most UI type uses fixed Tailwind px utilities. Combine the base-size setting
  // (16px is the design baseline) and the multiplier so both Admin controls
  // visibly scale that type rather than only the few inherited text elements.
  const typographyScale = (settings.fontSizeBase / 16) * settings.fontSizeScale
  root.style.setProperty("--font-scale", String(typographyScale))

  // Language-specific font pairs (body/sans + heading/serif) for English and Traditional Chinese.
  // These feed the body[data-lang="zh"|"en"] rules in index.css, which pick the active pair
  // and expose it as --font-sans / --font-serif for the rest of the site to consume.
  const enBody = settings.fontFamilyEnBody || settings.fontFamily
  const enHeading = settings.fontFamilyEnHeading || settings.fontFamilySerif
  const zhBody = settings.fontFamilyZhBody || settings.fontFamily
  const zhHeading = settings.fontFamilyZhHeading || settings.fontFamilySerif

  root.style.setProperty("--font-en-sans", `"${enBody}", "Instrument Sans", "Helvetica Neue", Arial, sans-serif`)
  root.style.setProperty("--font-en-serif", `"${enHeading}", "Cormorant Garamond", Georgia, "Times New Roman", serif`)
  root.style.setProperty("--font-zh-sans", `"${zhBody}", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Instrument Sans", "Helvetica Neue", Arial, sans-serif`)
  root.style.setProperty("--font-zh-serif", `"${zhHeading}", "Noto Serif TC", "PingFang TC", "Microsoft JhengHei", "Cormorant Garamond", Georgia, serif`)

  document.body.style.fontSize = `${settings.fontSizeBase}px`
  document.body.style.background = settings.backgroundColor
  document.body.style.color = settings.textColor
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  settings: DEFAULT_SITE_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const db = getDBClient()
      const s = await db.getSiteSettings()
      set({ settings: s, isLoaded: true })
      applyCSS(s)
    } catch {
      set({ isLoaded: true })
      applyCSS(DEFAULT_SITE_SETTINGS)
    }
  },

  applyTheme: () => {
    applyCSS(get().settings)
  }
}))
